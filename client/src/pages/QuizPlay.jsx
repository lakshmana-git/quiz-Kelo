import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSocket } from '../socket/socket';
import { apiFetch } from '../api/api';
import '../styles/play.css';

export default function QuizPlay() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // User identity: prefer nav state (survives localStorage overwrites in multi-tab testing)
  // then fall back to localStorage
  const userRef = useRef(
    state?.user || JSON.parse(localStorage.getItem('qk_user'))
  );
  const joinCodeRef = useRef(
    state?.joinCode || localStorage.getItem('qk_joinCode') || ''
  );

  const [question, setQuestion] = useState(state?.question || null);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(state?.question?.timer || 0);
  const [isAdmin, setIsAdmin] = useState(false); // resolved via API — see useEffect below
  const [allDone, setAllDone] = useState(false);
  const timerRef = useRef(null);

  const startCountdown = (seconds) => {
    clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Determine isAdmin: primary = qk_adminQuizId matches this quiz's ID (set by AdminLobby)
  // Fallback = createdBy comparison (works when localStorage wasn't overwritten)
  useEffect(() => {
    const user = userRef.current;

    // Primary check — most reliable: did THIS browser's current user open AdminLobby for this quiz?
    const adminQuizId = localStorage.getItem('qk_adminQuizId');
    if (adminQuizId === `${id}:${user?.id || ''}`) {
      setIsAdmin(true);
      // Still rejoin room + set authoritative joinCode
      apiFetch(`/quiz/${id}`).then(({ quiz }) => {
        joinCodeRef.current = quiz.joinCode;
        localStorage.setItem('qk_joinCode', quiz.joinCode);
        const socket = getSocket();
        socket.emit('join-room', {
          joinCode: quiz.joinCode,
          userId: user?.id,
          name: user?.name,
          isAdmin: true,
        });
      }).catch(() => {
        const socket = getSocket();
        socket.emit('join-room', {
          joinCode: joinCodeRef.current,
          userId: user?.id,
          name: user?.name,
          isAdmin: true,
        });
      });
      return;
    }

    // Fallback: fetch quiz and compare createdBy vs current user
    apiFetch(`/quiz/${id}`)
      .then(({ quiz }) => {
        const creatorId = String(quiz.createdBy?._id || quiz.createdBy?.id || quiz.createdBy || '');
        const currentId = String(user?.id || '');
        const adminStatus = creatorId.length > 0 && creatorId === currentId;
        setIsAdmin(adminStatus);
        joinCodeRef.current = quiz.joinCode;
        localStorage.setItem('qk_joinCode', quiz.joinCode);
        const socket = getSocket();
        socket.emit('join-room', {
          joinCode: quiz.joinCode,
          userId: user?.id,
          name: user?.name,
          isAdmin: adminStatus,
        });
      })
      .catch(() => {
        const fallback = localStorage.getItem('qk_isAdmin') === 'true';
        setIsAdmin(fallback);
        const socket = getSocket();
        socket.emit('join-room', {
          joinCode: joinCodeRef.current,
          userId: user?.id,
          name: user?.name,
          isAdmin: fallback,
        });
      });
  }, [id]);

  // Start countdown for the initial question passed via nav state
  useEffect(() => {
    if (state?.question) {
      startCountdown(state.question.timer);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onQuestion = (data) => {
      clearInterval(timerRef.current);
      setQuestion(data);
      setSelected(null);
      setAnswered(false);
      setResult(null);
      joinCodeRef.current = joinCodeRef.current || state?.joinCode;
      startCountdown(data.timer);
    };
    const onAnswerConfirmed = (data) => setResult(data);
    const onAllDone = () => { clearInterval(timerRef.current); setAllDone(true); };
    const onResults = ({ leaderboard }) => {
      navigate(`/quiz/${id}/results`, { state: { leaderboard } });
    };

    socket.on('question:show', onQuestion);
    socket.on('answer:confirmed', onAnswerConfirmed);
    socket.on('quiz:all-done', onAllDone);
    socket.on('results:show', onResults);

    return () => {
      clearInterval(timerRef.current);
      socket.off('question:show', onQuestion);
      socket.off('answer:confirmed', onAnswerConfirmed);
      socket.off('quiz:all-done', onAllDone);
      socket.off('results:show', onResults);
    };
  }, [id]);

  const selectAnswer = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    clearInterval(timerRef.current);

    const socket = getSocket();
    socket.emit('player:answer', {
      joinCode: joinCodeRef.current,
      questionId: question.questionId,
      selectedIndex: idx,
      userId: userRef.current?.id,
    });
  };

  const nextQuestion = () => {
    const socket = getSocket();
    socket.emit('admin:next-question', { joinCode: joinCodeRef.current });
  };

  const showResults = () => {
    const socket = getSocket();
    socket.emit('admin:show-results', { joinCode: joinCodeRef.current });
  };

  const timerPercent = question ? (timeLeft / question.timer) * 100 : 100;

  if (allDone && isAdmin) {
    return (
      <div className="play-root">
        <div className="play-card">
          <div className="play-logo">⚡ Quizz Kelo</div>
          <div className="play-alldone">
            <div className="alldone-icon">🏁</div>
            <h2>All Questions Done!</h2>
            <p>Ready to reveal the results?</p>
            <button className="btn btn-primary w-full" onClick={showResults}>
              🏆 Show Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="play-root">
        <div className="play-card">
          <div className="play-logo">⚡ Quizz Kelo</div>
          <div className="play-waiting">
            <div className="play-spinner"></div>
            <p>Waiting for the next question…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="play-root">
      <div className="play-card">
        {isAdmin && <div className="play-admin-badge">🎮 Admin Mode</div>}
        <div className="play-header">
          <span className="play-question-count">Question {question.index + 1}/{question.total}</span>
          <span className="play-timer">⏱ {timeLeft}s</span>
        </div>

        {/* Timer bar */}
        <div className="play-timer-bar-bg">
          <div
            className={`play-timer-bar ${timeLeft <= 5 ? 'danger' : ''}`}
            style={{ width: `${timerPercent}%` }}
          ></div>
        </div>

        <h2 className="play-question-text">{question.text}</h2>

        <div className="play-options">
          {question.options.map((opt, i) => {
            let cls = 'play-option';
            if (answered && selected === i) {
              cls += result?.isCorrect ? ' correct' : ' wrong';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => selectAnswer(i)}
                disabled={answered}
              >
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                {opt}
                {answered && selected === i && (
                  <span className="option-icon">{result?.isCorrect ? '✓' : '✗'}</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && result && (
          <div className={`play-feedback ${result.isCorrect ? 'correct' : 'wrong'}`}>
            {result.isCorrect ? `✓ Correct! +${result.score} points` : '✗ Wrong answer'}
          </div>
        )}

        {/* Admin-only next question button — always visible for admin */}
        {isAdmin && (
          <div className="play-admin-controls">
            <button className="btn btn-primary w-full play-next-btn" onClick={nextQuestion}>
              Next Question →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
