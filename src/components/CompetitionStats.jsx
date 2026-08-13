import React from 'react';
import { Users, CheckCircle2, MessageSquareCheck, AlertCircle, Layers } from 'lucide-react';

export default function CompetitionStats({ teams, filteredTeams }) {
  // 📊 कॅटेगरीनुसार मोजणी
  const m7Count = teams.filter(t => t.category === 'M7').length;
  const m6Count = teams.filter(t => t.category === 'M6').length;
  const wCount = teams.filter(t => t.category === 'W').length;

  // 📞 कॉलिंग / रिमार्क मोजणी
  const withRemarkCount = teams.filter(t => t.comments && t.comments.length > 0).length;
  const pendingRemarkCount = teams.length - withRemarkCount;

  return (
    <div className="space-y-2 font-sans">
      {/* 🟢 कॅटेगरी काउंट्स */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-900/80 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">एकूण अर्ज</p>
            <p className="text-base font-black text-white font-mono">{teams.length}</p>
          </div>
          <Users className="w-5 h-5 text-amber-400 opacity-80" />
        </div>

        <div className="bg-slate-900/80 border border-blue-500/30 p-2.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-blue-400 font-bold uppercase">पुरुष ७ थर (M7)</p>
            <p className="text-base font-black text-blue-300 font-mono">{m7Count}</p>
          </div>
          <Layers className="w-5 h-5 text-blue-400 opacity-80" />
        </div>

        <div className="bg-slate-900/80 border border-indigo-500/30 p-2.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase">पुरुष ६ थर (M6)</p>
            <p className="text-base font-black text-indigo-300 font-mono">{m6Count}</p>
          </div>
          <Layers className="w-5 h-5 text-indigo-400 opacity-80" />
        </div>

        <div className="bg-slate-900/80 border border-pink-500/30 p-2.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-pink-400 font-bold uppercase">महिला गट (W)</p>
            <p className="text-base font-black text-pink-300 font-mono">{wCount}</p>
          </div>
          <Users className="w-5 h-5 text-pink-400 opacity-80" />
        </div>
      </div>

      {/* 📞 कॉलिंग रिमार्क स्टेट्स ट्रॅकर */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
            <MessageSquareCheck className="w-4 h-4 text-emerald-400" /> रिमार्क नोंदवलेले (बोलणे झाले)
          </span>
          <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            {withRemarkCount} टीम्स
          </span>
        </div>

        <div className="bg-rose-950/40 border border-rose-500/30 p-2 rounded-xl flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400" /> प्रलंबित कॉल्स (रिमार्क बाकी)
          </span>
          <span className="text-xs font-black font-mono text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">
            {pendingRemarkCount} टीम्स
          </span>
        </div>
      </div>
    </div>
  );
}