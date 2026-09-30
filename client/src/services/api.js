const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('sundaymatches_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  // Auth
  login: (password, username = 'admin') =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  verifyToken: () => request('/api/auth/verify'),

  // Teams
  getTeams: () => request('/api/teams'),
  getTeam: (id) => request(`/api/teams/${id}`),
  createTeam: (teamData) =>
    request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    }),
  updateTeam: (id, teamData) =>
    request(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    }),
  deleteTeam: (id) => request(`/api/teams/${id}`, { method: 'DELETE' }),

  // Players
  getPlayers: (teamId) => request(`/api/players${teamId ? `?team=${teamId}` : ''}`),
  getPlayer: (id) => request(`/api/players/${id}`),
  createPlayer: (playerData) =>
    request('/api/players', {
      method: 'POST',
      body: JSON.stringify(playerData)
    }),
  updatePlayer: (id, playerData) =>
    request(`/api/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(playerData)
    }),
  deletePlayer: (id) => request(`/api/players/${id}`, { method: 'DELETE' }),

  // Matches
  getMatches: (status) => request(`/api/matches${status ? `?status=${status}` : ''}`),
  getMatch: (id) => request(`/api/matches/${id}`),
  createMatch: (matchData) =>
    request('/api/matches', {
      method: 'POST',
      body: JSON.stringify(matchData)
    }),
  recordToss: (id, tossData) =>
    request(`/api/matches/${id}/toss`, {
      method: 'POST',
      body: JSON.stringify(tossData)
    }),
  savePlayingXI: (id, xiData) =>
    request(`/api/matches/${id}/playing-xi`, {
      method: 'POST',
      body: JSON.stringify(xiData)
    }),
  startMatch: (id, startData) =>
    request(`/api/matches/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(startData)
    }),
  startInnings2: (id, startData) =>
    request(`/api/matches/${id}/start-innings-2`, {
      method: 'POST',
      body: JSON.stringify(startData)
    }),
  pauseMatch: (id) => request(`/api/matches/${id}/pause`, { method: 'POST' }),
  resumeMatch: (id) => request(`/api/matches/${id}/resume`, { method: 'POST' }),
  endMatch: (id, endData) =>
    request(`/api/matches/${id}/end`, {
      method: 'POST',
      body: JSON.stringify(endData)
    }),
  deleteMatch: (id) => request(`/api/matches/${id}`, { method: 'DELETE' }),
  getScorecard: (id) => request(`/api/matches/${id}/scorecard`),
  getCommentary: (id, inningsNumber) =>
    request(`/api/matches/${id}/commentary${inningsNumber ? `?inningsNumber=${inningsNumber}` : ''}`),

  // Scoring Engine Endpoints
  recordBall: (matchId, ballData) =>
    request(`/api/scoring/${matchId}/ball`, {
      method: 'POST',
      body: JSON.stringify(ballData)
    }),
  undoLastBall: (matchId, reason) =>
    request(`/api/scoring/${matchId}/undo`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
  selectNextBowler: (matchId, bowlerId) =>
    request(`/api/scoring/${matchId}/next-bowler`, {
      method: 'POST',
      body: JSON.stringify({ bowlerId })
    }),
  changeBowler: (matchId, bowlerId) =>
    request(`/api/scoring/${matchId}/change-bowler`, {
      method: 'POST',
      body: JSON.stringify({ bowlerId })
    }),
  changeBatter: (matchId, batterData) =>
    request(`/api/scoring/${matchId}/change-batter`, {
      method: 'POST',
      body: JSON.stringify(batterData)
    }),
  editBall: (matchId, deliveryId, editData) =>
    request(`/api/scoring/${matchId}/delivery/${deliveryId}`, {
      method: 'PUT',
      body: JSON.stringify(editData)
    }),
  getAuditLogs: (matchId) => request(`/api/audit/${matchId}`)
};
