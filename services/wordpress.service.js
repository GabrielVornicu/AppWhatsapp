// services/wordpress.service.js

function normalizeUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function makeAuthHeader(username, appPassword) {
  return (
    "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64")
  );
}

/**
 * ✅ Fetch post types (include CPT-uri) expuse in REST
 * Robust version:
 *  1) încearcă /wp/v2/types
 *  2) fallback pe /wp-json (routes index)
 */
async function fetchPostTypes(siteUrl, username, appPassword) {
  const cleanUrl = normalizeUrl(siteUrl);
  const authHeader = makeAuthHeader(username, appPassword);

  // ==============================
  // 1️⃣ Încercăm /wp/v2/types
  // ==============================
  try {
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/types`, {
      headers: { Authorization: authHeader },
    });

    if (response.ok) {
      const data = await response.json();

      // IMPORTANT: folosim entries ca să păstrăm cheia reală (ex: "camin")
      const types = Object.entries(data || {})
        .filter(([, t]) => t && t.show_in_rest)
        .map(([key, t]) => ({
          key,
          name: t.name || key,
          rest_base: t.rest_base || key,
        }))
        .sort((a, b) => a.rest_base.localeCompare(b.rest_base));

      if (types.length) {
        return types;
      }
    } else {
      const text = await response.text();
      console.error("WP TYPES ERROR:", response.status, text);
    }
  } catch (err) {
    console.error("WP TYPES FETCH FAIL:", err);
  }

  // ==============================
  // 2️⃣ Fallback: parse REST index
  // ==============================
  try {
    const indexRes = await fetch(`${cleanUrl}/wp-json`, {
      headers: { Authorization: authHeader },
    });

    if (!indexRes.ok) {
      const text = await indexRes.text();
      console.error("WP INDEX ERROR:", indexRes.status, text);
      return [];
    }

    const indexData = await indexRes.json();
    const routes = indexData?.routes || {};

    const excluded = new Set([
      "posts",
      "pages",
      "media",
      "types",
      "statuses",
      "taxonomies",
      "tags",
      "categories",
      "users",
      "comments",
      "settings",
      "themes",
      "plugins",
      "blocks",
      "block-renderer",
      "search",
    ]);

    const found = new Map();

    for (const route of Object.keys(routes)) {
      // vrem exact ruta de listare, ex: /wp/v2/camin
      const match = route.match(/^\/wp\/v2\/([^\/\(\?]+)$/);
      if (!match) continue;

      const restBase = match[1];
      if (!restBase || excluded.has(restBase)) continue;

      const methods = routes[route]?.methods || [];
      if (!methods.includes("GET")) continue;

      found.set(restBase, {
        key: restBase,
        name: restBase,
        rest_base: restBase,
      });
    }

    return Array.from(found.values()).sort((a, b) =>
      a.rest_base.localeCompare(b.rest_base)
    );
  } catch (err) {
    console.error("WP INDEX FALLBACK ERROR:", err);
    return [];
  }
}

/**
 * ✅ Fetch posts for a selected type (posts or CPT rest_base)
 */
async function fetchPosts(
  siteUrl,
  username,
  appPassword,
  type = "posts",
  page = 1,
  perPage = 50
) {
  const cleanUrl = normalizeUrl(siteUrl);
  const safeType = String(type || "posts").trim();

  const url =
    `${cleanUrl}/wp-json/wp/v2/${encodeURIComponent(safeType)}` +
    `?per_page=${encodeURIComponent(perPage)}` +
    `&page=${encodeURIComponent(page)}` +
    `&_fields=id,title,slug,date,status,link`;

  const response = await fetch(url, {
    headers: {
      Authorization: makeAuthHeader(username, appPassword),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("WP POSTS ERROR:", response.status, text);
    throw new Error("WP Posts failed");
  }

  const items = await response.json();

  const total = Number(response.headers.get("x-wp-total") || 0);
  const totalPages = Number(response.headers.get("x-wp-totalpages") || 0);

  return { items, total, totalPages };
}

async function testConnection(siteUrl, username, appPassword) {
  const cleanUrl = normalizeUrl(siteUrl);

  const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?per_page=1`, {
    headers: {
      Authorization: makeAuthHeader(username, appPassword),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("WP TEST ERROR:", text);
    return false;
  }

  return true;
}

module.exports = {
  fetchPostTypes,
  fetchPosts,
  testConnection,
};
