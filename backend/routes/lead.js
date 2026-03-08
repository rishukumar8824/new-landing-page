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
  message: { error: "Too many submissions from this IP. Please try again later." }
});

const validateLeadInput = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name is required and must be 2-80 characters long."),
  body("phone")
    .trim()
    .matches(/^\d{10}$/)
    .withMessage("Phone must be exactly 10 digits."),
  body("preference")
    .trim()
    .toLowerCase()
    .isIn(["buy", "sell"])
    .withMessage("Preference must be either buy or sell."),
  body("website").optional({ values: "falsy" }).isEmpty().withMessage("Invalid form submission."),
  body("formStartedAt")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Invalid submission timestamp.")
];

router.post("/lead", leadLimiter, validateLeadInput, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed.",
        details: errors.array().map((item) => item.msg)
      });
    }

    const { name, phone, preference, website, formStartedAt } = req.body;

    if (website) {
      return res.status(400).json({ error: "Spam detected." });
    }

    if (formStartedAt && Date.now() - Number(formStartedAt) < 1500) {
      return res.status(400).json({ error: "Submission too fast. Please retry." });
    }

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
