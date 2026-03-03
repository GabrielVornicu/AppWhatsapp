const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { requireAuth } = require("../config/auth");
const { ensureClient, getQrDataUrl } = require("../services/whatsapp.manager");

router.get("/marketplace/:id/whatsapp", requireAuth, async (req, res) => {
  const mp = await prisma.marketplace.findUnique({ where: { id: req.params.id } });
  if (!mp) return res.status(404).send("Marketplace not found");

  // init session (ca să emită QR dacă nu e logat)
  await ensureClient(mp.id);
  const qr = await getQrDataUrl(mp.id);

  const mpFresh = await prisma.marketplace.findUnique({ where: { id: mp.id } });

  res.render("whatsapp-qr", {
    marketplace: mpFresh,
    qrDataUrl: qr,
  });
});

module.exports = router;
