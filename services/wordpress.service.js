const axios = require("axios");

async function fetchPosts(siteUrl, username, appPassword) {
  try {
    const response = await axios.get(
      `${siteUrl}/wp-json/wp/v2/posts`,
      {
        auth: {
          username,
          password: appPassword,
        },
      }
    );

    console.log("✅ Posts fetched:", response.data.length);
    return response.data;
  } catch (error) {
    console.error("❌ WordPress fetch error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { fetchPosts };
