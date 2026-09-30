import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Radio, Calendar, Trophy, ChevronRight, Activity } from 'lucide-react';

export default function LiveMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('all'); // all, live, upcoming, completed
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await api.getMatches();
      if (res.success && res.matches) {
        setMatches(res.matches);
      }
    } catch (e) {
      console.error('Error fetching matches:', e);
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

  const filteredMatches = matches.filter((m) => {
    if (filter === 'live') return ['LIVE', 'INNINGS_BREAK', 'PAUSED'].includes(m.status);
    if (filter === 'upcoming') return ['UPCOMING', 'TOSS_DONE', 'PLAYING_XI_SELECTED'].includes(m.status);
    if (filter === 'completed') return ['COMPLETED', 'ABANDONED'].includes(m.status);
    return true;
  });

  return (
    <div className="space-y-6 py-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
            Cricket Matches &amp; Scores
          </h1>
          <p className="text-xs text-slate-500">
            Real-time live scores, upcoming fixtures, and archived match cards
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({matches.length})
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              filter === 'live' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-rose-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Live ({matches.filter(m => ['LIVE', 'INNINGS_BREAK', 'PAUSED'].includes(m.status)).length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-blue-600'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Finished
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">
          Loading live cricket matches...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          No matches found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.map((match) => (
            <div
              key={match._id}
              className="card p-5 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`badge ${
                      match.status === 'LIVE'
                        ? 'badge-live'
                        : match.status === 'COMPLETED'
                        ? 'badge-completed'
                        : 'badge-upcoming'
                    }`}
                  >
                    {match.status === 'LIVE' && <span className="pulse-dot mr-1"></span>}
                    {match.status}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {match.format} &bull; {match.totalOvers} Overs
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{match.title}</h3>
                  <p className="text-[11px] text-slate-500">{match.venue}</p>
                </div>

                <div className="space-y-2 py-2 border-y border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{match.teamA?.name}</span>
                    <span className="font-display font-bold text-slate-900">
                      {match.innings1Score ? `${match.innings1Score.runs}/${match.innings1Score.wickets}` : '-'}
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        {match.innings1Score ? `(${match.innings1Score.overs} ov)` : ''}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{match.teamB?.name}</span>
                    <span className="font-display font-bold text-slate-900">
                      {match.currentInningsScore && match.currentInnings === 2 ? `${match.currentInningsScore.runs}/${match.currentInningsScore.wickets}` : '-'}
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        {match.currentInningsScore && match.currentInnings === 2 ? `(${match.currentInningsScore.overs} ov)` : ''}
                      </span>
                    </span>
                  </div>
                </div>

                {match.result?.summary ? (
                  <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    {match.result.summary}
                  </p>
                ) : match.status === 'LIVE' && match.currentInningsScore?.target ? (
                  <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    Target: {match.currentInningsScore.target}
                  </p>
                ) : null}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                <Link to={`/matches/${match._id}`} className="btn btn-outline text-xs py-1.5 w-full">
                  Match Center
                </Link>
                <Link to={`/admin/score/${match._id}`} className="btn btn-primary text-xs py-1.5 w-full">
                  Score Console
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
