const express = require("express");
const { protect, allowRoles } = require("../middleware/authmiddleware");
const {
  getMyPaymentPreference,
  saveMyPaymentPreference,
} = require("../controllers/paymentPreferenceController");

const router = express.Router();
router.use(protect, allowRoles("freelancer"));
router.get("/mine", getMyPaymentPreference);
router.put("/mine", saveMyPaymentPreference);

module.exports = router;
