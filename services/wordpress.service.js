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
 * GET /wp-json/wp/v2/types
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
    throw new Error("WP Types failed");
  }

  const data = await response.json();

  // WP intoarce un obiect { post: {...}, page: {...}, ... }
  const types = Object.values(data || {})
    .filter((t) => t && t.show_in_rest)
    .map((t) => ({
      name: t.name, // ex: "Posts"
      slug: t.slug, // ex: "post"
      rest_base: t.rest_base || t.slug, // ex: "posts" / "my-cpt"
    }))
    .sort((a, b) => (a.rest_base || "").localeCompare(b.rest_base || ""));

  return types;
}

/**
 * ✅ Fetch posts for a selected type (posts or CPT rest_base)
 */
async function fetchPosts(siteUrl, username, appPassword, type = "posts", page = 1, perPage = 50) {
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
