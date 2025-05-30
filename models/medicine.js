const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  numberOfTablets: {
    type: Number,
    required: true,
  },
  doseQuantity: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },

  time1: {
    type: String,
    required: true,
  },
  time2: {
    type: String,
  },
  time3: {
    type: String,
    unique: true,
  },
});

module.exports = mongoose.model("medicine", medicineSchema);
