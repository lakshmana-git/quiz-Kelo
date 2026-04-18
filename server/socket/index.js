const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// In-memory room state
// rooms[joinCode] = { quizId, adminSocketId, players: Map(socketId -> { userId, name }), questionStartTime }
const rooms = {};

module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    // ── Admin or Player joins a room ─────────────────────────────────────────
    socket.on('join-room', async ({ joinCode, userId, name, isAdmin }) => {
      joinCode = joinCode.toUpperCase();
      socket.join(joinCode);

      if (!rooms[joinCode]) {
        rooms[joinCode] = { quizId: null, adminSocketId: null, players: new Map(), questionStartTime: null };
      }
      const room = rooms[joinCode];

      if (isAdmin) {
        room.adminSocketId = socket.id;
        const quiz = await Quiz.findOne({ joinCode });
        if (quiz) {
          room.quizId = quiz._id.toString();
          room.adminUserId = quiz.createdBy.toString(); // exclude from leaderboard
        }
        socket.emit('room-joined', { isAdmin: true, joinCode });
      } else {
        room.players.set(socket.id, { userId, name });
        // Notify admin of player count
        io.to(joinCode).emit('player-joined', { name, playerCount: room.players.size });
        socket.emit('room-joined', { isAdmin: false, joinCode });
      }
    });

    // ── Admin starts quiz ────────────────────────────────────────────────────
    socket.on('admin:start-quiz', async ({ joinCode }) => {
      joinCode = joinCode.toUpperCase();
      const room = rooms[joinCode];
      if (!room) return;

      const quiz = await Quiz.findOneAndUpdate({ joinCode }, { status: 'active', currentQuestionIndex: -1 }, { returnDocument: 'after' });
      if (!quiz) return;
      room.quizId = quiz._id.toString();

      io.to(joinCode).emit('quiz:started', { title: quiz.title });

      // Send first question after a short delay
      setTimeout(() => sendQuestion(io, joinCode, 0), 2000);
    });

    // ── Admin advances to next question ─────────────────────────────────────
    socket.on('admin:next-question', async ({ joinCode }) => {
      joinCode = joinCode.toUpperCase();
      console.log(`[next-question] joinCode=${joinCode}`);
      const quiz = await Quiz.findOne({ joinCode });
      if (!quiz) { console.log(`[next-question] quiz not found for joinCode=${joinCode}`); return; }
      const nextIndex = quiz.currentQuestionIndex + 1;
      const total = await Question.countDocuments({ quizId: quiz._id });
      console.log(`[next-question] currentIndex=${quiz.currentQuestionIndex} nextIndex=${nextIndex} total=${total}`);
      if (nextIndex >= total) {
        await Quiz.findByIdAndUpdate(quiz._id, { status: 'finished' });
        console.log(`[next-question] quiz finished, emitting quiz:all-done`);
        io.to(joinCode).emit('quiz:all-done');
      } else {
        sendQuestion(io, joinCode, nextIndex);
      }
    });

    // ── Player submits an answer ─────────────────────────────────────────────
    socket.on('player:answer', async ({ joinCode, questionId, selectedIndex, userId }) => {
      joinCode = joinCode.toUpperCase();
      const room = rooms[joinCode];
      if (!room) return;

      const question = await Question.findById(questionId);
      if (!question) return;

      const isCorrect = question.correctIndex === selectedIndex;
      const timeTaken = room.questionStartTime ? Date.now() - room.questionStartTime : 0;
      const quiz = await Quiz.findById(room.quizId);
      const maxTime = (quiz?.timer || 30) * 1000;
      const speedBonus = isCorrect ? Math.max(0, Math.floor(500 * (1 - timeTaken / maxTime))) : 0;
      const score = isCorrect ? 500 + speedBonus : 0;

      // Upsert answer (one per user per question)
      // Must use $set — without it MongoDB does a full replacement, wiping quizId/userId/questionId
      await Answer.findOneAndUpdate(
        { quizId: room.quizId, userId, questionId },
        { $set: { selectedIndex, isCorrect, timeTaken, score } },
        { upsert: true, returnDocument: 'after' }
      );

      socket.emit('answer:confirmed', { isCorrect, score });
    });

    // ── Admin shows results ──────────────────────────────────────────────────
    socket.on('admin:show-results', async ({ joinCode }) => {
      joinCode = joinCode.toUpperCase();
      const room = rooms[joinCode];
      if (!room) return;

      const answers = await Answer.find({ quizId: room.quizId }).populate('userId', 'name');
      const adminId = room.adminUserId || '';
      const scoreMap = {};
      for (const a of answers) {
        const uid = a.userId._id.toString();
        if (uid === adminId) continue; // exclude quiz creator
        if (!scoreMap[uid]) scoreMap[uid] = { name: a.userId.name, score: 0, correct: 0, total: 0, totalTime: 0 };
        scoreMap[uid].score += a.score;
        scoreMap[uid].correct += a.isCorrect ? 1 : 0;
        scoreMap[uid].total += 1;
        // Accumulate time on correct answers for tiebreaker (faster = better)
        if (a.isCorrect) scoreMap[uid].totalTime += a.timeTaken || 0;
      }
      const leaderboard = Object.values(scoreMap)
        // Primary: higher score wins. Tiebreaker: fewer ms on correct answers wins
        .sort((a, b) => b.score - a.score || a.totalTime - b.totalTime)
        .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, correct: p.correct, total: p.total }));

      io.to(joinCode).emit('results:show', { leaderboard });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [code, room] of Object.entries(rooms)) {
        if (room.players.has(socket.id)) {
          const player = room.players.get(socket.id);
          room.players.delete(socket.id);
          io.to(code).emit('player-left', { name: player.name, playerCount: room.players.size });
        }
      }
    });
  });
};

// ── Helper: send question to room ─────────────────────────────────────────────
async function sendQuestion(io, joinCode, index) {
  const quiz = await Quiz.findOneAndUpdate({ joinCode }, { currentQuestionIndex: index }, { returnDocument: 'after' });
  if (!quiz) { console.log(`[sendQuestion] quiz not found for joinCode=${joinCode}`); return; }

  const question = await Question.findOne({ quizId: quiz._id, order: index });
  if (!question) { console.log(`[sendQuestion] question not found order=${index} quizId=${quiz._id}`); return; }

  const room = rooms[joinCode];
  if (room) room.questionStartTime = Date.now();

  const total = await Question.countDocuments({ quizId: quiz._id });
  console.log(`[sendQuestion] emitting question ${index + 1}/${total} to room ${joinCode}`);
  io.to(joinCode).emit('question:show', {
    questionId: question._id,
    text: question.text,
    options: question.options,
    index,
    total,
    timer: quiz.timer,
  });
}
