import React from 'react';

export default function CommentaryView({ deliveries = [] }) {
  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500">
        No commentary available yet. Scoring events will appear here in real-time.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliveries.map((delivery, idx) => {
        let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
        if (delivery.isWicket) {
          badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
        } else if (delivery.runsBat === 4) {
          badgeStyle = 'bg-blue-100 text-blue-800 border-blue-300 font-extrabold';
        } else if (delivery.runsBat === 6) {
          badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
        } else if (delivery.extraType !== 'NONE') {
          badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
        }

        return (
          <div
            key={delivery._id || idx}
            className={`card p-4 flex items-start gap-4 transition-all ${
              delivery.isWicket ? 'border-rose-200 bg-rose-50/20' : ''
            }`}
          >
            {/* Over & Ball */}
            <div className="text-center min-w-[50px]">
              <div className="font-display font-bold text-sm text-slate-900">
                {delivery.overNumber}.{delivery.ballInOver}
              </div>
              <span
                className={`mt-1 inline-flex items-center justify-center min-w-[32px] h-[32px] px-2 rounded-full border text-xs font-display ${badgeStyle}`}
              >
                {delivery.displayBadge || delivery.runsBat}
              </span>
            </div>

            {/* Commentary Details */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-700">
                  {delivery.bowlerName} to {delivery.strikerName}
                </span>
                {delivery.isWicket && (
                  <span className="badge badge-live text-[10px]">
                    WICKET
                  </span>
                )}
                {delivery.runsBat === 4 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    FOUR
                  </span>
                )}
                {delivery.runsBat === 6 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    SIX
                  </span>
                )}
              </div>
              <p className="text-slate-800 text-sm leading-relaxed">
                {delivery.commentary}
              </p>
              {delivery.isOverComplete && (
                <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
                  End of Over {delivery.overNumber + 1}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
