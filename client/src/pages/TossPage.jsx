import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Coins, CheckCircle2, ArrowRight, Shield } from 'lucide-react';

export default function TossPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState('BAT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getMatch(id);
        if (res.success) {
          setMatch(res.match);
          setTossWinner(res.match.tossWinner?._id || res.match.teamA?._id);
          setTossDecision(res.match.tossDecision || 'BAT');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="py-16 text-center text-slate-500">Loading toss console...</div>;
  if (!match) return <div className="py-16 text-center text-rose-600">Match not found</div>;

  const isTeamAWinner = tossWinner === match.teamA?._id?.toString();
  const battingTeam = tossDecision === 'BAT'
    ? (isTeamAWinner ? match.teamA : match.teamB)
    : (isTeamAWinner ? match.teamB : match.teamA);
  const bowlingTeam = tossDecision === 'BAT'
    ? (isTeamAWinner ? match.teamB : match.teamA)
    : (isTeamAWinner ? match.teamA : match.teamB);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.recordToss(id, { tossWinner, tossDecision });
      if (res.success) {
        navigate(`/admin/playing-xi/${id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="card p-8 space-y-6 shadow-xl border border-slate-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white mx-auto shadow-md">
            <Coins className="w-7 h-7" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900">
            Coin Toss &amp; Inning Roles
          </h1>
          <p className="text-xs text-slate-500">
            {match.title} &bull; {match.format} ({match.totalOvers} Ov)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Who won the toss? */}
          <div className="space-y-2">
            <label className="form-label text-xs uppercase tracking-wider text-slate-500 font-bold">
              1. Toss Winner
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTossWinner(match.teamA?._id)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  tossWinner === match.teamA?._id?.toString()
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-base font-extrabold">{match.teamA?.name}</div>
                <div className="text-xs text-slate-400 font-medium">({match.teamA?.shortName})</div>
              </button>

              <button
                type="button"
                onClick={() => setTossWinner(match.teamB?._id)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  tossWinner === match.teamB?._id?.toString()
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-base font-extrabold">{match.teamB?.name}</div>
                <div className="text-xs text-slate-400 font-medium">({match.teamB?.shortName})</div>
              </button>
            </div>
          </div>

          {/* Step 2: What did they elect to do? */}
          <div className="space-y-2">
            <label className="form-label text-xs uppercase tracking-wider text-slate-500 font-bold">
              2. Toss Decision
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTossDecision('BAT')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  tossDecision === 'BAT'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-base font-extrabold">Elected to BAT</div>
                <div className="text-xs text-slate-400 font-medium">Set the target first</div>
              </button>

              <button
                type="button"
                onClick={() => setTossDecision('BOWL')}
                className={`p-4 rounded-xl border text-center transition-all ${
                  tossDecision === 'BOWL'
                    ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-base font-extrabold">Elected to BOWL</div>
                <div className="text-xs text-slate-400 font-medium">Chase the target</div>
              </button>
            </div>
          </div>

          {/* Automatic Role Determination */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <span className="font-bold text-slate-600 uppercase tracking-wider block">
              Resulting Innings 1 Lineup:
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block">Batting First:</span>
                <span className="font-display font-extrabold text-slate-900 text-sm">
                  {battingTeam?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Bowling First:</span>
                <span className="font-display font-extrabold text-slate-900 text-sm">
                  {bowlingTeam?.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Link to="/admin/dashboard" className="btn btn-outline text-xs px-4 py-2">
              Back to Dashboard
            </Link>
            <button
              type="submit"
              className="btn btn-primary text-xs px-6 py-2.5 flex items-center gap-1.5 shadow-md"
            >
              Confirm Toss &amp; Select Playing XI
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
