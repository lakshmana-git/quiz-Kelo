import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import '../styles/questions.css';

const emptyQuestion = () => ({ text: '', options: ['', '', '', ''], correctIndex: 0 });

export default function AddQuestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyQuestion());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch(`/quiz/${id}`).then(d => { setQuiz(d.quiz); setQuestions(d.questions); }).catch(() => {});
  }, [id]);

  const handleOption = (i, val) => {
    const opts = [...form.options];
    opts[i] = val;
    setForm({ ...form, options: opts });
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    setError('');
    if (form.options.some(o => !o.trim())) return setError('Fill in all 4 options');
    setSaving(true);
    try {
      const q = await apiFetch(`/quiz/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setQuestions(prev => [...prev, q]);
      setForm(emptyQuestion());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitQuiz = async () => {
    if (questions.length === 0) return setError('Add at least one question first');
    setSubmitting(true);
    try {
      await apiFetch(`/quiz/${id}/submit`, { method: 'PATCH' });
      navigate(`/quiz/${id}/lobby`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteQuestion = async (qid) => {
    try {
      await apiFetch(`/quiz/${id}/questions/${qid}`, { method: 'DELETE' });
      setQuestions(prev => prev.filter(q => q._id !== qid));
    } catch {}
  };

  return (
    <div className="qpage-root">
      <div className="qpage-inner">
        <div className="qpage-header">
          <h1 className="auth-logo">⚡ Quizz Kelo</h1>
          <h2>{quiz?.title || 'Add Questions'}</h2>
          <p className="qpage-sub">Timer: {quiz?.timer}s per question</p>
        </div>

        {/* Added questions list */}
        {questions.length > 0 && (
          <div className="qlist">
            <h3>Questions Added ({questions.length})</h3>
            {questions.map((q, i) => (
              <div key={q._id} className="qlist-item">
                <span className="qlist-num">Q{i + 1}</span>
                <span className="qlist-text">{q.text}</span>
                <button className="qlist-del" onClick={() => deleteQuestion(q._id)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add question form */}
        <div className="qform-card">
          <h3>Add Question {questions.length + 1}</h3>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={addQuestion} className="auth-form">
            <label>Question Text</label>
            <input
              type="text"
              placeholder="e.g. What is the capital of France?"
              value={form.text}
              onChange={e => setForm({ ...form, text: e.target.value })}
              required
            />
            <label>Options (click the circle to mark correct)</label>
            <div className="options-grid">
              {form.options.map((opt, i) => (
                <div key={i} className={`option-row ${form.correctIndex === i ? 'correct' : ''}`}>
                  <button
                    type="button"
                    className={`correct-btn ${form.correctIndex === i ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, correctIndex: i })}
                    title="Mark as correct"
                  >
                    {form.correctIndex === i ? '✓' : '○'}
                  </button>
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => handleOption(i, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-outline w-full" disabled={saving}>
              {saving ? 'Saving…' : '+ Add Question'}
            </button>
          </form>
        </div>

        <button
          className="btn btn-primary w-full"
          onClick={submitQuiz}
          disabled={submitting || questions.length === 0}
        >
          {submitting ? 'Submitting…' : `Submit Quiz (${questions.length} question${questions.length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
