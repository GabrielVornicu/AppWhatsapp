const express = require("express");
const router = express.Router();
const { prisma } = require("../config/prisma");

router.get("/", async (req, res) => {
  try {
    const marketplaces = await prisma.marketplace.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.render("dashboard", { marketplaces });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
