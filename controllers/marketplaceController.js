const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { prisma } = require("../prisma");
const { encrypt, decrypt } = require("../config/crypto");

function normalizeUrl(url) {
  return (url || "").trim().replace(/\/$/, "");
}

function isOwner(marketplace, userId) {
  return marketplace && marketplace.createdById === userId;
}

async function getNewMarketplace(req, res) {
  res.render("marketplace-new", { error: null });
}

async function postMarketplace(req, res) {
  try {
    const { name, baseUrl, wpUsername, wpAppPassword } = req.body;

    if (!name || !baseUrl || !wpUsername || !wpAppPassword) {
      return res.render("marketplace-new", { error: "Completează toate câmpurile." });
    }

    const cleanUrl = normalizeUrl(baseUrl);

    // Test connection BEFORE saving
    const basicAuth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64");
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    if (!response.ok) {
      return res.render("marketplace-new", {
        error: "Conexiune WordPress eșuată. Verifică URL / user / application password.",
      });
    }

    const encryptedPassword = encrypt(wpAppPassword);

    await prisma.marketplace.create({
      data: {
        name: name.trim(),
        baseUrl: cleanUrl,
        wpUsername: wpUsername.trim(),
        wpAppPasswordEnc: encryptedPassword,
        createdById: req.session.user.id,
        connectionStatus: "connected",
        lastCheckedAt: new Date(),
      },
    });

    return res.redirect("/dashboard");
  } catch (err) {
    console.error("[Marketplace] create error:", err);
    return res.render("marketplace-new", { error: "Eroare server la salvare." });
  }
}

async function getMarketplace(req, res) {
  const userId = req.session.user.id;
  const id = req.params.id;

  const marketplace = await prisma.marketplace.findUnique({ where: { id } });

  if (!isOwner(marketplace, userId)) return res.status(404).send("Not found");

  const msg = req.query.msg || null;
  const type = req.query.type || "info";

  res.render("marketplace-view", { marketplace, msg, type });
}

async function postMarketplaceTest(req, res) {
  const userId = req.session.user.id;
  const id = req.params.id;

  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!isOwner(marketplace, userId)) return res.status(404).send("Not found");

  try {
    const url = normalizeUrl(marketplace.baseUrl);
    const wpUsername = marketplace.wpUsername;
    const wpPassEnc = marketplace.wpAppPasswordEnc;

    if (!url || !wpUsername || !wpPassEnc) {
      await prisma.marketplace.update({
        where: { id },
        data: { connectionStatus: "failed", lastCheckedAt: new Date() },
      });
      return res.redirect(`/marketplace/${id}?type=error&msg=${encodeURIComponent("Date WP lipsă. Completează setările.")}`);
    }

    const wpPassword = decrypt(wpPassEnc);
    const basicAuth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");

    const response = await fetch(`${url}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    const ok = response.ok;

    await prisma.marketplace.update({
      where: { id },
      data: {
        connectionStatus: ok ? "connected" : "failed",
        lastCheckedAt: new Date(),
      },
    });

    if (ok) {
      return res.redirect(`/marketplace/${id}?type=success&msg=${encodeURIComponent("Conexiune OK ✅")}`);
    } else {
      return res.redirect(`/marketplace/${id}?type=error&msg=${encodeURIComponent("Conexiune eșuată ❌ (verifică user/parolă/app password)")}`);
    }
  } catch (err) {
    console.error("[Marketplace] test error:", err);
    await prisma.marketplace.update({
      where: { id },
      data: { connectionStatus: "failed", lastCheckedAt: new Date() },
    });
    return res.redirect(`/marketplace/${id}?type=error&msg=${encodeURIComponent("Eroare server la test connection.")}`);
  }
}

async function getMarketplaceEdit(req, res) {
  const userId = req.session.user.id;
  const id = req.params.id;

  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!isOwner(marketplace, userId)) return res.status(404).send("Not found");

  res.render("marketplace-edit", { marketplace, error: null });
}

async function postMarketplaceEdit(req, res) {
  const userId = req.session.user.id;
  const id = req.params.id;

  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!isOwner(marketplace, userId)) return res.status(404).send("Not found");

  try {
    const { name, baseUrl, wpUsername, wpAppPassword } = req.body;

    if (!name || !baseUrl || !wpUsername) {
      return res.render("marketplace-edit", {
        marketplace,
        error: "Completează Name, Base URL și WP Username.",
      });
    }

    const data = {
      name: name.trim(),
      baseUrl: normalizeUrl(baseUrl),
      wpUsername: wpUsername.trim(),
    };

    // Dacă userul a completat parola, o actualizăm (criptată)
    if (wpAppPassword && wpAppPassword.trim().length > 0) {
      data.wpAppPasswordEnc = encrypt(wpAppPassword.trim());
      data.connectionStatus = "unknown";
      data.lastCheckedAt = null;
    }

    await prisma.marketplace.update({ where: { id }, data });

    return res.redirect(`/marketplace/${id}?type=success&msg=${encodeURIComponent("Salvat ✅")}`);
  } catch (err) {
    console.error("[Marketplace] edit error:", err);
    return res.render("marketplace-edit", {
      marketplace,
      error: "Eroare server la editare.",
    });
  }
}

async function postMarketplaceDelete(req, res) {
  const userId = req.session.user.id;
  const id = req.params.id;

  const marketplace = await prisma.marketplace.findUnique({ where: { id } });
  if (!isOwner(marketplace, userId)) return res.status(404).send("Not found");

  await prisma.marketplace.delete({ where: { id } });
  return res.redirect("/dashboard");
}

module.exports = {
  getNewMarketplace,
  postMarketplace,
  getMarketplace,
  postMarketplaceTest,
  getMarketplaceEdit,
  postMarketplaceEdit,
  postMarketplaceDelete,
};
