import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket, joinMatchRoom, leaveMatchRoom } from '../services/socket';
import {
  Undo2,
  Users,
  AlertCircle,
  CheckCircle,
  RotateCw,
  RefreshCw,
  UserCheck,
  Shield,
  Zap,
  Radio,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function AdminScoringConsolePage() {
  const { id } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showNoBallRunOutModal, setShowNoBallRunOutModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showBatterModal, setShowBatterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Wicket form state
  const [wicketType, setWicketType] = useState('BOWLED');
  const [wicketFielderId, setWicketFielderId] = useState('');
  const [wicketDismissedId, setWicketDismissedId] = useState('');
  const [newBatterId, setNewBatterId] = useState('');

  // No ball run out state
  const [nbRunsBat, setNbRunsBat] = useState(0);

  // Bowler selection state
  const [selectedBowlerId, setSelectedBowlerId] = useState('');

  // Batter swap state
  const [newStrikerId, setNewStrikerId] = useState('');
  const [newNonStrikerId, setNewNonStrikerId] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (err) => {
    setErrorMessage(err);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const fetchMatch = async () => {
    try {
      const res = await api.getMatch(id);
      if (res.success) {
        setMatchData(res);
        // If bowler change is required, pop open the bowler modal automatically
        if (res.match.bowlerChangeRequired) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      showError(err.message || 'Error fetching match');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    const socket = getSocket();
    joinMatchRoom(id);

    socket.on('match:update', () => {
      fetchMatch();
    });

    return () => {
      leaveMatchRoom(id);
      socket.off('match:update');
    };
  }, [id]);

  if (loading) {
    return <div className="py-16 text-center text-slate-500">Loading scoring console...</div>;
  }

  if (!matchData?.match) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-rose-600 font-bold">Match not found.</p>
        <Link to="/admin/dashboard" className="btn btn-primary text-xs">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { match, currentInnings } = matchData;
  const battingTeamXI = match.battingTeam?._id?.toString() === match.teamA?._id?.toString()
    ? match.playingXI_A
    : match.playingXI_B;
  const bowlingTeamXI = match.bowlingTeam?._id?.toString() === match.teamA?._id?.toString()
    ? match.playingXI_A
    : match.playingXI_B;

  // Active batter & bowler details from scorecard
  const strikerRec = currentInnings?.battingScorecard?.find(
    (b) => b.player?.toString() === match.activeStrikerId?._id?.toString()
  );
  const nonStrikerRec = currentInnings?.battingScorecard?.find(
    (b) => b.player?.toString() === match.activeNonStrikerId?._id?.toString()
  );
  const bowlerRec = currentInnings?.bowlingScorecard?.find(
    (b) => b.player?.toString() === match.activeBowlerId?._id?.toString()
  );

  // Eligible new batters (in batting XI, not yet out, not currently on pitch)
  const dismissedPlayerIds = new Set(
    currentInnings?.battingScorecard?.filter((b) => b.isOut).map((b) => b.player?.toString()) || []
  );
  const activeBatterIds = new Set([
    match.activeStrikerId?._id?.toString(),
    match.activeNonStrikerId?._id?.toString()
  ]);

  const eligibleNewBatters = battingTeamXI?.filter(
    (p) => !dismissedPlayerIds.has(p._id?.toString()) && !activeBatterIds.has(p._id?.toString())
  ) || [];

  // Eligible bowlers: in bowling XI.
  // In STANDARD rules: cannot be previousBowlerId and cannot have exceeded maxOvers
  const eligibleBowlers = bowlingTeamXI?.filter((p) => {
    if (match.ruleMode === 'STANDARD' && match.previousBowlerId) {
      if (p._id?.toString() === match.previousBowlerId?._id?.toString()) {
        return false;
      }
    }
    // Check max overs
    const bRec = currentInnings?.bowlingScorecard?.find((b) => b.player?.toString() === p._id?.toString());
    if (bRec && match.ruleMode === 'STANDARD') {
      const wholeOvers = Math.floor(bRec.legalBalls / match.ballsPerOver);
      if (wholeOvers >= match.maxOversPerBowler) return false;
    }
    return true;
  }) || [];

  // ----------------------------------------------------
  // SCORING ENGINE HANDLERS
  // ----------------------------------------------------

  // 1. Normal Bat Runs (0, 1, 2, 3, 4, 6)
  const handleScoreRuns = async (runs) => {
    if (match.bowlerChangeRequired) {
      setShowBowlerModal(true);
      return showError('Over completed! Please select the next bowler before bowling.');
    }
    setActionLoading(true);
    try {
      const res = await api.recordBall(id, { runsBat: runs, extraType: 'NONE' });
      if (res.success) {
        showToast(res.commentary);
        if (res.isOverComplete) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Extras (Wide, No Ball, Bye, Leg Bye, Penalty)
  const handleScoreExtra = async (type, extraRuns = 1) => {
    if (match.bowlerChangeRequired) {
      setShowBowlerModal(true);
      return showError('Over completed! Please select the next bowler.');
    }
    setActionLoading(true);
    try {
      const res = await api.recordBall(id, {
        runsBat: 0,
        extraType: type,
        extraRuns
      });
      if (res.success) {
        showToast(res.commentary);
        if (res.isOverComplete) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. No Ball with Bat Runs (e.g. No Ball + 1, 2, 4, 6)
  const handleNoBallWithRuns = async (runs) => {
    if (match.bowlerChangeRequired) {
      setShowBowlerModal(true);
      return showError('Over completed! Please select the next bowler.');
    }
    setActionLoading(true);
    try {
      const res = await api.recordBall(id, {
        runsBat: runs,
        extraType: 'NO_BALL',
        extraRuns: 1
      });
      if (res.success) {
        showToast(res.commentary);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Wicket Handler
  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    if (match.bowlerChangeRequired) {
      setShowBowlerModal(true);
      return showError('Over completed! Please select the next bowler.');
    }

    // If there are eligible batters remaining, incoming batter is required
    const maxWickets = battingTeamXI ? battingTeamXI.length - 1 : 10;
    const isLastWicket = (currentInnings?.wickets || 0) + 1 >= maxWickets;

    if (!isLastWicket && eligibleNewBatters.length > 0 && !newBatterId) {
      return showError('Please select the next batter to arrive at the crease.');
    }

    setActionLoading(true);
    try {
      const res = await api.recordBall(id, {
        runsBat: 0,
        extraType: 'NONE',
        isWicket: true,
        wicketInfo: {
          dismissalType: wicketType,
          dismissedPlayerId: wicketDismissedId || match.activeStrikerId?._id,
          fielderId: wicketFielderId || null
        },
        newBatterId: newBatterId || null
      });

      if (res.success) {
        showToast(`WICKET! ${res.commentary}`);
        setShowWicketModal(false);
        setNewBatterId('');
        setWicketFielderId('');
        if (res.isOverComplete) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. No Ball + Run Out Handler
  const handleNoBallRunOutSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.recordBall(id, {
        runsBat: nbRunsBat,
        extraType: 'NO_BALL',
        extraRuns: 1,
        isWicket: true,
        wicketInfo: {
          dismissalType: 'RUN_OUT',
          dismissedPlayerId: wicketDismissedId || match.activeStrikerId?._id,
          fielderId: wicketFielderId || null
        },
        newBatterId: newBatterId || null
      });

      if (res.success) {
        showToast(res.commentary);
        setShowNoBallRunOutModal(false);
        setNbRunsBat(0);
        setNewBatterId('');
        setWicketFielderId('');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Next Bowler Selection
  const handleBowlerSelect = async (e) => {
    e.preventDefault();
    if (!selectedBowlerId) return showError('Please choose a bowler.');

    setActionLoading(true);
    try {
      const res = await api.selectNextBowler(id, selectedBowlerId);
      if (res.success) {
        showToast(res.message);
        setShowBowlerModal(false);
        setSelectedBowlerId('');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Manual Bowler Change Mid-Over
  const handleBowlerChangeMidOver = async (bowlerId) => {
    setActionLoading(true);
    try {
      const res = await api.changeBowler(id, bowlerId);
      if (res.success) {
        showToast(res.message);
        setShowBowlerModal(false);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Manual Batter Adjustment
  const handleBatterChange = async (e) => {
    e.preventDefault();
    if (!newStrikerId && !newNonStrikerId) return showError('Select at least one batter to update.');
    setActionLoading(true);
    try {
      const res = await api.changeBatter(id, {
        strikerId: newStrikerId || undefined,
        nonStrikerId: newNonStrikerId || undefined
      });
      if (res.success) {
        showToast('Batters updated successfully.');
        setShowBatterModal(false);
        setNewStrikerId('');
        setNewNonStrikerId('');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Undo Last Delivery
  const handleUndo = async () => {
    if (!window.confirm('Are you sure you want to undo the last ball? The entire previous match and score state will be restored.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.undoLastBall(id, 'Admin manual undo');
      if (res.success) {
        showToast('Last ball successfully undone! State restored.');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-5xl mx-auto">
      {/* Toast & Error Notifications */}
      {toastMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl font-semibold text-xs shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-600 text-white rounded-xl font-semibold text-xs shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Over Completed Bowler Required Alert */}
      {match.bowlerChangeRequired && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Over Completed! Select the new bowler to unlock the next delivery.</span>
          </div>
          <button
            onClick={() => setShowBowlerModal(true)}
            className="btn btn-primary text-xs py-2 px-4 shadow"
          >
            Select Next Bowler
          </button>
        </div>
      )}

      {/* Top Header: Score Summary & Action Tools */}
      <div className="card p-5 bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="badge badge-live">Live Console</span>
            <span>{match.title} &bull; {match.format} ({match.totalOvers} Ov)</span>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="font-display font-black text-3xl text-slate-900">
              {match.battingTeam?.shortName}: {currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}
            </h1>
            <span className="text-sm font-bold text-slate-600">
              ({currentInnings?.oversCompleted || 0}.{currentInnings?.ballsInCurrentOver || 0} / {match.totalOvers} Ov)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={actionLoading || currentInnings?.totalDeliveries === 0}
            className="btn btn-outline text-xs px-3.5 py-2 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 flex items-center gap-1.5"
            title="Restore previous ball state"
          >
            <Undo2 className="w-4 h-4 text-rose-600" />
            Undo Last Ball
          </button>
          <Link
            to={`/matches/${match._id}`}
            target="_blank"
            className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Public View
          </Link>
        </div>
      </div>

      {/* AUTHORITATIVE ACTIVE PLAYERS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Striker */}
        <div className="card p-4 border-2 border-emerald-500 bg-emerald-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Striker (Facing)
            </span>
            <button
              onClick={() => setShowBatterModal(true)}
              className="text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              Adjust
            </button>
          </div>
          <div className="font-extrabold text-base text-slate-900 truncate">
            {match.activeStrikerId?.name || 'Not Selected'}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {strikerRec?.runs || 0}
            </span>
            <span className="text-xs text-slate-500">
              ({strikerRec?.balls || 0}b, {strikerRec?.fours || 0}x4, {strikerRec?.sixes || 0}x6)
            </span>
          </div>
        </div>

        {/* Non-Striker */}
        <div className="card p-4 border-2 border-blue-400 bg-blue-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">
              Non-Striker
            </span>
            <button
              onClick={() => setShowBatterModal(true)}
              className="text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Adjust
            </button>
          </div>
          <div className="font-extrabold text-base text-slate-900 truncate">
            {match.activeNonStrikerId?.name || 'Not Selected'}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {nonStrikerRec?.runs || 0}
            </span>
            <span className="text-xs text-slate-500">
              ({nonStrikerRec?.balls || 0}b, {nonStrikerRec?.fours || 0}x4, {nonStrikerRec?.sixes || 0}x6)
            </span>
          </div>
        </div>

        {/* Bowler */}
        <div className="card p-4 border-2 border-amber-400 bg-amber-50/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
              Bowler
            </span>
            <button
              onClick={() => setShowBowlerModal(true)}
              className="text-[11px] font-semibold text-amber-700 hover:underline"
            >
              Change
            </button>
          </div>
          <div className="font-extrabold text-base text-slate-900 truncate">
            {match.activeBowlerId?.name || (
              <span className="text-rose-600 font-bold">Select Bowler</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display font-extrabold text-2xl text-emerald-700">
              {bowlerRec?.wickets || 0}
            </span>
            <span className="font-display font-extrabold text-xl text-slate-900">
              - {bowlerRec?.runsConceded || 0}
            </span>
            <span className="text-xs text-slate-500">
              ({bowlerRec?.overs || 0} ov)
            </span>
          </div>
        </div>
      </div>

      {/* SCORING KEYPAD: DESIGNED FOR MAXIMUM SPEED */}
      <div className="card p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Legal Runs (Normal Delivery)
          </h2>
          <div className="grid grid-cols-6 gap-2.5 sm:gap-4">
            {[0, 1, 2, 3, 4, 6].map((run) => (
              <button
                key={run}
                onClick={() => handleScoreRuns(run)}
                disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
                className={`score-key-btn ${
                  run === 4 ? 'hover:border-blue-500 hover:text-blue-600' : run === 6 ? 'hover:border-emerald-500 hover:text-emerald-600' : ''
                }`}
              >
                {run}
              </button>
            ))}
          </div>
        </div>

        {/* Extras Row */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Extras (Illegal Deliveries &amp; Bonus Runs)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              onClick={() => handleScoreExtra('WIDE', 1)}
              disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
              className="btn btn-outline py-3 border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 font-bold text-sm"
            >
              Wide (1)
            </button>
            <button
              onClick={() => handleScoreExtra('NO_BALL', 1)}
              disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
              className="btn btn-outline py-3 border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 font-bold text-sm"
            >
              No Ball (1)
            </button>
            <button
              onClick={() => handleScoreExtra('BYE', 1)}
              disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
              className="btn btn-outline py-3 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm"
            >
              Bye (1)
            </button>
            <button
              onClick={() => handleScoreExtra('LEG_BYE', 1)}
              disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
              className="btn btn-outline py-3 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm"
            >
              Leg Bye (1)
            </button>
            <button
              onClick={() => handleScoreExtra('PENALTY', 5)}
              disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
              className="btn btn-outline py-3 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm"
            >
              Penalty (5)
            </button>
          </div>
        </div>

        {/* No-ball + Bat Runs Row */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            No-Ball + Bat Runs (Free Continue)
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
            {[1, 2, 3, 4, 6].map((run) => (
              <button
                key={run}
                onClick={() => handleNoBallWithRuns(run)}
                disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
                className="btn btn-outline py-2.5 text-xs font-bold border-amber-400 text-amber-950 bg-amber-50 hover:bg-amber-100"
              >
                Nb + {run} Run{run > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Wicket Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setWicketType('BOWLED');
              setShowWicketModal(true);
            }}
            disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
            className="btn btn-danger py-3 px-5 font-bold text-sm shadow-md"
          >
            Wicket!
          </button>

          <button
            onClick={() => setShowNoBallRunOutModal(true)}
            disabled={actionLoading || match.bowlerChangeRequired || !match.activeBowlerId}
            className="btn bg-rose-50 text-rose-800 border-2 border-rose-300 hover:bg-rose-100 py-3 px-4 font-bold text-sm"
          >
            No Ball + Run Out
          </button>

          <button
            onClick={() => setShowBowlerModal(true)}
            className="btn btn-outline py-3 px-4 text-xs font-bold"
          >
            Change Bowler
          </button>

          <button
            onClick={() => setShowBatterModal(true)}
            className="btn btn-outline py-3 px-4 text-xs font-bold"
          >
            Change Batter
          </button>
        </div>
      </div>

      {/* Recent Deliveries in Innings */}
      {currentInnings?.recentBalls?.length > 0 && (
        <div className="card p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Recent Balls (Last 24)
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {currentInnings.recentBalls.map((b, idx) => (
              <span
                key={idx}
                className={`delivery-bubble ${
                  b.isWicket
                    ? 'wicket'
                    : b.runs === 4
                    ? 'boundary-4'
                    : b.runs === 6
                    ? 'boundary-6'
                    : b.isExtra
                    ? 'extra'
                    : ''
                }`}
              >
                {b.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: WICKET RECORDING */}
      {/* ---------------------------------------------------- */}
      {showWicketModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600"></span>
              Record Wicket Dismissal
            </h3>

            <form onSubmit={handleWicketSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Dismissal Type</label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value)}
                  className="form-select"
                >
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="LBW">LBW</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                  <option value="RETIRED_OUT">Retired Out</option>
                  <option value="RETIRED_HURT">Retired Hurt</option>
                  <option value="OBSTRUCTING_FIELD">Obstructing the Field</option>
                  <option value="TIMED_OUT">Timed Out</option>
                </select>
              </div>

              {/* Dismissed Batter Selection (esp. for Run Out) */}
              <div className="form-group">
                <label className="form-label">Dismissed Batter</label>
                <select
                  value={wicketDismissedId || match.activeStrikerId?._id}
                  onChange={(e) => setWicketDismissedId(e.target.value)}
                  className="form-select"
                >
                  <option value={match.activeStrikerId?._id}>
                    {match.activeStrikerId?.name} (Striker)
                  </option>
                  <option value={match.activeNonStrikerId?._id}>
                    {match.activeNonStrikerId?.name} (Non-Striker)
                  </option>
                </select>
              </div>

              {/* Fielder Selection (Only keeper if stumped!) */}
              {(wicketType === 'CAUGHT' || wicketType === 'STUMPED' || wicketType === 'RUN_OUT') && (
                <div className="form-group">
                  <label className="form-label">
                    {wicketType === 'STUMPED' ? 'Wicketkeeper (Required)' : 'Fielder Involved'}
                  </label>
                  <select
                    value={wicketFielderId}
                    onChange={(e) => setWicketFielderId(e.target.value)}
                    required={wicketType === 'STUMPED'}
                    className="form-select"
                  >
                    <option value="">
                      {wicketType === 'STUMPED' ? '-- Select Wicketkeeper --' : '-- None / Unassisted --'}
                    </option>
                    {bowlingTeamXI
                      ?.filter((p) => {
                        if (wicketType === 'STUMPED' && match.ruleMode === 'STANDARD') {
                          return p.role === 'Wicketkeeper';
                        }
                        return true;
                      })
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Next Incoming Batter */}
              {eligibleNewBatters.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Next Batter (Incoming)</label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Select Incoming Batter --</option>
                    {eligibleNewBatters.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWicketModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-danger text-xs px-5 py-2"
                >
                  Confirm Wicket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: NO BALL + RUN OUT */}
      {/* ---------------------------------------------------- */}
      {showNoBallRunOutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2">
              No Ball + Run Out
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Adds 1 no-ball extra without incrementing legal balls, while processing the run-out dismissal.
            </p>

            <form onSubmit={handleNoBallRunOutSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Runs Completed before Run Out</label>
                <select
                  value={nbRunsBat}
                  onChange={(e) => setNbRunsBat(Number(e.target.value))}
                  className="form-select"
                >
                  <option value={0}>0 runs completed</option>
                  <option value={1}>1 run completed</option>
                  <option value={2}>2 runs completed</option>
                  <option value={3}>3 runs completed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dismissed Batter</label>
                <select
                  value={wicketDismissedId || match.activeStrikerId?._id}
                  onChange={(e) => setWicketDismissedId(e.target.value)}
                  className="form-select"
                >
                  <option value={match.activeStrikerId?._id}>
                    {match.activeStrikerId?.name} (Striker)
                  </option>
                  <option value={match.activeNonStrikerId?._id}>
                    {match.activeNonStrikerId?.name} (Non-Striker)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fielder (Thrower/Tag)</label>
                <select
                  value={wicketFielderId}
                  onChange={(e) => setWicketFielderId(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Optional Fielder --</option>
                  {bowlingTeamXI?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {eligibleNewBatters.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Next Incoming Batter</label>
                  <select
                    value={newBatterId}
                    onChange={(e) => setNewBatterId(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Select Next Batter --</option>
                    {eligibleNewBatters.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNoBallRunOutModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-danger text-xs px-5 py-2"
                >
                  Confirm No Ball + Run Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: SELECT / CHANGE BOWLER */}
      {/* ---------------------------------------------------- */}
      {showBowlerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2">
              Select Bowler
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {match.bowlerChangeRequired
                ? 'Over completed. Select the bowler for the new over.'
                : 'Select or change active bowler.'}
            </p>

            <form onSubmit={handleBowlerSelect} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Available Eligible Bowlers</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {eligibleBowlers.map((p) => {
                    const bRec = currentInnings?.bowlingScorecard?.find((b) => b.player?.toString() === p._id?.toString());
                    const oversBowled = bRec ? bRec.overs : 0;
                    const isSelected = selectedBowlerId === p._id?.toString();

                    return (
                      <div
                        key={p._id}
                        onClick={() => setSelectedBowlerId(p._id)}
                        className={`p-3 rounded-xl border text-sm flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <span>{p.name}</span>
                          <span className="text-xs text-slate-400 font-normal ml-2">({p.bowlingStyle})</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {oversBowled} / {match.maxOversPerBowler} Ov
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                {!match.bowlerChangeRequired && (
                  <button
                    type="button"
                    onClick={() => setShowBowlerModal(false)}
                    className="btn btn-outline text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={actionLoading || !selectedBowlerId}
                  className="btn btn-primary text-xs px-5 py-2"
                >
                  Set Active Bowler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: CHANGE / ADJUST ACTIVE BATTERS */}
      {/* ---------------------------------------------------- */}
      {showBatterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="font-display font-extrabold text-xl text-slate-900 mb-2">
              Adjust Active Batters
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Swap strike or replace an active batter in case of manual umpire adjustments.
            </p>

            <form onSubmit={handleBatterChange} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Current Striker (Facing)</label>
                <select
                  value={newStrikerId || match.activeStrikerId?._id}
                  onChange={(e) => setNewStrikerId(e.target.value)}
                  className="form-select"
                >
                  {battingTeamXI?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Current Non-Striker</label>
                <select
                  value={newNonStrikerId || match.activeNonStrikerId?._id}
                  onChange={(e) => setNewNonStrikerId(e.target.value)}
                  className="form-select"
                >
                  {battingTeamXI?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Swap Strike Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentStriker = match.activeStrikerId?._id;
                    const currentNonStriker = match.activeNonStrikerId?._id;
                    setNewStrikerId(currentNonStriker);
                    setNewNonStrikerId(currentStriker);
                  }}
                  className="btn btn-outline text-xs w-full flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Swap Strike (Rotate Batter)
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatterModal(false)}
                  className="btn btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary text-xs px-5 py-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
