const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const Lead = require("../models/Lead");

const router = express.Router();

const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." }
});

const validateLead = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name is required."),
  body("phone")
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be exactly 10 digits."),
  body("preference")
    .trim()
    .toLowerCase()
    .isIn(["buy", "sell"])
    .withMessage("Preference must be buy or sell.")
];

router.post("/lead", leadLimiter, validateLead, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed.",
        details: errors.array().map((entry) => entry.msg)
      });
    }

    const { name, phone, preference } = req.body;

    const lead = await Lead.create({ name, phone, preference });

    return res.status(201).json({
      message: "Lead created successfully.",
      leadId: lead._id,
      whatsappNumber: process.env.WHATSAPP_NUMBER || null
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
