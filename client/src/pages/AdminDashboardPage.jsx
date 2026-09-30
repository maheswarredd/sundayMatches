import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Shield,
  Plus,
  Radio,
  Trophy,
  Users,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Coins,
  Sparkles
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStartInnings2Modal, setShowStartInnings2Modal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Create match form state
  const [title, setTitle] = useState('');
  const [series, setSeries] = useState('Sunday Championship');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('T20');
  const [totalOvers, setTotalOvers] = useState(20);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState(4);
  const [ruleMode, setRuleMode] = useState('STANDARD');
  const [superOverEnabled, setSuperOverEnabled] = useState(true);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  // Start match modal state (openers)
  const [openingStrikerId, setOpeningStrikerId] = useState('');
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState('');
  const [openingBowlerId, setOpeningBowlerId] = useState('');

  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [mRes, tRes] = await Promise.all([api.getMatches(), api.getTeams()]);
      if (mRes.success) setMatches(mRes.matches);
      if (tRes.success) {
        setTeams(tRes.teams);
        if (tRes.teams.length >= 2 && !teamA) {
          setTeamA(tRes.teams[0]._id);
          setTeamB(tRes.teams[1]._id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormatChange = (fmt) => {
    setFormat(fmt);
    if (fmt === 'T10') {
      setTotalOvers(10);
      setMaxOversPerBowler(2);
    } else if (fmt === 'T20') {
      setTotalOvers(20);
      setMaxOversPerBowler(4);
    } else if (fmt === 'ODI') {
      setTotalOvers(50);
      setMaxOversPerBowler(10);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (teamA === teamB) {
      return setError('Team A and Team B cannot be the same');
    }

    try {
      const res = await api.createMatch({
        title,
        series,
        venue,
        format,
        totalOvers: Number(totalOvers),
        maxOversPerBowler: Number(maxOversPerBowler),
        ruleMode,
        superOverEnabled,
        teamA,
        teamB
      });
      if (res.success) {
        setToast('Match created successfully');
        setShowCreateModal(false);
        fetchData();
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartMatch = async (e) => {
    e.preventDefault();
    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      return setError('Opening striker, non-striker, and bowler are all required');
    }
    if (openingStrikerId === openingNonStrikerId) {
      return setError('Striker and Non-Striker cannot be the same player');
    }

    try {
      const res = await api.startMatch(selectedMatch._id, {
        openingStrikerId,
        openingNonStrikerId,
        openingBowlerId
      });
      if (res.success) {
        setToast('Match started! Opening players active on pitch.');
        setShowStartModal(false);
        fetchData();
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartInnings2 = async (e) => {
    e.preventDefault();
    if (!openingStrikerId || !openingNonStrikerId || !openingBowlerId) {
      return setError('Opening striker, non-striker, and bowler are all required');
    }
    if (openingStrikerId === openingNonStrikerId) {
      return setError('Striker and Non-Striker cannot be the same player');
    }

    try {
      const res = await api.startInnings2(selectedMatch._id, {
        openingStrikerId,
        openingNonStrikerId,
        openingBowlerId
      });
      if (res.success) {
        setToast('Second Innings commenced!');
        setShowStartInnings2Modal(false);
        fetchData();
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePause = async (id) => {
    try {
      await api.pauseMatch(id);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleResume = async (id) => {
    try {
      await api.resumeMatch(id);
      fetchData();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete match "${title}" and all its scoring events?`)) return;
    try {
      await api.deleteMatch(id);
      setToast('Match deleted');
      fetchData();
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Toast & Error */}
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

      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Admin Operations &amp; Scoring Center
          </h1>
          <p className="text-xs text-slate-500">
            Create matches, perform toss, set playing XI, and operate the live scoring console
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setVenue('Greenfield Sports Oval');
            setShowCreateModal(true);
          }}
          className="btn btn-primary text-xs px-4 py-2.5 shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create New Match
        </button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs font-semibold text-slate-500">Total Matches</span>
          <div className="font-display font-black text-2xl text-slate-900 mt-1">{matches.length}</div>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Live Matches
          </span>
          <div className="font-display font-black text-2xl text-rose-600 mt-1">
            {matches.filter((m) => ['LIVE', 'PAUSED', 'INNINGS_BREAK'].includes(m.status)).length}
          </div>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-slate-500">Registered Teams</span>
          <div className="font-display font-black text-2xl text-slate-900 mt-1">{teams.length}</div>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-slate-500">Quick Navigation</span>
          <div className="flex gap-2 mt-2">
            <Link to="/teams" className="btn btn-outline text-[11px] py-1 px-2.5">
              Teams
            </Link>
            <Link to="/players" className="btn btn-outline text-[11px] py-1 px-2.5">
              Players
            </Link>
          </div>
        </div>
      </div>

      {/* Match Management List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Match Directory &amp; Status Controls
        </h2>

        {loading ? (
          <div className="card p-8 text-center text-slate-500">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center text-slate-500 space-y-3">
            <p>No matches created yet.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary text-xs">
              Create First Match
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m._id}
                className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                {/* Match Information */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        m.status === 'LIVE'
                          ? 'badge-live'
                          : m.status === 'COMPLETED'
                          ? 'badge-completed'
                          : 'badge-upcoming'
                      }`}
                    >
                      {m.status === 'LIVE' && <span className="pulse-dot mr-1"></span>}
                      {m.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.format} ({m.totalOvers} Ov) &bull; Rules: <b>{m.ruleMode}</b>
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{m.title}</h3>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{m.teamA?.name}</span> vs{' '}
                    <span className="font-semibold text-slate-800">{m.teamB?.name}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-slate-500">{m.venue}</span>
                  </div>
                </div>

                {/* Status-Driven Admin Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Step 1: Toss */}
                  {m.status === 'UPCOMING' && (
                    <Link
                      to={`/admin/toss/${m._id}`}
                      className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      1. Record Toss
                    </Link>
                  )}

                  {/* Step 2: Playing XI */}
                  {(m.status === 'TOSS_DONE' || m.status === 'PLAYING_XI_SELECTED') && (
                    <Link
                      to={`/admin/playing-xi/${m._id}`}
                      className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
                    >
                      <Users className="w-3.5 h-3.5" />
                      2. Playing XI
                    </Link>
                  )}

                  {/* Step 3: Start Match (Select opening players) */}
                  {m.status === 'PLAYING_XI_SELECTED' && (
                    <button
                      onClick={async () => {
                        const fullMatch = await api.getMatch(m._id);
                        setSelectedMatch(fullMatch.match);
                        setShowStartModal(true);
                      }}
                      className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      3. Start Innings 1
                    </button>
                  )}

                  {/* Step 4: Scoring Console (Live matches) */}
                  {['LIVE', 'PAUSED'].includes(m.status) && (
                    <Link
                      to={`/admin/score/${m._id}`}
                      className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Scoring Console
                    </Link>
                  )}

                  {/* Pause / Resume */}
                  {m.status === 'LIVE' && (
                    <button
                      onClick={() => handlePause(m._id)}
                      className="btn btn-outline text-xs px-2.5 py-1.5"
                      title="Pause Match"
                    >
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  )}
                  {m.status === 'PAUSED' && (
                    <button
                      onClick={() => handleResume(m._id)}
                      className="btn btn-outline text-xs px-2.5 py-1.5 text-emerald-700"
                      title="Resume Match"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      Resume
                    </button>
                  )}

                  {/* Innings Break: Start 2nd Innings */}
                  {m.status === 'INNINGS_BREAK' && m.currentInnings === 1 && (
                    <button
                      onClick={async () => {
                        const fullMatch = await api.getMatch(m._id);
                        setSelectedMatch(fullMatch.match);
                        setShowStartInnings2Modal(true);
                      }}
                      className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start 2nd Innings
                    </button>
                  )}

                  {/* Public link */}
                  <Link
                    to={`/matches/${m._id}`}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    title="Public View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(m._id, m.title)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: CREATE MATCH */}
      {/* ---------------------------------------------------- */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Create Cricket Match
            </h3>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Match Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Super Cup 2026 - Match 1"
                  required
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Team A *</label>
                  <select
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Select Team A</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Team B *</label>
                  <select
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">Select Team B</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.shortName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Series / Tournament</label>
                  <input
                    type="text"
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Venue *</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Greenfield Sports Oval"
                    required
                    className="form-input"
                  />
                </div>
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label">Match Format</label>
                  <select
                    value={format}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="form-select text-xs font-semibold"
                  >
                    <option value="T10">T10 (10 Overs)</option>
                    <option value="T20">T20 (20 Overs)</option>
                    <option value="ODI">ODI (50 Overs)</option>
                    <option value="CUSTOM">Custom Overs</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Overs</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={totalOvers}
                    onChange={(e) => setTotalOvers(e.target.value)}
                    required
                    className="form-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Overs / Bowler</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxOversPerBowler}
                    onChange={(e) => setMaxOversPerBowler(e.target.value)}
                    required
                    className="form-input text-xs"
                  />
                </div>
              </div>

              {/* Cricket Rules Mode */}
              <div className="form-group p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="form-label text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Cricket Rules
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${ruleMode === 'STANDARD' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="ruleMode"
                      value="STANDARD"
                      checked={ruleMode === 'STANDARD'}
                      onChange={() => setRuleMode('STANDARD')}
                      className="mt-0.5"
                    />
                    <div>
                      <div>Option 1: Standard Rules</div>
                      <span className="text-[11px] font-normal text-slate-500">Strict over bowler rotation &amp; stumping checks</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${ruleMode === 'CUSTOM_FLEXIBLE' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="ruleMode"
                      value="CUSTOM_FLEXIBLE"
                      checked={ruleMode === 'CUSTOM_FLEXIBLE'}
                      onChange={() => setRuleMode('CUSTOM_FLEXIBLE')}
                      className="mt-0.5"
                    />
                    <div>
                      <div>Option 2: Flexible Rules</div>
                      <span className="text-[11px] font-normal text-slate-500">Custom rules for practice or gully cricket</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Super Over Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="superOver"
                  checked={superOverEnabled}
                  onChange={(e) => setSuperOverEnabled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="superOver" className="text-xs font-semibold text-slate-700">
                  Enable optional Super Over in case of Tie
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs px-5 py-2">
                  Create Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: START MATCH & SELECT OPENERS */}
      {/* ---------------------------------------------------- */}
      {showStartModal && selectedMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2">
              Start Match: Select Openers
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select opening striker, non-striker, and opening bowler to start the first over.
            </p>

            <form onSubmit={handleStartMatch} className="space-y-4">
              {/* Batting Team Openers */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-900 uppercase">
                  Batting Team: {selectedMatch.battingTeam?.name}
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Striker (Facing) *</label>
                  <select
                    value={openingStrikerId}
                    onChange={(e) => setOpeningStrikerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Striker --</option>
                    {(selectedMatch.battingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Non-Striker *</label>
                  <select
                    value={openingNonStrikerId}
                    onChange={(e) => setOpeningNonStrikerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Non-Striker --</option>
                    {(selectedMatch.battingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bowling Team Opening Bowler */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase">
                  Bowling Team: {selectedMatch.bowlingTeam?.name}
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Bowler *</label>
                  <select
                    value={openingBowlerId}
                    onChange={(e) => setOpeningBowlerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Bowler --</option>
                    {(selectedMatch.bowlingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs px-5 py-2">
                  Commence Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: START 2ND INNINGS */}
      {/* ---------------------------------------------------- */}
      {showStartInnings2Modal && selectedMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2">
              Start 2nd Innings
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select opening batters for the chasing team and opening bowler.
            </p>

            <form onSubmit={handleStartInnings2} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-900 uppercase">
                  Chasing Batting Team
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Striker *</label>
                  <select
                    value={openingStrikerId}
                    onChange={(e) => setOpeningStrikerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Striker --</option>
                    {(selectedMatch.bowlingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Non-Striker *</label>
                  <select
                    value={openingNonStrikerId}
                    onChange={(e) => setOpeningNonStrikerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Non-Striker --</option>
                    {(selectedMatch.bowlingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase">
                  Defending Bowling Team
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Opening Bowler *</label>
                  <select
                    value={openingBowlerId}
                    onChange={(e) => setOpeningBowlerId(e.target.value)}
                    required
                    className="form-select text-xs"
                  >
                    <option value="">-- Select Bowler --</option>
                    {(selectedMatch.battingTeam?._id?.toString() === selectedMatch.teamA?._id?.toString()
                      ? selectedMatch.playingXI_A
                      : selectedMatch.playingXI_B
                    )?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStartInnings2Modal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs px-5 py-2">
                  Start Chasing Innings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
