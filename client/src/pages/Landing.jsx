import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing-root">
      <div className="landing-hero">
        <div className="landing-bolt">⚡</div>
        <h1 className="landing-title">Quizz Kelo</h1>
        <p className="landing-subtitle">
          Challenge your knowledge.<br />Compete live with friends.
        </p>
        <div className="landing-cards">
          <div className="landing-card">
            <h2>Create Quiz</h2>
            <p>Sign up and build your own quiz with questions, answers and a countdown timer.</p>
            <ul className="landing-list">
              <li>✦ Add unlimited questions</li>
              <li>✦ Set per-question timer</li>
              <li>✦ Share a join code</li>
            </ul>
            <button className="btn btn-white" onClick={() => navigate('/signup')}>Get Started</button>
          </div>
          <div className="landing-card landing-card-light">
            <h2>Join Quiz</h2>
            <p>Enter a join code and compete in real-time quiz battles.</p>
            <ul className="landing-list">
              <li>✦ No account needed</li>
              <li>✦ Live leaderboard</li>
              <li>✦ Instant results</li>
            </ul>
            <button className="btn btn-primary" onClick={() => navigate('/join')}>Join Now</button>
          </div>
        </div>
        <p className="landing-footer">345 participants have completed a challenge today</p>
      </div>
    </div>
  );
}
