const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const { fetchPosts, testConnection } = require("../services/wordpress.service");

// 🔹 GET POSTS
router.get("/wordpress/:id/posts", async (req, res) => {
  try {
    const marketplaceId = req.params.id; // 🔥 NU mai folosim Number()

    if (!marketplaceId) {
      return res.status(400).send("Marketplace ID missing");
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
    });

    if (!marketplace) {
      return res.status(404).send("Marketplace not found");
    }

    const posts = await fetchPosts(
      marketplace.baseUrl,
      marketplace.wpUsername,
      marketplace.wpAppPassword
    );

    res.render("wordpress-posts", {
  posts,
  marketplace
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

module.exports = router;
