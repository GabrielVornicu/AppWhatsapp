const express = require("express");
const router = express.Router();
const mainController = require("../controllers/mainController");

router.get("/", mainController.home);
router.get("/dashboard", mainController.dashboard);
router.get("/contact", mainController.contactPage);
router.post("/contact", mainController.contactSubmit);

module.exports = router;
