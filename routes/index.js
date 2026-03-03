const express = require("express");
const router = express.Router();

const { requireAuth, redirectIfAuth } = require("../config/auth");
const { getDashboard } = require("../controllers/mainController");
const { getLogin, postLogin, postLogout } = require("../controllers/authController");

const {
  getNewMarketplace,
  postMarketplace,
  getMarketplace,
  postMarketplaceTest,
  getMarketplaceEdit,
  postMarketplaceEdit,
  postMarketplaceDelete,
} = require("../controllers/marketplaceController");

// Auth
router.get("/login", redirectIfAuth, getLogin);
router.post("/login", redirectIfAuth, postLogin);
router.post("/logout", requireAuth, postLogout);

// Home
router.get("/", (req, res) => {
  if (req.session?.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Dashboard
router.get("/dashboard", requireAuth, getDashboard);

// Marketplace
router.get("/marketplace/new", requireAuth, getNewMarketplace);
router.post("/marketplace", requireAuth, postMarketplace);

router.get("/marketplace/:id", requireAuth, getMarketplace);
router.post("/marketplace/:id/test", requireAuth, postMarketplaceTest);

router.get("/marketplace/:id/edit", requireAuth, getMarketplaceEdit);
router.post("/marketplace/:id/edit", requireAuth, postMarketplaceEdit);

router.post("/marketplace/:id/delete", requireAuth, postMarketplaceDelete);

module.exports = router;
