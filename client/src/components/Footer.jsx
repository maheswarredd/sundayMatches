import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Activity, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 py-10 text-slate-500 text-sm">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 3v18"></path>
                </svg>
              </div>
              <span className="font-display font-extrabold text-lg text-slate-900">
                Sunday<span className="text-emerald-600">Matches</span>
              </span>
            </div>
            <p className="text-slate-600 max-w-sm text-xs leading-relaxed">
              Fast, Simple &amp; Live Cricket Scoring platform for clubs, leagues, and tournaments. Authoritative cricket scoring engine with real-time updates and full scorecard tracking.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Production-Ready on Render &bull; WebSockets Live Sync</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-emerald-600">Home</Link></li>
              <li><Link to="/live" className="hover:text-emerald-600">Live Matches</Link></li>
              <li><Link to="/teams" className="hover:text-emerald-600">Club Teams</Link></li>
              <li><Link to="/players" className="hover:text-emerald-600">Players Directory</Link></li>
            </ul>
          </div>

          {/* Admin & Rules */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Admin &amp; Scoring</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/admin/login" className="hover:text-emerald-600">Admin Login</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-emerald-600">Match Management</Link></li>
              <li><span className="text-slate-400">Standard &amp; Custom Rules</span></li>
              <li><span className="text-slate-400">Super Over Support</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} SundayMatches. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Built for modern cricket scoring with React &amp; Node.js
          </p>
        </div>
      </div>
    </footer>
  );
}
