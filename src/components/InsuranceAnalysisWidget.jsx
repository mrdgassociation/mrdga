import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, Clock, Target, TrendingUp, AlertCircle, MapPin } from 'lucide-react';

export default function InsuranceAnalysisWidget({ mode = 'basic', requests = null }) {
  const [stats, setStats] = useState({
    target: 160000,
    approvedCount: 0,
    pendingCount: 0,
    balanceCount: 160000,
    percentage: 0
  });
  const [districtData, setDistrictData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🎯 केस १: जर ॲडमिन डॅशबोर्डने आधीच मेमरीतील डेटा पाठवला असेल (० Reads)
    if (requests && Array.isArray(requests) && requests.length > 0) {
      let approved = 0;
      let pending = 0;
      const distMap = {};

      requests.forEach(data => {
        const count = Number(data.govindaCount || 0);
        const status = String(data.status || '').toLowerCase();
        const dist = data.district || 'इतर / इतर जिल्हे';

        if (status.includes('rejected') || status.includes('नामंजूर') || status.includes('नाकार')) return;

        if (!distMap[dist]) {
          distMap[dist] = { approvedGovinda: 0, pendingGovinda: 0, totalApps: 0, totalGovinda: 0 };
        }

        distMap[dist].totalApps += 1;

        if (status.includes('approved') || status.includes('मंजूर')) {
          approved += count;
          distMap[dist].approvedGovinda += count;
          distMap[dist].totalGovinda += count;
        } else {
          pending += count;
          distMap[dist].pendingGovinda += count;
          distMap[dist].totalGovinda += count;
        }
      });

      const TOTAL_TARGET = 160000;
      const balance = Math.max(0, TOTAL_TARGET - approved);
      const pct = Math.min(100, Number(((approved / TOTAL_TARGET) * 100).toFixed(1)));

      const sortedDistricts = Object.keys(distMap).map(key => ({
        districtName: key,
        ...distMap[key]
      })).sort((a, b) => b.approvedGovinda - a.approvedGovinda);

      setStats({
        target: TOTAL_TARGET,
        approvedCount: approved,
        pendingCount: pending,
        balanceCount: balance,
        percentage: pct
      });
      setDistrictData(sortedDistricts);
      setLoading(false);
      return;
    }

    // 🎯 केस २: पब्लिक युझरसाठी Single Aggregated Doc + LocalStorage (फक्त १ Read)
    const fetchSingleSummaryDoc = async () => {
      const LOCAL_KEY = 'mrdga_insurance_summary_cache';
      const LOCAL_TIME_KEY = 'mrdga_summary_sync_time';

      const cached = localStorage.getItem(LOCAL_KEY);
      const cachedTime = localStorage.getItem(LOCAL_TIME_KEY);
      const FOUR_HOURS = 4 * 60 * 60 * 1000; // ४ तास स्थानिक मेमरीतून दिसेल

      if (cached && cachedTime && (Date.now() - Number(cachedTime) < FOUR_HOURS)) {
        try {
          const parsed = JSON.parse(cached);
          setStats({
            target: parsed.target || 160000,
            approvedCount: parsed.approvedCount || 0,
            pendingCount: parsed.pendingCount || 0,
            balanceCount: parsed.balanceCount || 160000,
            percentage: parsed.percentage || 0
          });
          setDistrictData(parsed.districts || []);
          setLoading(false);
          return;
        } catch (e) {
          console.warn("Cache parse error:", e);
        }
      }

      try {
        // 🎯 १,३४५ डॉक्युमेंट्स ऐवजी फक्त १ समरी डॉक्युमेंट फेच (खर्च: १ Read)
        const docRef = doc(db, "analytics", "insurance_summary");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setStats({
            target: data.target || 160000,
            approvedCount: data.approvedCount || 0,
            pendingCount: data.pendingCount || 0,
            balanceCount: data.balanceCount || 160000,
            percentage: data.percentage || 0
          });
          setDistrictData(data.districts || []);

          localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_TIME_KEY, Date.now().toString());
        }
      } catch (err) {
        console.error("Summary read error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSingleSummaryDoc();
  }, [requests]);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-[#0c0d14] border border-slate-800 text-center text-xs text-amber-400 font-bold animate-pulse">
        📊 विमा विश्लेषणात्मक डेटा लोड होत आहे...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🎯 बेसिक ओव्हरव्ह्यू विजेट */}
      <div className="p-5 rounded-2xl bg-[#0c0d14] border-2 border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400 shrink-0" /> 
              गोविंदा विमा संरक्षण सद्यस्थिती (२०२६)
            </h3>
            <p className="text-[11px] text-slate-400">१,६०,००० गोविंदा विमा संरक्षणाचे राज्यस्तरीय संक्षिप्त विश्लेषण</p>
          </div>

          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded-xl border border-amber-500/30">
            एकूण उद्दिष्ट: {stats.target.toLocaleString('mr-IN')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-emerald-400">विमा पूर्ण: {stats.percentage}%</span>
            <span className="text-slate-400">उर्वरित टार्गेट: {stats.balanceCount.toLocaleString('mr-IN')}</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-0.5">
            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <Target className="w-3 h-3 text-amber-400" /> एकूण टार्गेट
            </p>
            <p className="text-sm font-mono font-black text-white">{stats.target.toLocaleString('mr-IN')}</p>
          </div>

          <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 space-y-0.5">
            <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> मंजूर (Approved)
            </p>
            <p className="text-sm font-mono font-black text-emerald-400">{stats.approvedCount.toLocaleString('mr-IN')}</p>
          </div>

          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 space-y-0.5">
            <p className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> प्रक्रियेत (Pending)
            </p>
            <p className="text-sm font-mono font-black text-amber-400">{stats.pendingCount.toLocaleString('mr-IN')}</p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-0.5">
            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-400" /> उर्वरित (Balance)
            </p>
            <p className="text-sm font-mono font-black text-slate-200">{stats.balanceCount.toLocaleString('mr-IN')}</p>
          </div>
        </div>
      </div>

      {/* 📊 डीटेल्स मोड (जिल्हावार ग्रिड) */}
      {mode === 'detailed' && (
        <div className="p-5 rounded-2xl bg-[#0c0d14] border border-slate-800 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" /> जिल्हावार सविस्तर विमा विश्लेषण (District Breakdown)
              </h3>
              <p className="text-[11px] text-slate-400">प्रत्येक जिल्ह्यातील मोजलेले वैध अर्ज आणि मंजूर व प्रक्रियेतील गोविंदा आकडेवारी</p>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              एकूण जिल्हे: {districtData.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {districtData.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3">कोणताही जिल्हावार डेटा उपलब्ध नाही.</p>
            ) : (
              districtData.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start border-b border-slate-800/80 pb-2">
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {item.districtName}
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                      {item.totalApps} अर्ज
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-center">
                      <span className="text-[10px] text-emerald-400 block font-bold">मंजूर गोविंदा</span>
                      <strong className="text-xs font-mono text-emerald-400 font-black">{item.approvedGovinda.toLocaleString('mr-IN')}</strong>
                    </div>

                    <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-center">
                      <span className="text-[10px] text-amber-400 block font-bold">प्रक्रियेतील गोविंदा</span>
                      <strong className="text-xs font-mono text-amber-400 font-black">{item.pendingGovinda.toLocaleString('mr-IN')}</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center border-t border-slate-800/50">
                    <span>एकूण गोविंदा संख्या:</span>
                    <strong className="text-white font-mono">{item.totalGovinda.toLocaleString('mr-IN')}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}