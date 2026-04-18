import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/api';
import '../styles/results.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState(state?.leaderboard || []);
  const [loading, setLoading] = useState(!state?.leaderboard);

  useEffect(() => {
    if (!state?.leaderboard) {
      apiFetch(`/quiz/${id}/results`)
        .then(data => setLeaderboard(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  const top3 = [
    leaderboard[0] || null,
    leaderboard[1] || null,
    leaderboard[2] || null,
  ];
  const rest = leaderboard.slice(3);

  const PodiumSlot = ({ player, rank, barClass, rankLabel, medal, showTrophy }) => (
    <div className={`podium-slot podium-${rank}`}>
      {showTrophy && <div className="podium-trophy">🏆</div>}
      <div className="podium-player">{player ? player.name : '—'}</div>
      <div className="podium-medal">{player ? medal : '·'}</div>
      <div className={`podium-bar ${barClass}${!player ? ' podium-empty' : ''}`}>
        <span className="podium-rank">{rankLabel}</span>
        {player && (
          <>
            <span className="podium-score">{player.score} pts</span>
            <span className="podium-acc">{player.correct}/{player.total} ✓</span>
          </>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="results-loading">Loading results…</div>;

  return (
    <div className="results-root">
      {/* Confetti layer */}
      <div className="confetti-container" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className={`confetti-piece c${(i % 6) + 1}`} style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}></div>
        ))}
      </div>

      <div className="results-card">
        <div className="results-logo">⚡ Quizz Kelo</div>
        <h1 className="results-title">Congratulations!</h1>
        <p className="results-sub">You Successfully Passed the Challenge</p>

        {/* Podium — always show 3 bars: 2nd left, 1st center, 3rd right */}
        <div className="podium">
          <PodiumSlot player={top3[1]} rank={2} barClass="" rankLabel="2nd" medal={MEDALS[1]} showTrophy={false} />
          <PodiumSlot player={top3[0]} rank={1} barClass="podium-bar-tall" rankLabel="1st" medal={MEDALS[0]} showTrophy={true} />
          <PodiumSlot player={top3[2]} rank={3} barClass="podium-bar-short" rankLabel="3rd" medal={MEDALS[2]} showTrophy={false} />
        </div>

        {/* Full leaderboard */}
        {rest.length > 0 && (
          <div className="leaderboard">
            <h3 className="leaderboard-title">All Rankings</h3>
            <div className="leaderboard-list">
              {rest.map((p) => (
                <div key={p.rank} className="leaderboard-row">
                  <span className="lb-rank">#{p.rank}</span>
                  <span className="lb-name">{p.name}</span>
                  <span className="lb-correct">{p.correct}/{p.total} correct</span>
                  <span className="lb-score">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="results-actions">
          <Link to="/" className="btn btn-white">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
