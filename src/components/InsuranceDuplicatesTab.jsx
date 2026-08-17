// ==========================================
// #SECTION: INSURANCE DUPLICATES TAB (HIGH READABILITY & SOBER UI)
// ==========================================
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
    <div className="space-y-4 font-sans text-slate-200">
      
      {/* 🔹 Header Bar (Clear & Readable) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl shrink-0">
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              दुबार अर्ज तपासणी तक्ता 
              <span className="text-amber-400 font-mono text-sm bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                {duplicateGroups.length} संशयित गट
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              समान नाव + पिनकोड, मोबाईल किंवा ईमेल जुळलेले सर्व अर्ज
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="संघाचे नाव किंवा App ID ने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
      </div>

      {/* 🔹 Duplicate Groups List */}
      {displayedGroups.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 text-center rounded-2xl">
          <p className="text-slate-400 text-sm font-medium">कोणताही दुबार (Duplicate) विमा अर्ज सापडला नाही.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGroups.map((group, groupIdx) => {
            const pdfReqs = (group.reqs || []).filter(r => r && r.fileUrl);

            return (
              <div key={groupIdx} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                
                {/* Group Title Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> गट #{groupIdx + 1}
                    </span>
                    <h4 className="font-bold text-sm sm:text-base text-white">
                      {String(group.matchKey || '')}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {String(group.matchReason || '')}
                    </span>
                    <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                      {group.reqs?.length || 0} अर्ज
                    </span>

                    {/* 🔍 समोरासमोर २ याद्या कंपेअर करण्याचे बटण */}
                    {pdfReqs.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => onComparePdfs({
                          pdf1: pdfReqs[0].fileUrl,
                          title1: `${pdfReqs[0].teamName} (#${pdfReqs[0].appId})`,
                          pdf2: pdfReqs[1].fileUrl,
                          title2: `${pdfReqs[1].teamName} (#${pdfReqs[1].appId})`
                        })}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto sm:ml-0 shadow-sm"
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span>PDF समोरासमोर तपासा</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 🎯 Side-by-Side Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.reqs && group.reqs.map((req, rIdx) => {
                    if (!req) return null;

                    const reqStatus = String(req.status || 'Pending');
                    const cPhone = String(req.whatsappNumber || req.phone || '');
                    const isApproved = reqStatus.toLowerCase().includes('approved') || reqStatus.includes('मंजूर');
                    const isRejected = reqStatus.toLowerCase().includes('rejected') || reqStatus.includes('नामंजूर');

                    return (
                      <div key={rIdx} className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between hover:border-slate-700 transition">
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-800">
                              App ID: #{String(req.appId || 'N/A')}
                            </span>
                            
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                              isApproved ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' :
                              isRejected ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' :
                              'bg-slate-900 text-slate-300 border-slate-700'
                            }`}>
                              {reqStatus}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm sm:text-base text-white leading-snug">
                            {String(req.teamName || 'नाव नाही')}
                          </h5>

                          {/* 📋 स्पष्ट आणि सुटसुटीत माहिती बॉक्स */}
                          <div className="text-xs sm:text-sm text-slate-300 space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 font-sans leading-relaxed">
                            <p className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0"/> 
                              <span>{String(req.district || 'N/A')} (पिनकोड: <b className="text-amber-300 font-mono">{String(req.pincode || '-')}</b>)</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-slate-400">संपर्क:</span> 
                              <b className="text-white">{String(req.contactPerson || '-')}</b> 
                              <span className="font-mono text-slate-300">({cPhone || '-'})</span>
                            </p>
                            {req.email && (
                              <p className="flex items-center gap-2 text-slate-400 truncate">
                                <Mail className="w-4 h-4 text-slate-500 shrink-0"/> 
                                <span className="truncate">{req.email}</span>
                              </p>
                            )}
                            <p className="flex items-center gap-2 font-mono text-slate-200 font-bold pt-1 border-t border-slate-800/60">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0"/> 
                              <span>{req.govindaCount || 0} गोविंदा विमा</span>
                            </p>
                          </div>
                        </div>

                        {/* 🎯 Action Buttons (मोठे आणि ठळक) */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 mt-1 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {cPhone && (
                              <a 
                                href={`tel:${cPhone}`} 
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition" 
                                title="कॉल करा"
                              >
                                <Phone className="w-4 h-4 text-amber-400" />
                              </a>
                            )}

                            {cPhone && (
                              <a 
                                href={`https://wa.me/91${cPhone}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl transition" 
                                title="WhatsApp मेसेज पाठवा"
                              >
                                <MessageSquare className="w-4 h-4 text-emerald-400" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* 📄 एकल PDF यादी पाहणे */}
                            {req.fileUrl ? (
                              <button
                                type="button"
                                onClick={() => onViewPdf(req.fileUrl, `${String(req.teamName || '')} - यादी PDF`)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                title="यादी PDF पहा"
                              >
                                <FileText className="w-4 h-4 text-slate-300" />
                                <span>PDF पहा</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 italic">फाईल नाही</span>
                            )}

                            {/* 🚫 दुबार अर्ज Reject करणे */}
                            {!isRejected && (
                              <button
                                type="button"
                                onClick={() => onTriggerReject(req)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0"
                                title="दुबार अर्ज म्हणून Reject करा"
                              >
                                <XCircle className="w-4 h-4 text-rose-400" />
                                <span>Reject</span>
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
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md"
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