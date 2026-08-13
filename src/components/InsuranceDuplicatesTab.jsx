import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Phone, MessageSquare, MapPin, 
  ShieldCheck, Mail, Copy, Search, FileText, XCircle, Eye
} from 'lucide-react';

export default function InsuranceDuplicatesTab({ 
  requests = [], 
  onTriggerReject = () => {}, 
  onViewPdf = () => {},
  onComparePdfs = () => {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleGroupCount, setVisibleGroupCount] = useState(10);

  const cleanStr = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const cleanPhone = (ph) => String(ph || '').replace(/[^0-9]/g, '').slice(-10);

  // 🎯 दुबार गट शोधण्याचे मूळ लॉजिक
  const duplicateGroups = useMemo(() => {
    if (!Array.isArray(requests) || requests.length === 0) return [];

    const groupMap = new Map();

    requests.forEach((req) => {
      if (!req) return;
      const cName = cleanStr(req.teamName);
      const cPin = cleanStr(req.pincode);
      const cPhone = cleanPhone(req.whatsappNumber || req.phone);
      const cEmail = cleanStr(req.email);

      // १. समान नाव + समान पिनकोड
      if (cName && cName.length > 3 && cPin) {
        const key = `NAME_PIN_${cName}_${cPin}`;
        if (!groupMap.has(key)) groupMap.set(key, { matchType: `समान नाव व पिनकोड (${req.pincode || ''})`, reqs: [] });
        groupMap.get(key).reqs.push(req);
      }

      // २. समान मोबाईल
      if (cPhone && cPhone.length === 10) {
        const key = `PHONE_${cPhone}`;
        if (!groupMap.has(key)) groupMap.set(key, { matchType: `समान मोबाईल (${cPhone})`, reqs: [] });
        groupMap.get(key).reqs.push(req);
      }

      // ३. समान ईमेल
      if (cEmail && cEmail.includes('@')) {
        const key = `EMAIL_${cEmail}`;
        if (!groupMap.has(key)) groupMap.set(key, { matchType: `समान ईमेल (${req.email || ''})`, reqs: [] });
        groupMap.get(key).reqs.push(req);
      }
    });

    const finalGroups = [];
    const processedIds = new Set();

    groupMap.forEach((groupData) => {
      const uniqueReqs = [];
      const seenIds = new Set();

      groupData.reqs.forEach(r => {
        if (!r) return;
        const rId = String(r.id || r.appId || Math.random());
        if (!seenIds.has(rId)) {
          seenIds.add(rId);
          uniqueReqs.push(r);
        }
      });

      if (uniqueReqs.length > 1) {
        const hasNew = uniqueReqs.some(r => !processedIds.has(String(r.id || r.appId)));
        if (hasNew) {
          uniqueReqs.forEach(r => processedIds.add(String(r.id || r.appId)));
          finalGroups.push({
            matchKey: uniqueReqs[0]?.teamName || 'संघाचे नाव',
            matchReason: groupData.matchType,
            reqs: uniqueReqs
          });
        }
      }
    });

    return finalGroups;
  }, [requests]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return duplicateGroups;
    const term = searchTerm.toLowerCase().trim();
    return duplicateGroups.filter(g => 
      String(g.matchKey || '').toLowerCase().includes(term) ||
      String(g.matchReason || '').toLowerCase().includes(term) ||
      (g.reqs && g.reqs.some(r => String(r?.appId || '').toLowerCase().includes(term) || String(r?.teamName || '').toLowerCase().includes(term)))
    );
  }, [duplicateGroups, searchTerm]);

  const displayedGroups = useMemo(() => {
    return filteredGroups.slice(0, visibleGroupCount);
  }, [filteredGroups, visibleGroupCount]);

  return (
    <div className="space-y-4 font-sans">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-rose-400 flex items-center gap-2">
              दुबार अर्ज तपासणी तक्ता ({duplicateGroups.length} गट आढळले)
            </h3>
            <p className="text-[11px] text-slate-400">
              समान नाव + पिनकोड, मोबाईल किंवा ईमेल जुळलेले अर्ज
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="संघाचे नाव किंवा App ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
          />
        </div>
      </div>

      {/* Duplicate Groups List */}
      {displayedGroups.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 p-12 text-center rounded-2xl">
          <p className="text-slate-400 text-xs font-medium">कोणताही दुबार (Duplicate) विमा अर्ज सापडला नाही.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGroups.map((group, groupIdx) => {
            const pdfReqs = (group.reqs || []).filter(r => r && r.fileUrl);

            return (
              <div key={groupIdx} className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-3.5 space-y-3 shadow-xl">
                
                {/* Group Title Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> संशयित गट #{groupIdx + 1}
                    </span>
                    <h4 className="font-extrabold text-sm text-white">
                      {String(group.matchKey || '')}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-rose-400 font-bold bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/50">
                      {String(group.matchReason || '')}
                    </span>
                    <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                      {group.reqs?.length || 0} अर्ज
                    </span>

                    {/* 🔍 समोरासमोर २ याद्या कंपेअर करण्याचे मुख्य बटण */}
                    {pdfReqs.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => onComparePdfs({
                          pdf1: pdfReqs[0].fileUrl,
                          title1: `${pdfReqs[0].teamName} (#${pdfReqs[0].appId})`,
                          pdf2: pdfReqs[1].fileUrl,
                          title2: `${pdfReqs[1].teamName} (#${pdfReqs[1].appId})`
                        })}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-lg shadow transition cursor-pointer flex items-center gap-1.5 ml-auto sm:ml-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>समोरासमोर यादी तपासा (Compare PDFs)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 🎯 २-२ चे Side-by-Side Comparison Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.reqs && group.reqs.map((req, rIdx) => {
                    if (!req) return null;

                    const reqStatus = String(req.status || 'Pending');
                    const cPhone = String(req.whatsappNumber || req.phone || '');
                    const isApproved = reqStatus.toLowerCase().includes('approved') || reqStatus.includes('मंजूर');
                    const isRejected = reqStatus.toLowerCase().includes('rejected') || reqStatus.includes('नामंजूर');

                    return (
                      <div key={rIdx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 hover:border-amber-500/40 transition flex flex-col justify-between">
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                              App ID: #{String(req.appId || 'N/A')}
                            </span>
                            
                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded border ${
                              isApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              isRejected ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {reqStatus}
                            </span>
                          </div>

                          <h5 className="font-extrabold text-xs sm:text-sm text-white leading-tight">{String(req.teamName || 'नाव नाही')}</h5>

                          <div className="text-xs text-slate-300 space-y-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 font-sans">
                            <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <b>{String(req.district || 'N/A')}</b> (पिनकोड: <b className="text-amber-300">{String(req.pincode || '-')}</b>)</p>
                            <p><span className="text-slate-400">संपर्क:</span> <b>{String(req.contactPerson || '-')}</b> ({cPhone || '-'})</p>
                            {req.email && <p className="flex items-center gap-1 text-slate-400"><Mail className="w-3.5 h-3.5 text-slate-500"/> {req.email}</p>}
                            <p className="flex items-center gap-1 font-mono text-amber-400 font-bold"><ShieldCheck className="w-3.5 h-3.5"/> {req.govindaCount || 0} गोविंदा विमा</p>
                          </div>
                        </div>

                        {/* 🎯 उपयुक्त Action Buttons (PDF Viewer + Reject Button) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2 gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {cPhone && (
                              <a href={`tel:${cPhone}`} className="p-2 bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white border border-slate-700 rounded-xl transition" title="कॉल करा">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}

                            {cPhone && (
                              <a href={`https://wa.me/91${cPhone}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-slate-700 rounded-xl transition" title="WhatsApp मेसेज पाठवा">
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* 📄 १. एकल PDF यादी पाहणे */}
                            {req.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onViewPdf(req.fileUrl, `${String(req.teamName || '')} - यादी PDF`)}
                                className="px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title="यादी PDF पहा"
                              >
                                <FileText className="w-4 h-4 text-amber-400" />
                                <span>यादी PDF पहा</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">यादी फाईल नाही</span>
                            )}

                            {/* 🚫 २. दुबार अर्ज Reject करणे */}
                            {!isRejected && (
                              <button
                                type="button"
                                onClick={() => onTriggerReject(req)}
                                className="px-3 py-1.5 bg-rose-900/60 text-rose-300 border border-rose-700/50 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
                                title="दुबार अर्ज म्हणून Reject करा"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject करा</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}

          {displayedGroups.length < filteredGroups.length && (
            <div className="text-center pt-3 pb-6">
              <button
                type="button"
                onClick={() => setVisibleGroupCount(prev => prev + 10)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                + आणखी १० दुबार गट पाहा
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}