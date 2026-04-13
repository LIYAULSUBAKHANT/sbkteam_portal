const express = require("express");
const {
  getPublicKey,
  subscribe,
  unsubscribe,
} = require("../controllers/pushSubscriptionsController");

const router = express.Router();

router.get("/public-key", getPublicKey);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
