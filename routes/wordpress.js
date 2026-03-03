const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const { fetchPosts, fetchPostTypes, testConnection } = require("../services/wordpress.service");

// Helpers (keep local, no extra files)
function normalizeUrl(url = "") {
  return String(url).replace(/\/+$/, "");
}

function toBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "da";
  }
  return false;
}

function pickPhoneFromMeta(meta) {
  if (!meta) return null;

  // Standardul tau
  if (meta.crm_phone) return String(meta.crm_phone).trim();

  // Fallback-uri (daca ai proiecte vechi)
  if (meta.phone) return String(meta.phone).trim();
  if (meta.telefon) return String(meta.telefon).trim();
  if (meta.phone_call) return String(meta.phone_call).trim();

  return null;
}

// 🔹 GET POSTS (UI) + select CPT
router.get("/wordpress/:id/posts", async (req, res) => {
  try {
    const marketplaceId = req.params.id;

    if (!marketplaceId) {
      return res.status(400).send("Marketplace ID missing");
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
    });

    if (!marketplace) {
      return res.status(404).send("Marketplace not found");
    }

    const selectedType = String(req.query.type || "posts").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || "50", 10)));

    // 1) CPT list
    const postTypes = await fetchPostTypes(
      marketplace.baseUrl,
      marketplace.wpUsername,
      marketplace.wpAppPassword
    );

    // Validare: daca cineva baga manual un type invalid
    const isValid = postTypes.some((t) => t.rest_base === selectedType);
    const finalType = isValid ? selectedType : "posts";

    // 2) Posts for selected type
    const result = await fetchPosts(
      marketplace.baseUrl,
      marketplace.wpUsername,
      marketplace.wpAppPassword,
      finalType,
      page,
      perPage
    );

    res.render("wordpress-posts", {
      posts: result.items,
      marketplace,
      postTypes,
      selectedType: finalType,
      page,
      perPage,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Route error:", error);
    res.status(500).send("Internal server error");
  }
});

// 🔹 TEST CONNECTION
router.get("/wordpress/:id/test", async (req, res) => {
  try {
    const marketplaceId = req.params.id;

    if (!marketplaceId) {
      return res.status(400).send("Marketplace ID missing");
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
    });

    if (!marketplace) {
      return res.status(404).send("Marketplace not found");
    }

    const ok = await testConnection(
      marketplace.baseUrl,
      marketplace.wpUsername,
      marketplace.wpAppPassword
    );

    res.send(ok ? "Connection OK" : "Connection Failed");
  } catch (error) {
    console.error("Test route error:", error);
    res.status(500).send("Internal server error");
  }
});

/**
 * ✅ PASUL 8: Manual Sync WP -> Leads
 * GET /wordpress/:id/sync
 *
 * - Citeste post-urile din CPT-ul setat pe marketplace.leadCpt
 * - Extrage meta standard:
 *    crm_phone (mandatory)
 *    crm_is_client
 *    crm_do_not_contact
 *    crm_hide_from_listing
 * - Creeaza / update in tabela Lead
 * - Marcheaza marketplace.lastSyncAt
 *
 * IMPORTANT: WP REST API trebuie sa returneze meta in raspuns.
 * (meta keys trebuie sa fie show_in_rest=true in WP)
 */
router.get("/wordpress/:id/sync", async (req, res) => {
  try {
    const marketplaceId = req.params.id;

    if (!marketplaceId) {
      return res.status(400).json({ ok: false, error: "Marketplace ID missing" });
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
    });

    if (!marketplace) {
      return res.status(404).json({ ok: false, error: "Marketplace not found" });
    }

    if (!marketplace.leadCpt) {
      return res.status(400).json({
        ok: false,
        error: "leadCpt is not configured for this marketplace",
      });
    }

    // Fetch CPT items (max 100 in acest pas - safe MVP)
    const baseUrl = normalizeUrl(marketplace.baseUrl);
    const cpt = String(marketplace.leadCpt).trim();

    // Notă: endpoint-ul wp/v2 suportă CPT-uri custom dacă sunt publice + show_in_rest
    const endpoint = `${baseUrl}/wp-json/wp/v2/${encodeURIComponent(
      cpt
    )}?per_page=100&page=1`;

    const authHeader =
      "Basic " +
      Buffer.from(`${marketplace.wpUsername}:${marketplace.wpAppPassword}`).toString(
        "base64"
      );

    const wpRes = await fetch(endpoint, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!wpRes.ok) {
      const text = await wpRes.text();
      console.error("SYNC WP ERROR:", wpRes.status, text);
      return res.status(400).json({
        ok: false,
        error: "WP sync failed",
        status: wpRes.status,
        details: text?.slice?.(0, 500) || String(text),
      });
    }

    const items = await wpRes.json();

    let created = 0;
    let updated = 0;
    let skippedNoPhone = 0;

    // Iterate items and upsert-ish (findFirst + update/create)
    for (const item of items) {
      const wpPostId = item?.id;
      if (!wpPostId) continue;

      const meta = item?.meta || null;

      const phone = pickPhoneFromMeta(meta);
      if (!phone) {
        skippedNoPhone++;
        continue;
      }

      const isClient = toBool(meta?.crm_is_client);
      const doNotContact = toBool(meta?.crm_do_not_contact);
      const hideFromListing = toBool(meta?.crm_hide_from_listing);

      const existing = await prisma.lead.findFirst({
        where: {
          marketplaceId: marketplace.id,
          wpPostId: BigInt(wpPostId),
        },
      });

      if (existing) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            phone,
            isClient,
            doNotContact,
            hideFromListing,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.lead.create({
          data: {
            marketplaceId: marketplace.id,
            wpPostId: BigInt(wpPostId),
            phone,
            isClient,
            doNotContact,
            hideFromListing,
            // restul raman default (NEW, inSequence=false, etc.)
          },
        });
        created++;
      }
    }

    // Update marketplace lastSyncAt
    await prisma.marketplace.update({
      where: { id: marketplace.id },
      data: { lastSyncAt: new Date() },
    });

    return res.json({
      ok: true,
      marketplaceId: marketplace.id,
      leadCpt: marketplace.leadCpt,
      totalFetched: Array.isArray(items) ? items.length : 0,
      created,
      updated,
      skippedNoPhone,
      note:
        "Daca meta nu apare in raspunsul WP, trebuie activate meta keys cu show_in_rest in WordPress.",
    });
  } catch (error) {
    console.error("SYNC ROUTE ERROR:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

module.exports = router;
