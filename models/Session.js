const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
  email: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  diff: { type: Number },
  dailyUsageId: { type: Schema.Types.ObjectId, ref: 'DailyUsage' }
});

module.exports = mongoose.model('Session', sessionSchema);
