import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { getSocket, disconnectSocket } from '../socket/socket';
import '../styles/lobby.css';

export default function AdminLobby() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [players, setPlayers] = useState([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Named handlers so socket.off only removes these specific callbacks
    const onPlayerJoined = ({ name }) =>
      setPlayers(prev => [...prev.filter(p => p !== name), name]);
    const onPlayerLeft = ({ name }) =>
      setPlayers(prev => prev.filter(p => p !== name));
    const onQuizStarted = () => setStarted(true);
    let onQuestion; // defined after quiz fetch

    apiFetch(`/quiz/${id}`)
      .then(d => {
        setQuiz(d.quiz);
        const socket = getSocket();
        socket.emit('join-room', {
          joinCode: d.quiz.joinCode,
          userId: JSON.parse(localStorage.getItem('qk_user'))?.id,
          name: JSON.parse(localStorage.getItem('qk_user'))?.name,
          isAdmin: true,
        });

        onQuestion = (data) => {
          // Store quizId:userId so QuizPlay can confirm both match — player on same browser won't match
          const user = JSON.parse(localStorage.getItem('qk_user') || '{}');
          localStorage.setItem('qk_joinCode', d.quiz.joinCode);
          localStorage.setItem('qk_isAdmin', 'true');
          localStorage.setItem('qk_adminQuizId', `${id}:${user.id || ''}`);
          navigate(`/quiz/${id}/play`, {
            state: { joinCode: d.quiz.joinCode, question: data, user },
          });
        };

        socket.on('player-joined', onPlayerJoined);
        socket.on('player-left', onPlayerLeft);
        socket.on('quiz:started', onQuizStarted);
        socket.on('question:show', onQuestion);
      })
      .catch(() => {});

    return () => {
      // Only remove THIS component's specific handlers — never socket.off(event) without a ref
      const socket = getSocket();
      socket.off('player-joined', onPlayerJoined);
      socket.off('player-left', onPlayerLeft);
      socket.off('quiz:started', onQuizStarted);
      if (onQuestion) socket.off('question:show', onQuestion);
    };
  }, [id]);

  const startQuiz = () => {
    if (!quiz) return;
    const socket = getSocket();
    socket.emit('admin:start-quiz', { joinCode: quiz.joinCode });
  };

  if (!quiz) return <div className="lobby-loading">Loading…</div>;

  return (
    <div className="lobby-root">
      <div className="lobby-card">
        <div className="lobby-logo">⚡ Quizz Kelo</div>
        <h1 className="lobby-title">{quiz.title}</h1>
        <div className="lobby-code-block">
          <p className="lobby-code-label">Share this code with players</p>
          <div className="lobby-code">{quiz.joinCode}</div>
        </div>
        <div className="lobby-meta">
          <span>⏱ {quiz.timer}s per question</span>
          <span className={`lobby-status ${quiz.status}`}>{quiz.status.toUpperCase()}</span>
        </div>

        <div className="lobby-players">
          <h3>Players Joined ({players.length})</h3>
          {players.length === 0 ? (
            <p className="lobby-waiting">Waiting for players to join…</p>
          ) : (
            <ul className="lobby-player-list">
              {players.map((p, i) => (
                <li key={i}><span className="player-dot"></span>{p}</li>
              ))}
            </ul>
          )}
        </div>

        <button
          className="btn btn-primary w-full lobby-start-btn"
          onClick={startQuiz}
          disabled={started || quiz.status === 'active'}
        >
          {started ? 'Quiz Starting…' : '▶ Start Quiz'}
        </button>
      </div>
    </div>
  );
}
