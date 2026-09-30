import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Radio, ArrowRight, Trophy, Zap, Shield, ChevronRight, Activity, Calendar } from 'lucide-react';

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await api.getMatches();
      if (res.success && res.matches) {
        const live = res.matches.filter(m => ['LIVE', 'INNINGS_BREAK', 'PAUSED'].includes(m.status));
        const upcoming = res.matches.filter(m => ['UPCOMING', 'TOSS_DONE', 'PLAYING_XI_SELECTED'].includes(m.status));
        const completed = res.matches.filter(m => ['COMPLETED', 'ABANDONED'].includes(m.status));
        setLiveMatches(live);
        setUpcomingMatches(upcoming);
        setRecentMatches(completed);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const socket = getSocket();
    socket.on('matches:live_refresh', () => {
      fetchMatches();
    });

    return () => {
      socket.off('matches:live_refresh');
    };
  }, []);

  const featured = liveMatches[0] || upcomingMatches[0] || recentMatches[0];

  return (
    <div className="space-y-12 py-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-900 text-white p-8 md:p-14 shadow-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Live Cricket Scoring Engine
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Sunday<span className="text-emerald-300">Matches</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-emerald-100">
            Fast, Simple &amp; Live Cricket Scoring
          </p>
          <p className="text-sm text-emerald-200/90 leading-relaxed max-w-xl">
            Live scoreboards, real-time ball-by-ball commentary, and full match management. Authoritative scoring built for local clubs, tournaments, and cricket enthusiasts.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              to="/live"
              className="btn bg-white text-emerald-800 hover:bg-emerald-50 px-6 py-3 font-bold text-sm rounded-xl shadow-lg"
            >
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              Watch Live Scores
            </Link>
            <Link
              to="/admin/dashboard"
              className="btn bg-emerald-600/60 hover:bg-emerald-600 text-white border border-emerald-400/30 px-5 py-3 font-semibold text-sm rounded-xl"
            >
              <Shield className="w-4 h-4" />
              Admin Scoring Console
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Match Banner (If any) */}
      {featured && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Featured Match
            </h2>
            <Link to={`/matches/${featured._id}`} className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
              View Match Center <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="card p-6 border-l-4 border-l-emerald-600 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`badge ${featured.status === 'LIVE' ? 'badge-live' : 'badge-upcoming'}`}>
                    {featured.status === 'LIVE' && <span className="pulse-dot mr-1"></span>}
                    {featured.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {featured.format} &bull; {featured.totalOvers} Overs &bull; {featured.venue}
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-xl text-slate-900">
                  {featured.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Team A */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 text-base">{featured.teamA?.name}</span>
                    <span className="font-display font-extrabold text-lg text-slate-900">
                      {featured.innings1Score ? `${featured.innings1Score.runs}/${featured.innings1Score.wickets}` : '-'}
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        {featured.innings1Score ? `(${featured.innings1Score.overs} ov)` : ''}
                      </span>
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 text-base">{featured.teamB?.name}</span>
                    <span className="font-display font-extrabold text-lg text-slate-900">
                      {featured.currentInningsScore && featured.currentInnings === 2 ? `${featured.currentInningsScore.runs}/${featured.currentInningsScore.wickets}` : '-'}
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        {featured.currentInningsScore && featured.currentInnings === 2 ? `(${featured.currentInningsScore.overs} ov)` : ''}
                      </span>
                    </span>
                  </div>
                </div>

                {featured.result?.summary && (
                  <p className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                    {featured.result.summary}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <Link
                  to={`/matches/${featured._id}`}
                  className="btn btn-primary text-xs px-4 py-2.5"
                >
                  Live Scorecard
                </Link>
                <Link
                  to={`/admin/score/${featured._id}`}
                  className="btn btn-outline text-xs px-4 py-2.5"
                >
                  Scoring Console
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Matches List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500" />
            Live Matches ({liveMatches.length})
          </h2>
          <Link to="/live" className="text-xs font-semibold text-emerald-700 hover:underline">
            View All
          </Link>
        </div>

        {liveMatches.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            No live matches at the moment. Create a match in the Admin Dashboard to start scoring!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveMatches.map((m) => (
              <MatchCard key={m._id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming & Recent Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upcoming */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Matches ({upcomingMatches.length})
          </h2>
          {upcomingMatches.length === 0 ? (
            <div className="card p-6 text-center text-xs text-slate-500">
              No upcoming fixtures scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <MatchCardMini key={m._id} match={m} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Results */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Recent Results ({recentMatches.length})
          </h2>
          {recentMatches.length === 0 ? (
            <div className="card p-6 text-center text-xs text-slate-500">
              No completed matches yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((m) => (
                <MatchCardMini key={m._id} match={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MatchCard({ match }) {
  return (
    <div className="card p-5 hover:border-emerald-500 transition-all flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="badge badge-live">
            <span className="pulse-dot mr-1"></span>
            LIVE
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            {match.format} &bull; {match.totalOvers} Ov
          </span>
        </div>

        <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
          {match.title}
        </h4>

        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{match.teamA?.name}</span>
            <span className="font-display font-bold text-slate-900">
              {match.innings1Score ? `${match.innings1Score.runs}/${match.innings1Score.wickets}` : '-'}
              <span className="text-xs font-normal text-slate-500 ml-1">
                {match.innings1Score ? `(${match.innings1Score.overs})` : ''}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{match.teamB?.name}</span>
            <span className="font-display font-bold text-slate-900">
              {match.currentInningsScore && match.currentInnings === 2 ? `${match.currentInningsScore.runs}/${match.currentInningsScore.wickets}` : '-'}
              <span className="text-xs font-normal text-slate-500 ml-1">
                {match.currentInningsScore && match.currentInnings === 2 ? `(${match.currentInningsScore.overs})` : ''}
              </span>
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 truncate">
          {match.venue}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link to={`/matches/${match._id}`} className="btn btn-outline text-xs py-1.5 px-3 w-full">
          Scorecard
        </Link>
        <Link to={`/admin/score/${match._id}`} className="btn btn-primary text-xs py-1.5 px-3 w-full">
          Score Match
        </Link>
      </div>
    </div>
  );
}

function MatchCardMini({ match }) {
  return (
    <Link to={`/matches/${match._id}`} className="block card p-4 hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
        <span className="font-semibold text-slate-700">{match.title}</span>
        <span className="badge badge-upcoming text-[10px]">{match.status}</span>
      </div>
      <div className="flex items-center justify-between text-sm font-bold text-slate-900">
        <span>{match.teamA?.shortName} vs {match.teamB?.shortName}</span>
        <span className="text-xs font-normal text-slate-500">{match.format}</span>
      </div>
      {match.result?.summary && (
        <div className="mt-2 text-xs font-semibold text-emerald-700">
          {match.result.summary}
        </div>
      )}
    </Link>
  );
}
