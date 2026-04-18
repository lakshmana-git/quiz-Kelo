import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/api';
import '../styles/auth.css';

export default function JoinQuiz() {
  const [form, setForm] = useState({ joinCode: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Register as a guest player or check if name exists
      const signupData = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, password: form.name + '_guest', role: 'player' }),
      }).catch(async () => {
        // If name taken, just login
        return apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ name: form.name, password: form.name + '_guest' }),
        });
      });
      localStorage.setItem('qk_token', signupData.token);
      localStorage.setItem('qk_user', JSON.stringify(signupData.user));

      const quizData = await apiFetch('/quiz/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode: form.joinCode }),
      });

      navigate(`/quiz/${quizData.quizId}/waiting`, {
        state: { title: quizData.title, joinCode: form.joinCode.toUpperCase() },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <h1 className="auth-logo">⚡ Quizz Kelo</h1>
        <h2 className="auth-title">Join a Quiz</h2>
        <p className="auth-sub">Enter the code shared by your quiz host</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <label>Quiz Join Code</label>
          <input
            type="text"
            placeholder="e.g. AB12CD"
            value={form.joinCode}
            onChange={e => setForm({ ...form, joinCode: e.target.value.toUpperCase() })}
            maxLength={8}
            required
          />
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Joining…' : 'Join Quiz →'}
          </button>
        </form>
        <p className="auth-switch"><Link to="/">← Back to Home</Link></p>
      </div>
    </div>
  );
}
