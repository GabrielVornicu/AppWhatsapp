const express = require("express");
const router = express.Router();
const { fetchPosts } = require("../services/wordpress.service");

router.get("/wordpress/:id/posts", async (req, res) => {
  try {
    const marketplaceId = req.params.id;

    // TODO: luam datele din DB prin prisma
    const marketplace = await req.prisma.marketplace.findUnique({
      where: { id: marketplaceId },
    });

    if (!marketplace) {
      return res.status(404).json({ error: "Marketplace not found" });
    }

    const posts = await fetchPosts(
      marketplace.siteUrl,
      marketplace.wpUsername,
      marketplace.wpAppPassword
    );

    res.json(posts);

  } catch (error) {
    console.error("Route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
