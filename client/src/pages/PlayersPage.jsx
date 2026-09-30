import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function PlayersPage() {
  const { isAuthenticated } = useAuth();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('Batter');
  const [battingStyle, setBattingStyle] = useState('Right-hand bat');
  const [bowlingStyle, setBowlingStyle] = useState('Right-arm medium');

  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.getPlayers(selectedTeam || undefined),
        api.getTeams()
      ]);
      if (pRes.success) setPlayers(pRes.players);
      if (tRes.success) setTeams(tRes.teams);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTeam]);

  const openCreateModal = () => {
    setEditingPlayer(null);
    setName('');
    setPlayerId('');
    setTeam(teams[0]?._id || '');
    setRole('Batter');
    setBattingStyle('Right-hand bat');
    setBowlingStyle('Right-arm medium');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingPlayer(p);
    setName(p.name);
    setPlayerId(p.playerId);
    setTeam(p.team?._id || p.team);
    setRole(p.role);
    setBattingStyle(p.battingStyle || 'Right-hand bat');
    setBowlingStyle(p.bowlingStyle || 'Right-arm medium');
    setShowModal(true);
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!name.trim() || !team) {
      return setError('Name and Team are required');
    }

    try {
      if (editingPlayer) {
        await api.updatePlayer(editingPlayer._id, {
          name,
          team,
          role,
          battingStyle,
          bowlingStyle
        });
        setToast('Player updated successfully');
      } else {
        await api.createPlayer({
          name,
          playerId,
          team,
          role,
          battingStyle,
          bowlingStyle
        });
        setToast('Player created successfully');
      }
      setShowModal(false);
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePlayer = async (id, playerName) => {
    if (!window.confirm(`Delete player ${playerName}?`)) return;
    try {
      await api.deletePlayer(id);
      setToast('Player deleted');
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {toast && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Players Roster
          </h1>
          <p className="text-xs text-slate-500">
            Registered cricket players, roles, and profiles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="form-select text-xs py-2 w-48"
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          {isAuthenticated && (
            <button onClick={openCreateModal} className="btn btn-primary text-xs px-4 py-2 shrink-0">
              <Plus className="w-4 h-4" />
              Add Player
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Loading players...</div>
      ) : players.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 space-y-3">
          <p>No players found.</p>
          {isAuthenticated && (
            <button onClick={openCreateModal} className="btn btn-primary text-xs">
              Add First Player
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((p) => (
            <div key={p._id} className="card p-4 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {p.playerId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.role === 'Batter'
                        ? 'bg-blue-100 text-blue-700'
                        : p.role === 'Bowler'
                        ? 'bg-amber-100 text-amber-800'
                        : p.role === 'All-rounder'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {p.role}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm truncate">{p.name}</h4>
                  <p className="text-xs font-semibold text-emerald-700 truncate">
                    {p.team?.name || 'Unassigned'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                  <div>Batting: <span className="font-medium text-slate-700">{p.battingStyle}</span></div>
                  <div>Bowling: <span className="font-medium text-slate-700">{p.bowlingStyle}</span></div>
                </div>
              </div>

              {isAuthenticated && (
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1 rounded text-slate-500 hover:bg-slate-100"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(p._id, p.name)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Player Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-4">
              {editingPlayer ? 'Edit Player' : 'Create New Player'}
            </h3>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Player Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Virat Kohli"
                  required
                  className="form-input"
                />
              </div>

              {!editingPlayer && (
                <div className="form-group">
                  <label className="form-label">Player ID (Optional, auto-generated if blank)</label>
                  <input
                    type="text"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="e.g. VK-18"
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Team *</label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-select"
                >
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Batting Style</label>
                  <select
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value)}
                    className="form-select text-xs"
                  >
                    <option value="Right-hand bat">Right-hand bat</option>
                    <option value="Left-hand bat">Left-hand bat</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Bowling Style</label>
                  <select
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value)}
                    className="form-select text-xs"
                  >
                    <option value="Right-arm fast">Right-arm fast</option>
                    <option value="Right-arm medium">Right-arm medium</option>
                    <option value="Right-arm spin">Right-arm spin</option>
                    <option value="Left-arm fast">Left-arm fast</option>
                    <option value="Left-arm medium">Left-arm medium</option>
                    <option value="Left-arm spin">Left-arm spin</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs px-5 py-2">
                  {editingPlayer ? 'Save Changes' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
