// services/wordpress.service.js

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

async function fetchPosts(siteUrl, username, appPassword) {
  const cleanUrl = normalizeUrl(siteUrl);

  const response = await fetch(
    `${cleanUrl}/wp-json/wp/v2/posts`,
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${username}:${appPassword}`).toString("base64"),
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("WP POSTS ERROR:", text);
    throw new Error("WP Posts failed");
  }

  return await response.json();
}

async function testConnection(siteUrl, username, appPassword) {
  const cleanUrl = normalizeUrl(siteUrl);

  const response = await fetch(
    `${cleanUrl}/wp-json/wp/v2/posts?per_page=1`,
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${username}:${appPassword}`).toString("base64"),
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("WP TEST ERROR:", text);
    return false;
  }

  return true;
}

module.exports = {
  fetchPosts,
  testConnection,
};
