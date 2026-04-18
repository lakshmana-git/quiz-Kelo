const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedIndex: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  timeTaken: { type: Number, default: 0 }, // ms
  score: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Answer', answerSchema);
