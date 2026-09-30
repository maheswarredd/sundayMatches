import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Plus, Users, Trash2, Edit2, Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function TeamsPage() {
  const { isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#16a34a');
  const [logo, setLogo] = useState('');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const fetchTeams = async () => {
    try {
      const res = await api.getTeams();
      if (res.success) {
        setTeams(res.teams);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const openCreateModal = () => {
    setEditingTeam(null);
    setName('');
    setShortName('');
    setPrimaryColor('#16a34a');
    setLogo('');
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setName(team.name);
    setShortName(team.shortName);
    setPrimaryColor(team.primaryColor || '#16a34a');
    setLogo(team.logo || '');
    setShowModal(true);
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!name.trim() || !shortName.trim()) {
      return setError('Team name and short name are required');
    }

    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam._id, { name, shortName, primaryColor, logo });
        setToast('Team updated successfully');
      } else {
        await api.createTeam({ name, shortName, primaryColor, logo });
        setToast('Team created successfully');
      }
      setShowModal(false);
      fetchTeams();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTeam = async (id, teamName) => {
    if (!window.confirm(`Are you sure you want to delete ${teamName}? This will also delete all its registered players.`)) {
      return;
    }
    try {
      await api.deleteTeam(id);
      setToast('Team deleted');
      fetchTeams();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Toast */}
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
            <Trophy className="w-6 h-6 text-emerald-600" />
            Cricket Teams
          </h1>
          <p className="text-xs text-slate-500">
            Registered club teams, squads, and franchise profiles
          </p>
        </div>

        {isAuthenticated && (
          <button onClick={openCreateModal} className="btn btn-primary text-xs px-4 py-2">
            <Plus className="w-4 h-4" />
            Create New Team
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 space-y-3">
          <p>No teams created yet.</p>
          {isAuthenticated && (
            <button onClick={openCreateModal} className="btn btn-primary text-xs">
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {teams.map((team) => (
            <div key={team._id} className="card p-5 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-white text-base shadow"
                    style={{ backgroundColor: team.primaryColor || '#16a34a' }}
                  >
                    {team.shortName}
                  </div>
                  <span className="badge badge-green text-[10px]">
                    {team.playerCount || 0} Players
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{team.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Code: {team.shortName}
                  </p>
                </div>
              </div>

              {isAuthenticated && (
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(team)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                    title="Edit Team"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team._id, team.name)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Team Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-4">
              {editingTeam ? 'Edit Team' : 'Create New Team'}
            </h3>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Strikers"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Short Name / Code (e.g. RS) *</label>
                <input
                  type="text"
                  maxLength={5}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  placeholder="e.g. RS"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="form-input font-mono text-xs"
                  />
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
                  {editingTeam ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
