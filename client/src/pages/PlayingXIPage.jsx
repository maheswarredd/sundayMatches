import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Users, CheckCircle2, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export default function PlayingXIPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [playersA, setPlayersA] = useState([]);
  const [playersB, setPlayersB] = useState([]);
  const [selectedA, setSelectedA] = useState([]);
  const [selectedB, setSelectedB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getMatch(id);
        if (res.success) {
          setMatch(res.match);
          const [teamARes, teamBRes] = await Promise.all([
            api.getPlayers(res.match.teamA?._id),
            api.getPlayers(res.match.teamB?._id)
          ]);

          if (teamARes.success) setPlayersA(teamARes.players);
          if (teamBRes.success) setPlayersB(teamBRes.players);

          // If playing XI was already configured, pre-populate
          if (res.match.playingXI_A?.length > 0) {
            setSelectedA(res.match.playingXI_A.map(p => p._id || p));
          } else if (teamARes.players) {
            // Select up to 11 players automatically by default
            setSelectedA(teamARes.players.slice(0, 11).map(p => p._id));
          }

          if (res.match.playingXI_B?.length > 0) {
            setSelectedB(res.match.playingXI_B.map(p => p._id || p));
          } else if (teamBRes.players) {
            setSelectedB(teamBRes.players.slice(0, 11).map(p => p._id));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const togglePlayerA = (playerId) => {
    if (selectedA.includes(playerId)) {
      setSelectedA(selectedA.filter(p => p !== playerId));
    } else {
      if (selectedA.length >= 11) {
        return setError('Maximum 11 players can be selected for Team A.');
      }
      setSelectedA([...selectedA, playerId]);
    }
    setError(null);
  };

  const togglePlayerB = (playerId) => {
    if (selectedB.includes(playerId)) {
      setSelectedB(selectedB.filter(p => p !== playerId));
    } else {
      if (selectedB.length >= 11) {
        return setError('Maximum 11 players can be selected for Team B.');
      }
      setSelectedB([...selectedB, playerId]);
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedA.length < 2 || selectedB.length < 2) {
      return setError('Please select at least 2 players per team.');
    }

    try {
      const res = await api.savePlayingXI(id, {
        playingXI_A: selectedA,
        playingXI_B: selectedB
      });
      if (res.success) {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="py-16 text-center text-slate-500">Loading squad rosters...</div>;
  if (!match) return <div className="py-16 text-center text-rose-600">Match not found</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Select Playing XI
          </h1>
          <p className="text-xs text-slate-500">
            {match.title} &bull; Select up to 11 players for each team
          </p>
        </div>

        <button onClick={handleSubmit} className="btn btn-primary text-xs px-5 py-2 shadow-md">
          Save Playing XI &amp; Continue
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Team Selection Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team A Roster */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display font-extrabold text-lg text-slate-900">
                {match.teamA?.name}
              </h2>
              <span className="text-xs text-slate-500">Squad XI Selector</span>
            </div>
            <span
              className={`badge text-xs font-bold ${
                selectedA.length === 11
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedA.length} / 11 Selected
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {playersA.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No players registered under {match.teamA?.name}. Add players in the Players tab.
              </div>
            ) : (
              playersA.map((p) => {
                const isSelected = selectedA.includes(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => togglePlayerA(p._id)}
                    className={`p-3 rounded-xl border text-sm flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                      <div>
                        <div>{p.name}</div>
                        <span className="text-[11px] font-normal text-slate-400">
                          {p.role} &bull; {p.battingStyle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {p.playerId}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Team B Roster */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display font-extrabold text-lg text-slate-900">
                {match.teamB?.name}
              </h2>
              <span className="text-xs text-slate-500">Squad XI Selector</span>
            </div>
            <span
              className={`badge text-xs font-bold ${
                selectedB.length === 11
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedB.length} / 11 Selected
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {playersB.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No players registered under {match.teamB?.name}. Add players in the Players tab.
              </div>
            ) : (
              playersB.map((p) => {
                const isSelected = selectedB.includes(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => togglePlayerB(p._id)}
                    className={`p-3 rounded-xl border text-sm flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-950 font-bold shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                      <div>
                        <div>{p.name}</div>
                        <span className="text-[11px] font-normal text-slate-400">
                          {p.role} &bull; {p.battingStyle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {p.playerId}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link to="/admin/dashboard" className="btn btn-outline text-xs px-4 py-2">
          Back to Dashboard
        </Link>
        <button onClick={handleSubmit} className="btn btn-primary text-xs px-6 py-2.5 shadow-md flex items-center gap-1.5">
          Save Playing XI &amp; Return to Dashboard
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
