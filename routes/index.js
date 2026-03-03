const express = require("express");
const router = express.Router();

const {
  getNewMarketplace,
  postMarketplace,
} = require("../controllers/marketplaceController");

const { requireAuth, redirectIfAuth } = require("../config/auth");
const { getDashboard } = require("../controllers/mainController");
const { getLogin, postLogin, postLogout } = require("../controllers/authController");

// Auth
router.get("/login", redirectIfAuth, getLogin);
router.post("/login", redirectIfAuth, postLogin);
router.post("/logout", requireAuth, postLogout);

// Home redirect
router.get("/", (req, res) => {
  if (req.session?.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Protected routes
router.get("/dashboard", requireAuth, getDashboard);
router.get("/marketplace/new", requireAuth, getNewMarketplace);
router.post("/marketplace", requireAuth, postMarketplace);

module.exports = router;
