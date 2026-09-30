import React, { useState } from 'react';

export default function ScorecardView({ match, innings1, innings2 }) {
  const [activeTab, setActiveTab] = useState(match?.currentInnings || 1);

  if (!match) return null;

  const currentInningsData = activeTab === 1 ? innings1 : innings2;
  const battingTeam = activeTab === 1
    ? (innings1?.battingTeam || match.teamA)
    : (innings2?.battingTeam || match.teamB);

  return (
    <div className="space-y-6">
      {/* Innings Switcher Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab(1)}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 1
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>1st Innings: {match.teamA?.shortName || 'Team A'}</span>
          {innings1 && (
            <span className="font-display font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
              {innings1.totalRuns}/{innings1.wickets} ({innings1.oversCompleted}.{innings1.ballsInCurrentOver})
            </span>
          )}
        </button>

        {(innings2 || match.currentInnings >= 2) && (
          <button
            onClick={() => setActiveTab(2)}
            className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 2
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2nd Innings: {match.teamB?.shortName || 'Team B'}</span>
            {innings2 && (
              <span className="font-display font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {innings2.totalRuns}/{innings2.wickets} ({innings2.oversCompleted}.{innings2.ballsInCurrentOver})
              </span>
            )}
          </button>
        )}
      </div>

      {!currentInningsData ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          This innings has not started yet.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Batting Card */}
          <div className="card">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Batting Scorecard
              </h3>
              <div className="text-xs font-semibold text-slate-600">
                Total: <span className="font-display text-sm font-extrabold text-slate-900">{currentInningsData.totalRuns}/{currentInningsData.wickets}</span> ({currentInningsData.oversCompleted}.{currentInningsData.ballsInCurrentOver} ov)
              </div>
            </div>

            <div className="table-container">
              <table className="cricket-table">
                <thead>
                  <tr>
                    <th>Batter</th>
                    <th>Dismissal</th>
                    <th className="text-right">R</th>
                    <th className="text-right">B</th>
                    <th className="text-right">4s</th>
                    <th className="text-right">6s</th>
                    <th className="text-right">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInningsData.battingScorecard?.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-slate-400">
                        No batting entries yet.
                      </td>
                    </tr>
                  ) : (
                    currentInningsData.battingScorecard.map((b, idx) => {
                      let dismissalText = 'not out';
                      if (b.isOut) {
                        const dt = b.dismissalType;
                        if (dt === 'BOWLED') dismissalText = `b ${b.dismissedByBowlerName || 'bowler'}`;
                        else if (dt === 'CAUGHT') dismissalText = `c ${b.fielderName || 'sub'} b ${b.dismissedByBowlerName || ''}`;
                        else if (dt === 'LBW') dismissalText = `lbw b ${b.dismissedByBowlerName || ''}`;
                        else if (dt === 'STUMPED') dismissalText = `st ${b.fielderName || 'wk'} b ${b.dismissedByBowlerName || ''}`;
                        else if (dt === 'RUN_OUT') dismissalText = `run out (${b.fielderName || ''})`;
                        else if (dt === 'HIT_WICKET') dismissalText = `hit wicket b ${b.dismissedByBowlerName || ''}`;
                        else dismissalText = dt.toLowerCase();
                      }

                      return (
                        <tr key={idx}>
                          <td className="font-semibold text-slate-900">
                            {b.playerName}
                            {!b.isOut && <span className="text-emerald-600 font-bold ml-1">*</span>}
                          </td>
                          <td className="text-xs text-slate-500 italic max-w-[200px] truncate">
                            {dismissalText}
                          </td>
                          <td className="text-right font-display font-bold text-slate-900">{b.runs}</td>
                          <td className="text-right text-slate-600">{b.balls}</td>
                          <td className="text-right text-slate-600">{b.fours}</td>
                          <td className="text-right text-slate-600">{b.sixes}</td>
                          <td className="text-right font-semibold text-slate-700">{b.strikeRate}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Extras Row */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-800 uppercase">Extras:</span>
                <span><b>{currentInningsData.extras?.total || 0}</b></span>
                <span className="text-slate-400">
                  (w {currentInningsData.extras?.wides || 0}, nb {currentInningsData.extras?.noBalls || 0}, b {currentInningsData.extras?.byes || 0}, lb {currentInningsData.extras?.legByes || 0}, p {currentInningsData.extras?.penalty || 0})
                </span>
              </div>
              <div className="font-bold text-slate-800">
                Total: <span className="font-display text-base text-slate-900 font-extrabold">{currentInningsData.totalRuns}</span> ({currentInningsData.wickets} wkts, {currentInningsData.oversCompleted}.{currentInningsData.ballsInCurrentOver} Ov)
              </div>
            </div>
          </div>

          {/* Bowling Card */}
          <div className="card">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Bowling Scorecard
              </h3>
            </div>

            <div className="table-container">
              <table className="cricket-table">
                <thead>
                  <tr>
                    <th>Bowler</th>
                    <th className="text-right">O</th>
                    <th className="text-right">M</th>
                    <th className="text-right">R</th>
                    <th className="text-right font-bold text-emerald-700">W</th>
                    <th className="text-right">ECON</th>
                    <th className="text-right">WD</th>
                    <th className="text-right">NB</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInningsData.bowlingScorecard?.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-slate-400">
                        No bowling entries yet.
                      </td>
                    </tr>
                  ) : (
                    currentInningsData.bowlingScorecard.map((bw, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-slate-900">{bw.playerName}</td>
                        <td className="text-right text-slate-600">{bw.overs}</td>
                        <td className="text-right text-slate-600">{bw.maidens}</td>
                        <td className="text-right font-display font-bold text-slate-900">{bw.runsConceded}</td>
                        <td className="text-right font-display font-extrabold text-emerald-700">{bw.wickets}</td>
                        <td className="text-right font-semibold text-slate-700">{bw.economy}</td>
                        <td className="text-right text-slate-500">{bw.wides}</td>
                        <td className="text-right text-slate-500">{bw.noBalls}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fall of Wickets */}
          {currentInningsData.fallOfWickets?.length > 0 && (
            <div className="card p-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Fall of Wickets
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {currentInningsData.fallOfWickets.map((fow, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                  >
                    <span className="font-bold text-rose-600">{fow.score}/{fow.wicketNumber}</span>
                    <span>({fow.playerName}, {fow.overs} ov)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Partnership */}
          {currentInningsData.currentPartnership?.runs !== undefined && (
            <div className="card p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span>Current Partnership</span>
                <span className="font-display font-extrabold text-base text-emerald-700">
                  {currentInningsData.currentPartnership.runs} runs
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    ({currentInningsData.currentPartnership.balls} balls)
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
