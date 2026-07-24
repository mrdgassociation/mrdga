import React, { useState, useEffect } from 'react';
import { Send, Bell, History, CheckCircle, AlertCircle, Sparkles, Smartphone, ExternalLink, Plus, X } from 'lucide-react';
import { notificationService, NOTIFICATION_CONFIG } from '../services/notificationService';

export default function NotificationHub() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // 🎯 Modal Open/Close State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: NOTIFICATION_CONFIG.categories[0].id,
    targetGroup: NOTIFICATION_CONFIG.targetGroups[0].id,
    actionUrl: '',
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await notificationService.getNotificationHistory(20);
    setHistory(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.body) {
      setStatusMsg({ type: 'error', text: 'कृपया टायटल आणि मेसेज पूर्ण भरा.' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // 1. Firestore मध्ये Notification Save
      await notificationService.sendNotification({
        ...formData,
        sentBy: 'Super Admin',
      });

 // 2. Local Active Screen Push Test Trigger
      console.log("🚀 [Hub] Attempting to trigger local push...");
      console.log("🔍 [Hub] Notification Permission State:", Notification.permission);

      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          // controller नसेल तर active वापरू
          const targetSW = navigator.serviceWorker.controller || registration.active;

          if (targetSW) {
            console.log("📤 [Hub] Sending 'TEST_PUSH' payload to Service Worker...");
            targetSW.postMessage({
              type: 'TEST_PUSH',
              payload: {
                title: formData.title,
                body: formData.body,
                url: formData.actionUrl || '/mrdga/'
              }
            });
            console.log("✅ [Hub] 'TEST_PUSH' postMessage sent successfully.");
          } else {
            console.warn("⚠️ [Hub] Active Service Worker not found.");
          }
        });
      } else {
        console.warn("⚠️ [Hub] Could not send 'TEST_PUSH'. Permission missing.");
      }



      setStatusMsg({ type: 'success', text: 'नोटीफिकेशन यशस्वीरित्या पब्लिश आणि ब्रॉडकास्ट झाले!' });
      
      // Reset & Close Modal
      setFormData({
        title: '',
        body: '',
        category: NOTIFICATION_CONFIG.categories[0].id,
        targetGroup: NOTIFICATION_CONFIG.targetGroups[0].id,
        actionUrl: '',
      });
      setIsModalOpen(false);
      loadHistory();
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'नोटीफिकेशन पाठवताना त्रुटी आली. Permissions किंवा Rules तपासा.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans text-white">
      {/* Header & Main Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" /> नोटिफिकेशन सेंटर (Notification Hub)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            वेबसाईट आणि मोबाईल युझर्ससाठी कॅटेगरीनुसार ब्रॉडकास्ट नोटिफिकेशन्स व्यवस्थापित करा.
          </p>
        </div>

        {/* 🎯 Modal ट्रिगर बटण */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> नवीन नोटीफिकेशन तयार करा
        </button>
      </div>

      {/* Alert Status */}
      {statusMsg.text && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      {/* 📊 Full Screen Table Area */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-xl">
        <h2 className="text-sm font-extrabold text-amber-300 mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" /> पाठवलेल्या नोटिफिकेशन्सची हिस्ट्री (Recent Broadcasts)
        </h2>

        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            अद्याप एकही नोटीफिकेशन पाठवलेले नाही. वर दिलेल्या बटणावर क्लिक करून नवीन नोटीफिकेशन तयार करा.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 bg-slate-950/50">
                  <th className="py-3 px-4 font-bold">टायटल & मेसेज</th>
                  <th className="py-3 px-4 font-bold">कॅटेगरी</th>
                  <th className="py-3 px-4 font-bold">लक्ष्यित ग्रुप</th>
                  <th className="py-3 px-4 font-bold">तारीख</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.body}</div>
                      {item.actionUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                          Link: {item.actionUrl} <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                        {NOTIFICATION_CONFIG.categories.find(c => c.id === item.category)?.label || item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 text-xs">
                      {NOTIFICATION_CONFIG.targetGroups.find(t => t.id === item.targetGroup)?.label || item.targetGroup}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('mr-IN') : 'आत्ताच'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🚀 MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-amber-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> नवीन ब्रॉडकास्ट नोटीफिकेशन तयार करा
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-5 gap-6">
              <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">टायटल (Title) *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="उदा. स्पर्धा नोंदणी सुरू झाली आहे!"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">मेसेज (Description) *</label>
                  <textarea
                    name="body"
                    rows="3"
                    value={formData.body}
                    onChange={handleInputChange}
                    placeholder="उदा. सर्व गोविंदा पथकांनी १५ ऑगस्टपूर्वी आपला अर्ज पूर्ण करावा..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">कॅटेगरी</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {NOTIFICATION_CONFIG.categories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">लक्ष्यित ग्रुप</label>
                    <select
                      name="targetGroup"
                      value={formData.targetGroup}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {NOTIFICATION_CONFIG.targetGroups.map((tg) => (
                        <option key={tg.id} value={tg.id} className="bg-slate-900 text-white">
                          {tg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">ॲक्शन लिंक / URL (ऐच्छिक)</label>
                  <input
                    type="text"
                    name="actionUrl"
                    value={formData.actionUrl}
                    onChange={handleInputChange}
                    placeholder="उदा. /competitions"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? 'पाठवत आहे...' : <><Send className="w-4 h-4" /> पब्लिश & ब्रॉडकास्ट करा</>}
                </button>
              </form>

              {/* Live Preview */}
              <div className="md:col-span-2 bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-amber-300 mb-3 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-400" /> मोबाईल पूर्वावलोकन
                  </h3>
                  
                  <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3.5 shadow-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <img src="/mrdga-logo.png" alt="Logo" className="w-4 h-4 object-contain" />
                      <span className="text-[9px] font-bold text-amber-400 tracking-wider">MRDGA</span>
                      <span className="text-[9px] text-gray-500 ml-auto">आत्ताच</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      {formData.title || 'नोटीफिकेशन टायटल...'}
                    </h4>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      {formData.body || 'येथे सविस्तर मेसेज दिसेल...'}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 text-center border-t border-white/5 pt-2 mt-4">
                  🎯 Target: {NOTIFICATION_CONFIG.targetGroups.find(t => t.id === formData.targetGroup)?.label}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}