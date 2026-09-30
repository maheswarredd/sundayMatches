import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket, joinMatchRoom, leaveMatchRoom } from '../services/socket';
import ScorecardView from '../components/ScorecardView';
import CommentaryView from '../components/CommentaryView';
import {
  Radio,
  Clock,
  Shield,
  Zap,
  Users,
  Award,
  RefreshCw,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function MatchDetailsPage() {
  const { id } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [commentaryList, setCommentaryList] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, scorecard, commentary, info
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatchDetails = async () => {
    try {
      const res = await api.getMatch(id);
      if (res.success) {
        setMatchData(res);
      }
      const commRes = await api.getCommentary(id);
      if (commRes.success) {
        setCommentaryList(commRes.deliveries);
      }
    } catch (err) {
      setError(err.message || 'Failed to load match details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();

    const socket = getSocket();
    joinMatchRoom(id);

    socket.on('match:update', (payload) => {
      // Re-fetch or update match state seamlessly
      fetchMatchDetails();
    });

    socket.on('delivery:new', (payload) => {
      if (payload?.delivery) {
        setCommentaryList((prev) => [payload.delivery, ...prev]);
      }
    });

    return () => {
      leaveMatchRoom(id);
      socket.off('match:update');
      socket.off('delivery:new');
    };
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        Loading match details...
      </div>
    );
  }

  if (error || !matchData?.match) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-rose-600 font-semibold">{error || 'Match not found'}</p>
        <Link to="/live" className="btn btn-primary text-xs">
          Back to Live Matches
        </Link>
      </div>
    );
  }

  const { match, currentInnings, innings1, innings2, currentRunRate, requiredRunRate } = matchData;
  const battingTeam = match.battingTeam;
  const bowlingTeam = match.bowlingTeam;

  // Find active striker and non-striker in batting scorecard
  const strikerRecord = currentInnings?.battingScorecard?.find(
    (b) => b.player?.toString() === match.activeStrikerId?._id?.toString()
  );
  const nonStrikerRecord = currentInnings?.battingScorecard?.find(
    (b) => b.player?.toString() === match.activeNonStrikerId?._id?.toString()
  );

  // Find active bowler in bowling scorecard
  const bowlerRecord = currentInnings?.bowlingScorecard?.find(
    (b) => b.player?.toString() === match.activeBowlerId?._id?.toString()
  );

  return (
    <div className="space-y-6 py-6">
      {/* Top Banner: Scoreboard Header */}
      <div className="card p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          {/* Match Title & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`badge ${match.status === 'LIVE' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'}`}>
                {match.status === 'LIVE' && <span className="pulse-dot mr-1 bg-white"></span>}
                {match.status}
              </span>
              <span className="text-slate-300 font-medium">
                {match.series} &bull; {match.format} &bull; {match.venue}
              </span>
            </div>

            <Link
              to={`/admin/score/${match._id}`}
              className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow"
            >
              <Shield className="w-3.5 h-3.5" />
              Scoring Console
            </Link>
          </div>

          {/* Main Score Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            <div>
              <div className="flex items-baseline gap-3">
                <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {battingTeam?.name || 'Batting Team'}
                </h2>
                <span className="font-display font-extrabold text-3xl sm:text-4xl text-emerald-400">
                  {currentInnings ? `${currentInnings.totalRuns}/${currentInnings.wickets}` : '0/0'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300 mt-1">
                Overs: <span className="text-white font-bold">{currentInnings ? `${currentInnings.oversCompleted}.${currentInnings.ballsInCurrentOver}` : '0.0'}</span> / {match.totalOvers}
                <span className="mx-2 text-slate-500">&bull;</span>
                CRR: <span className="text-emerald-300 font-bold">{currentRunRate}</span>
                {requiredRunRate > 0 && (
                  <>
                    <span className="mx-2 text-slate-500">&bull;</span>
                    RRR: <span className="text-amber-300 font-bold">{requiredRunRate}</span>
                  </>
                )}
              </p>
            </div>

            {/* Target & Match Equation */}
            <div className="md:text-right space-y-1">
              {match.currentInnings === 2 && currentInnings?.target && (
                <div className="text-sm font-bold text-amber-300">
                  Target: {currentInnings.target} ({currentInnings.target - currentInnings.totalRuns} runs needed)
                </div>
              )}
              {match.result?.summary ? (
                <div className="text-sm font-extrabold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg inline-block">
                  {match.result.summary}
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  {match.tossWinner ? `${match.tossWinner.shortName} won toss & chose to ${match.tossDecision?.toLowerCase()}` : 'Toss pending'}
                </div>
              )}
            </div>
          </div>

          {/* Current Over Balls visualization */}
          {currentInnings?.currentOverDeliveries && (
            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                This Over:
              </span>
              {currentInnings.currentOverDeliveries.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No balls bowled yet in this over</span>
              ) : (
                currentInnings.currentOverDeliveries.map((b, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-display font-extrabold shadow-sm ${
                      b.isWicket
                        ? 'bg-rose-500 text-white'
                        : b.runs === 4
                        ? 'bg-blue-500 text-white'
                        : b.runs === 6
                        ? 'bg-emerald-500 text-white'
                        : b.isExtra
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {b.display}
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Live Overview
        </button>
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'scorecard'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Scorecard
        </button>
        <button
          onClick={() => setActiveTab('commentary')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'commentary'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Commentary ({commentaryList.length})
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'info'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Match Info
        </button>
      </div>

      {/* Tab 1: Live Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Active Batters & Bowler on Pitch */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Striker */}
            <div className="card p-4 border-l-4 border-l-emerald-600">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Active Striker
              </div>
              <div className="font-extrabold text-base text-slate-900">
                {match.activeStrikerId?.name || 'Striker'}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-slate-900">
                  {strikerRecord?.runs || 0}
                </span>
                <span className="text-xs text-slate-500">
                  ({strikerRecord?.balls || 0} balls &bull; {strikerRecord?.fours || 0} 4s &bull; {strikerRecord?.sixes || 0} 6s)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                SR: <span className="font-semibold text-slate-700">{strikerRecord?.strikeRate || 0}</span>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="card p-4 border-l-4 border-l-blue-600">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                Non-Striker
              </div>
              <div className="font-extrabold text-base text-slate-900">
                {match.activeNonStrikerId?.name || 'Non-Striker'}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-slate-900">
                  {nonStrikerRecord?.runs || 0}
                </span>
                <span className="text-xs text-slate-500">
                  ({nonStrikerRecord?.balls || 0} balls &bull; {nonStrikerRecord?.fours || 0} 4s &bull; {nonStrikerRecord?.sixes || 0} 6s)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                SR: <span className="font-semibold text-slate-700">{nonStrikerRecord?.strikeRate || 0}</span>
              </div>
            </div>

            {/* Bowler */}
            <div className="card p-4 border-l-4 border-l-amber-500">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
                Active Bowler
              </div>
              <div className="font-extrabold text-base text-slate-900">
                {match.activeBowlerId?.name || 'Select Bowler'}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-emerald-700">
                  {bowlerRecord?.wickets || 0}
                </span>
                <span className="font-display font-extrabold text-xl text-slate-900">
                  - {bowlerRecord?.runsConceded || 0}
                </span>
                <span className="text-xs text-slate-500">
                  ({bowlerRecord?.overs || 0} ov)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                ECON: <span className="font-semibold text-slate-700">{bowlerRecord?.economy || 0}</span> &bull; Maidens: {bowlerRecord?.maidens || 0}
              </div>
            </div>
          </div>

          {/* Quick Commentary Stream (Latest 8 balls) */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Recent Balls &amp; Commentary
            </h3>
            <CommentaryView deliveries={commentaryList.slice(0, 8)} />
          </div>
        </div>
      )}

      {/* Tab 2: Full Scorecard */}
      {activeTab === 'scorecard' && (
        <ScorecardView match={match} innings1={innings1} innings2={innings2} />
      )}

      {/* Tab 3: Ball-by-ball Commentary */}
      {activeTab === 'commentary' && (
        <CommentaryView deliveries={commentaryList} />
      )}

      {/* Tab 4: Match Info */}
      {activeTab === 'info' && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
            Match Details &amp; Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Series</span>
              <span className="font-bold text-slate-800 text-sm">{match.series}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Venue</span>
              <span className="font-bold text-slate-800 text-sm">{match.venue}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Format</span>
              <span className="font-bold text-slate-800 text-sm">{match.format} ({match.totalOvers} Overs)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Balls per Over</span>
              <span className="font-bold text-slate-800 text-sm">{match.ballsPerOver}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Max Overs per Bowler</span>
              <span className="font-bold text-slate-800 text-sm">{match.maxOversPerBowler}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Rules Mode</span>
              <span className="badge badge-green mt-1">{match.ruleMode}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Super Over Enabled</span>
              <span className="font-semibold text-slate-800">{match.superOverEnabled ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Toss</span>
              <span className="font-semibold text-slate-800">
                {match.tossWinner?.name} won toss &bull; {match.tossDecision}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
