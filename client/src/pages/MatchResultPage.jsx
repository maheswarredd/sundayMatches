import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import ScorecardView from '../components/ScorecardView';
import { Trophy, ArrowLeft, ExternalLink, Calendar, MapPin, Award } from 'lucide-react';

export default function MatchResultPage() {
  const { id } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getMatch(id);
        if (res.success) {
          setMatchData(res);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="py-16 text-center text-slate-500">Loading match results...</div>;
  if (!matchData?.match) return <div className="py-16 text-center text-rose-600">Match not found</div>;

  const { match, innings1, innings2 } = matchData;

  return (
    <div className="space-y-6 py-6 max-w-5xl mx-auto">
      <Link to="/" className="btn btn-outline text-xs px-3 py-1.5 w-fit flex items-center gap-1.5">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Matches
      </Link>

      {/* Result Banner */}
      <div className="card p-8 bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-300" />
            Official Match Result &bull; {match.format} ({match.totalOvers} Overs)
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
            {match.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              {match.venue}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              {new Date(match.date).toLocaleDateString()}
            </span>
          </div>

          {/* Winner Banner */}
          <div className="mt-4 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <div className="font-display font-extrabold text-xl text-amber-300">
              {match.result?.summary || 'Match Concluded'}
            </div>
          </div>
        </div>
      </div>

      {/* Score Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Innings 1 */}
        <div className="card p-4 space-y-2 border-l-4 border-l-emerald-600">
          <div className="text-xs font-bold text-slate-500 uppercase">1st Innings</div>
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-slate-900 text-base">{innings1?.battingTeam?.name || match.teamA?.name}</span>
            <span className="font-display font-extrabold text-xl text-slate-900">
              {innings1 ? `${innings1.totalRuns}/${innings1.wickets}` : '-'}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({innings1?.oversCompleted}.{innings1?.ballsInCurrentOver} ov)
              </span>
            </span>
          </div>
        </div>

        {/* Innings 2 */}
        <div className="card p-4 space-y-2 border-l-4 border-l-blue-600">
          <div className="text-xs font-bold text-slate-500 uppercase">2nd Innings</div>
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-slate-900 text-base">{innings2?.battingTeam?.name || match.teamB?.name}</span>
            <span className="font-display font-extrabold text-xl text-slate-900">
              {innings2 ? `${innings2.totalRuns}/${innings2.wickets}` : '-'}
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({innings2?.oversCompleted}.{innings2?.ballsInCurrentOver} ov)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Full Scorecard */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base uppercase tracking-wider">
          Complete Match Scorecard
        </h3>
        <ScorecardView match={match} innings1={innings1} innings2={innings2} />
      </div>
    </div>
  );
}
