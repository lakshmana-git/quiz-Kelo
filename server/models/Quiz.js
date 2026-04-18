const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  joinCode: { type: String, default: () => Math.random().toString(36).substring(2, 8).toUpperCase() },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'ready', 'active', 'finished'], default: 'draft' },
  timer: { type: Number, default: 30 }, // seconds per question
  currentQuestionIndex: { type: Number, default: -1 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
