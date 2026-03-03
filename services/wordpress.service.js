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
 * ✅ Fetch REAL WordPress Post Types (CPT-uri curate)
 * Folosește doar /wp/v2/types
 * Filtrează:
 *  - public === true
 *  - show_in_rest === true
 *  - exclude attachment
 */
async function fetchPostTypes(siteUrl, username, appPassword) {
  const cleanUrl = normalizeUrl(siteUrl);

  const response = await fetch(`${cleanUrl}/wp-json/wp/v2/types`, {
    headers: {
      Authorization: makeAuthHeader(username, appPassword),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("WP TYPES ERROR:", response.status, text);
    return [];
  }

  const data = await response.json();

  // Tipuri interne WordPress pe care NU le vrem
  const exclude = new Set([
    "attachment",
    "nav_menu_item",
    "wp_block",
    "wp_template",
    "wp_template_part",
    "wp_global_styles",
    "wp_navigation",
    "wp_font_family",
    "wp_font_face",
    "elementor_library",
    "elementor_snippet",
    "jet-form-builder",
    "jet-theme-core",
    "jet-page-template",
    "jet-engine",
    "e-floating-buttons"
  ]);

  const types = Object.entries(data || {})
    .filter(([key, t]) => {
      if (!t) return false;

      // exclude sistem
      if (exclude.has(key)) return false;

      // trebuie sa aiba rest_base valid
      if (!t.rest_base) return false;

      // trebuie sa aiba endpoint de items
      if (!t._links || !t._links["wp:items"]) return false;

      return true;
    })
    .map(([key, t]) => ({
      key,
      name: t.name || key,
      rest_base: t.rest_base,
    }))
    .sort((a, b) => a.rest_base.localeCompare(b.rest_base));

  return types;
}
/**
 * ✅ Fetch posts for selected post type
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

/**
 * ✅ Test connection
 */
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
