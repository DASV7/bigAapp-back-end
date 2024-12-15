const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  location: {
    city: String,
    state: String,
    country: { type: String, default: 'Colombia' }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  budget: Number,
  manager: String,
  contact: {
    email: String,
    phone: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
