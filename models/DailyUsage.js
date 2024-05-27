const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyUsageSchema = new Schema({
  email: { type: String, required: true },
  date: { type: String, required: true },
  totalSessionTimeInSeconds: { type: Number, default: 0 } // in seconds
});

module.exports = mongoose.model('DailyUsage', dailyUsageSchema);
