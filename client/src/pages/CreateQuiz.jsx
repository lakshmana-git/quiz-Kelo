import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import '../styles/auth.css';

export default function CreateQuiz() {
  const [form, setForm] = useState({ title: '', timer: 30 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const quiz = await apiFetch('/quiz', { method: 'POST', body: JSON.stringify(form) });
      navigate(`/quiz/${quiz._id}/questions`);
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
        <h2 className="auth-title">Create a Quiz</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Quiz Title</label>
          <input
            type="text"
            placeholder="e.g. General Knowledge Battle"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
          <label>Timer per Question (seconds)</label>
          <input
            type="number"
            min="5"
            max="120"
            value={form.timer}
            onChange={e => setForm({ ...form, timer: Number(e.target.value) })}
            required
          />
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create & Add Questions →'}
          </button>
        </form>
      </div>
    </div>
  );
}
