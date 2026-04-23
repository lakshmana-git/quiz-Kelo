const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('qk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
