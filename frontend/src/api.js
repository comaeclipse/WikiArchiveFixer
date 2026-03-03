const BASE = '/api';

async function fetchJSON(url, opts) {
  const resp = await fetch(url, opts);
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json();
}

// Wiki
export const searchArticles = (q) =>
  fetchJSON(`${BASE}/wiki/search?q=${encodeURIComponent(q)}`).then(d => d.results);

export const searchCategories = (q) =>
  fetchJSON(`${BASE}/wiki/search-categories?q=${encodeURIComponent(q)}`).then(d => d.results);

export const fetchCategoryMembers = (cat, limit = 500) =>
  fetchJSON(`${BASE}/wiki/category-members?cat=${encodeURIComponent(cat)}&limit=${limit}`).then(d => d.titles);

// Deadcheck
export const batchDeadcheck = (urlIds) =>
  fetchJSON(`${BASE}/deadcheck/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url_ids: urlIds }),
  }).then(d => d.results);

// Edit
export const getAuthStatus = () => fetchJSON(`${BASE}/edit/auth-status`);

export const doLogin = (username, password) =>
  fetchJSON(`${BASE}/edit/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

export const previewEdit = (articleId) =>
  fetchJSON(`${BASE}/edit/preview?article_id=${articleId}`);

export const submitEdit = (articleId, summary) =>
  fetchJSON(`${BASE}/edit/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_id: articleId, summary }),
  });

export const previewDeadlinks = (articleId) =>
  fetchJSON(`${BASE}/edit/preview-deadlinks?article_id=${articleId}`);

export const submitDeadlinks = (articleId, summary) =>
  fetchJSON(`${BASE}/edit/submit-deadlinks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_id: articleId, summary }),
  });

// History
export const fetchStats = () => fetchJSON(`${BASE}/history/stats`);

export const fetchArticleHistory = (limit = 50, offset = 0) =>
  fetchJSON(`${BASE}/history/articles?limit=${limit}&offset=${offset}`).then(d => d.articles);

export const fetchEditHistory = (limit = 50, offset = 0) =>
  fetchJSON(`${BASE}/history/edits?limit=${limit}&offset=${offset}`).then(d => d.edits);

export const fetchRetryQueue = (limit = 50, offset = 0) =>
  fetchJSON(`${BASE}/history/retry-queue?limit=${limit}&offset=${offset}`).then(d => d.retries);
