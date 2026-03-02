const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../config/auth");
const { getDashboard } = require("../controllers/mainController");
const { getLogin, postLogin, postLogout } = require("../controllers/authController");

// Auth
router.get("/login", redirectIfAuth, getLogin);
router.post("/login", redirectIfAuth, postLogin);
router.post("/logout", requireAuth, postLogout);

// Home -> redirect
router.get("/", (req, res) => {
  if (req.session?.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Dashboard protected
router.get("/dashboard", requireAuth, getDashboard);


const bcrypt = require("bcrypt");
const { prisma } = require("../prisma");

router.get("/init-admin", async (req, res) => {
  try {
    const email = "admin@crm.ro";
    const password = "Admin123!";

    const hash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: {
        email,
        passwordHash: hash,
        role: "ADMIN",
        name: "Admin",
      },
    });

    return res.send("Admin creat sau actualizat cu succes!");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Eroare la creare admin.");
  }
});



module.exports = router;
