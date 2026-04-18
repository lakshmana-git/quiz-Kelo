import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSocket, disconnectSocket } from '../socket/socket';
import '../styles/lobby.css';

export default function PlayerLobby() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('qk_user'));
    const joinCode = state?.joinCode;
    if (!joinCode || !user) return;

    const socket = getSocket();
    socket.emit('join-room', {
      joinCode,
      userId: user.id,
      name: user.name,
      isAdmin: false,
    });

    // Named handlers — socket.off with a ref removes only THIS callback
    const onQuizStarted = () => { /* wait for question:show */ };
    const onQuestion = (data) => {
      // Persist joinCode; clear any stale admin quiz flag for this browser
      localStorage.setItem('qk_joinCode', joinCode);
      localStorage.setItem('qk_isAdmin', 'false');
      localStorage.removeItem('qk_adminQuizId');
      // Pass user in nav state so QuizPlay has the right userId even in shared-localStorage environments
      navigate(`/quiz/${id}/play`, { state: { joinCode, question: data, user } });
    };

    socket.on('quiz:started', onQuizStarted);
    socket.on('question:show', onQuestion);

    const dotInterval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);

    return () => {
      clearInterval(dotInterval);
      socket.off('quiz:started', onQuizStarted);
      socket.off('question:show', onQuestion); // only removes PlayerLobby's handler
    };
  }, [id]);

  return (
    <div className="lobby-root">
      <div className="lobby-card lobby-player-waiting">
        <div className="lobby-logo">⚡ Quizz Kelo</div>
        <div className="lobby-welcome-icon">🎯</div>
        <h1 className="lobby-title">Welcome!</h1>
        <h2 className="lobby-quiz-name">{state?.title || 'Quiz'}</h2>
        <p className="lobby-waiting-msg">
          Waiting for the host to start the quiz{dots}
        </p>
        <div className="lobby-pulse-ring">
          <div className="lobby-pulse-dot"></div>
        </div>
        <p className="lobby-tip">Get ready! Questions will appear here once the host starts.</p>
      </div>
    </div>
  );
}
