const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: /^\d{10}$/
  },
  preference: {
    type: String,
    required: true,
    enum: ["buy", "sell"],
    lowercase: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Lead", leadSchema);
