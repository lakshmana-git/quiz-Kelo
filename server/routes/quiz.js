const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

// POST /api/quiz — admin creates quiz
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, timer } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });
    const quiz = await Quiz.create({ title, timer: timer || 30, createdBy: req.user.id });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz/:id — get quiz with questions
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'name');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const questions = await Question.find({ quizId: quiz._id }).sort('order');
    res.json({ quiz, questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz — get all quizzes created by admin
router.get('/', authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id }).sort('-createdAt');
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/quiz/:id/questions — add a question
router.post('/:id/questions', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    const { text, options, correctIndex } = req.body;
    if (!text || !options || options.length < 2) return res.status(400).json({ message: 'Question text and at least 2 options required' });
    if (correctIndex === undefined) return res.status(400).json({ message: 'Correct answer index required' });

    const count = await Question.countDocuments({ quizId: quiz._id });
    const question = await Question.create({ quizId: quiz._id, text, options, correctIndex, order: count });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/quiz/:id/questions/:qid
router.delete('/:id/questions/:qid', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    await Question.findByIdAndDelete(req.params.qid);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/quiz/:id/submit — mark quiz ready
router.patch('/:id/submit', authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    const questionCount = await Question.countDocuments({ quizId: quiz._id });
    if (questionCount === 0) return res.status(400).json({ message: 'Add at least one question before submitting' });
    quiz.status = 'ready';
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/quiz/join — join by code
router.post('/join', async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) return res.status(400).json({ message: 'Join code required' });
    const quiz = await Quiz.findOne({ joinCode: joinCode.toUpperCase() }).populate('createdBy', 'name');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.status === 'draft') return res.status(400).json({ message: 'Quiz is not ready yet' });
    if (quiz.status === 'finished') return res.status(400).json({ message: 'Quiz has already finished' });
    res.json({ quizId: quiz._id, title: quiz.title, status: quiz.status, createdBy: quiz.createdBy });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quiz/:id/results — leaderboard
router.get('/:id/results', async (req, res) => {
  try {
    const answers = await Answer.find({ quizId: req.params.id }).populate('userId', 'name');
    const quiz = await Quiz.findById(req.params.id).select('createdBy');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    const adminId = quiz.createdBy.toString();

    // Aggregate scores per user
    const scoreMap = {};
    for (const a of answers) {
      const uid = a.userId._id.toString();
      if (uid === adminId) continue; // exclude quiz creator
      if (!scoreMap[uid]) scoreMap[uid] = { name: a.userId.name, score: 0, correct: 0, total: 0, totalTime: 0 };
      scoreMap[uid].score += a.score;
      scoreMap[uid].correct += a.isCorrect ? 1 : 0;
      scoreMap[uid].total += 1;
      if (a.isCorrect) scoreMap[uid].totalTime += a.timeTaken || 0;
    }
    const leaderboard = Object.values(scoreMap)
      .sort((a, b) => b.score - a.score || a.totalTime - b.totalTime)
      .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, correct: p.correct, total: p.total }));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
