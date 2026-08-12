import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { 
  Phone, MessageSquare, Search, Filter, 
  MapPin, UploadCloud, Lock, FileSpreadsheet, User, BookOpen, Database, Loader2, CheckCircle2, Circle, Send, Check
} from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { authService } from '../services/authService';
import { WHATSAPP_TEMPLATES } from '../utils/whatsappTemplates';

// ⚡ टायपिंग लॅग पूर्ण घालवण्यासाठी सेपरेट रिमार्क कंपोनंट (Isolated Input Component)
const RemarkBox = ({ item, initialRemark, onSave, syncingId, savedId }) => {
  const [val, setVal] = useState(initialRemark || '');

  useEffect(() => {
    setVal(initialRemark || '');
  }, [initialRemark]);

  return (
    <div className="flex items-start gap-1.5 w-full">
      <textarea
        rows="2"
        placeholder="कॉल्स रिमार्क टाका..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans resize-none"
      />
      <button
        type="button"
        onClick={() => onSave(item, val)}
        disabled={syncingId === item.id || !val.trim()}
        title="गूगल शीटमध्ये रिमार्क सेव्ह करा"
        className="p-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-black rounded-lg transition cursor-pointer shrink-0 mt-0.5"
      >
        {syncingId === item.id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : savedId === item.id ? (
          <Check className="w-4 h-4 text-emerald-950 stroke-[3]" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default function MandalDirectory() {
  const [data, setData] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 🚀 २५ टीम्स पेजिनेशन / स्क्रोल लिमिट
  const [visibleCount, setVisibleCount] = useState(25);

  // 🎯 Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedPincode, setSelectedPincode] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [remarkFilter, setRemarkFilter] = useState('ALL');
  
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('MEETING_16AUG');

  const [remarks, setRemarks] = useState({});
  const [syncingRemarkId, setSyncingRemarkId] = useState(null);
  const [savedSuccessId, setSavedSuccessId] = useState(null);

  // 🔐 User Permissions
  const [userRole, setUserRole] = useState('');
  const [userDepartment, setUserDepartment] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setCurrentUserEmail(user.email || '');
        setCurrentUserName(user.displayName || user.email?.split('@')[0] || 'Calling Admin');
        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc) {
            setUserRole(userDoc.role || '');
            setUserDepartment(userDoc.department || 'MRDGA');
          }
        } catch (e) {
          console.error("Role Check Error:", e);
        }
      }
      setLoading(false);
    });

    const fetchDirectoryCache = async () => {
      setFetchingData(true);
      try {
        const docRef = doc(db, 'mandal_directory_cache', 'data_2026');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const cacheData = docSnap.data();
          if (cacheData && Array.isArray(cacheData.teams)) {
            setData(cacheData.teams);
            localStorage.setItem('mrdga_mandal_directory_cache', JSON.stringify(cacheData.teams));
          }
        } else {
          const localData = localStorage.getItem('mrdga_mandal_directory_cache');
          if (localData) setData(JSON.parse(localData));
        }
      } catch (err) {
        console.error("❌ Error fetching directory cache:", err);
        const localData = localStorage.getItem('mrdga_mandal_directory_cache');
        if (localData) setData(JSON.parse(localData));
      } finally {
        setFetchingData(false);
      }
    };

    fetchDirectoryCache();

    const savedRemarks = localStorage.getItem('mrdga_directory_remarks');
    if (savedRemarks) {
      try { setRemarks(JSON.parse(savedRemarks)); } catch (e) {}
    }

    return () => unsubscribe();
  }, []);

  // 📄 Excel Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setUploading(true);
      try {
        const bstr = event.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);

        let addedCount = 0;
        let duplicateCount = 0;

        const existingPhoneSet = new Set(data.map(item => item.phone).filter(Boolean));
        const updatedList = [...data];

        parsedData.forEach((row) => {
          const phone1 = String(
            row['WHATS APP NUMBER'] || 
            row['WHATSAPP NUMBER'] || 
            row['WhatsApp Number'] || 
            row['Phone'] || 
            ''
          ).replace(/[^0-9]/g, '');

          const phone2 = String(
            row['ALTERNATE WHATS APP NUMBER'] || 
            row['ALTERNATE WHATSAPP NUMBER'] || 
            row['Alternate WhatsApp Number'] || 
            ''
          ).replace(/[^0-9]/g, '');

          const teamName = toTitleCase(row['Team Name'] || row['teamName'] || '');

          if (phone1 && existingPhoneSet.has(phone1)) {
            duplicateCount++;
          } else {
            if (phone1) existingPhoneSet.add(phone1);
            addedCount++;

            updatedList.push({
              id: updatedList.length + 1,
              teamName: teamName,
              type: row['TYPE'] || row['type'] || 'Mandal',
              district: toTitleCase(row['DISTRICT'] || row['district'] || ''),
              address: toTitleCase(row['CORRESPONDENCE ADDRESS'] || row['address'] || ''),
              pincode: String(row['PINCODE'] || row['pincode'] || ''),
              phone: phone1,
              alternateNumber: phone2,
              contactPerson: toTitleCase(
                row['CONTACT PERSON NAME'] || 
                row['Contact Person Name'] || 
                ''
              ),
              email: row['Email'] || row['Email Address'] || row['email'] || ''
            });
          }
        });

        const docRef = doc(db, 'mandal_directory_cache', 'data_2026');
        await setDoc(docRef, {
          teams: updatedList,
          totalCount: updatedList.length,
          lastUpdated: serverTimestamp()
        });

        setData(updatedList);
        localStorage.setItem('mrdga_mandal_directory_cache', JSON.stringify(updatedList));

        Swal.fire({
          icon: duplicateCount > 0 ? 'info' : 'success',
          title: 'कॅश डेटाबेस अपडेट झाला!',
          html: `<b>${addedCount}</b> नवीन संघ जोडले गेले.<br/>` + 
                (duplicateCount > 0 ? `<span style="color:#f59e0b">⚠️ <b>${duplicateCount}</b> डुप्लिकेट नंबर वगळले गेले.</span>` : ''),
          background: '#0c0d14',
          color: '#fff'
        });

      } catch (err) {
        console.error("Upload error:", err);
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'डेटाबेस अपडेट झाला नाही.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 🚀 रिमार्क सेव्ह करणे (सबमिट बटणावरच ट्रिगर होईल)
  const saveRemarkToGoogleSheet = async (item, remarkText) => {
    if (!remarkText || !remarkText.trim()) return;

    // Local Storage मध्ये सेव्ह
    const updatedRemarks = { ...remarks, [item.id]: remarkText.trim() };
    setRemarks(updatedRemarks);
    localStorage.setItem('mrdga_directory_remarks', JSON.stringify(updatedRemarks));

    setSyncingRemarkId(item.id);

    try {
      const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwduB8dMvnNqbEZ4rnfSBbZoAZqfN4tp9qBFR_6Gm6ErcOfuMAcftC3A8M17MqIsYO3fw/exec";
      const callerNameInfo = currentUserName ? `${currentUserName} (${currentUserEmail})` : currentUserEmail;

      const rawPayload = {
        action: "UPDATE_REMARK",
        teamName: item.teamName || '',
        phone: item.phone || '',
        remark: remarkText.trim(),
        updatedBy: callerNameInfo || 'Calling Admin'
      };

      const formData = new URLSearchParams();
      Object.keys(rawPayload).forEach(key => formData.append(key, rawPayload[key]));

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      setSavedSuccessId(item.id);
      setTimeout(() => setSavedSuccessId(null), 2000);

    } catch (err) {
      console.error("Remark Sync Error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'रिमार्क सेव्ह झाला नाही.' });
    } finally {
      setSyncingRemarkId(null);
    }
  };

  // 🔍 फिल्टर्स (Memoized - Fast Filtering)
  const districts = useMemo(() => ['ALL', ...new Set(data.map(item => item.district).filter(Boolean))], [data]);
  
  const availablePincodes = useMemo(() => ['ALL', ...new Set(
    data
      .filter(item => selectedDistrict === 'ALL' || item.district === selectedDistrict)
      .map(item => item.pincode)
      .filter(Boolean)
  )], [data, selectedDistrict]);

  const types = useMemo(() => ['ALL', ...new Set(data.map(item => item.type).filter(Boolean))], [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm) ||
        item.alternateNumber.includes(searchTerm);

      const matchesDistrict = selectedDistrict === 'ALL' || item.district === selectedDistrict;
      const matchesPincode = selectedPincode === 'ALL' || item.pincode === selectedPincode;
      const matchesType = selectedType === 'ALL' || item.type.toLowerCase() === selectedType.toLowerCase();

      const hasRemark = Boolean(remarks[item.id] && remarks[item.id].trim() !== '');
      const matchesRemark = 
        remarkFilter === 'ALL' || 
        (remarkFilter === 'WITH_REMARK' && hasRemark) ||
        (remarkFilter === 'WITHOUT_REMARK' && !hasRemark);

      return matchesSearch && matchesDistrict && matchesPincode && matchesType && matchesRemark;
    });
  }, [data, searchTerm, selectedDistrict, selectedPincode, selectedType, remarkFilter, remarks]);

  // ⚡ २५-२५ टीम्सचा डेटा स्क्रोलनुसार दाखवणे (Lazy Load)
  const displayedData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const loadMoreTeams = () => {
    setVisibleCount(prev => prev + 25);
  };

  const hasMrdgaAccess = userDepartment === 'MRDGA' || userDepartment === 'SUPER' || userRole === 'Super Admin';
  const canUploadExcel = userDepartment === 'SUPER' && userRole === 'Super Admin';

  if (!loading && !hasMrdgaAccess) {
    return (
      <div className="p-8 text-center space-y-3 font-sans bg-[#08090d] text-white min-h-screen flex flex-col items-center justify-center">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या डिरेक्टरीचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-slate-400">हे पेज फक्त MRDGA टिमसाठी राखीव आहे.</p>
      </div>
    );
  }

  const activeTemplate = WHATSAPP_TEMPLATES[selectedTemplateKey] || WHATSAPP_TEMPLATES?.GENERAL || {};

  return (
    <div className="min-h-screen bg-[#08090d] text-white p-2 sm:p-6 font-sans space-y-3 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-slate-900 border border-amber-500/30 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5">
              गोविंदा पथक डिरेक्टरी (Mandal Directory)
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono font-bold flex items-center gap-1">
                <Database className="w-2.5 h-2.5"/> Ultra-Fast
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              १८००+ मंडळांची माहिती • कॉलर: <b className="text-amber-400">{currentUserName || currentUserEmail}</b>
            </p>
          </div>
        </div>

        {canUploadExcel ? (
          <label className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg transition shrink-0">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            {uploading ? 'सेव्ह होत आहे...' : 'एक्सेल सेव्ह करा'}
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        ) : (
          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl font-semibold">
            ✓ अधिकृत डिरेक्टरी लिस्ट (Read-Only)
          </span>
        )}
      </div>

      {/* Search & Filters */}
      {data.length > 0 && (
        <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="मंडळ, संपर्क व्यक्ती किंवा नंबरने शोधा..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setVisibleCount(25); // सर्च केल्यास पुन्हा २५ पासून दाखवणे
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value)}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
              >
                {WHATSAPP_TEMPLATES && Object.values(WHATSAPP_TEMPLATES).map(tpl => (
                  <option key={tpl.id} value={tpl.id} className="bg-[#0c0d14] text-white">
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedPincode('ALL');
                  setVisibleCount(25);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-[11px] text-amber-400 font-bold focus:outline-none"
              >
                <option value="ALL" className="bg-[#0c0d14] text-white">सर्व जिल्हे (Districts)</option>
                {districts.filter(d => d !== 'ALL').map(d => (
                  <option key={d} value={d} className="bg-[#0c0d14] text-white">{d}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedPincode}
                onChange={(e) => {
                  setSelectedPincode(e.target.value);
                  setVisibleCount(25);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-[11px] text-white focus:outline-none"
              >
                <option value="ALL" className="bg-[#0c0d14]">सर्व पिनकोड (Pincodes)</option>
                {availablePincodes.filter(p => p !== 'ALL').map(p => (
                  <option key={p} value={p} className="bg-[#0c0d14]">{p}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setVisibleCount(25);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-[11px] text-white focus:outline-none"
              >
                <option value="ALL" className="bg-[#0c0d14]">सर्व गट / प्रकार (Type)</option>
                {types.filter(t => t !== 'ALL').map(t => (
                  <option key={t} value={t} className="bg-[#0c0d14]">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={remarkFilter}
                onChange={(e) => {
                  setRemarkFilter(e.target.value);
                  setVisibleCount(25);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-[11px] text-emerald-400 font-bold focus:outline-none"
              >
                <option value="ALL" className="bg-[#0c0d14] text-white">सर्व कॉल्स (Status)</option>
                <option value="WITH_REMARK" className="bg-[#0c0d14] text-emerald-400">🟢 रिमार्क जोडलेले (Done)</option>
                <option value="WITHOUT_REMARK" className="bg-[#0c0d14] text-rose-400">⚪ प्रलंबित (Pending Call)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {fetchingData ? (
        <div className="p-8 text-center text-amber-400 font-bold text-xs animate-pulse space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
          <p>डेटा लोड होत आहे...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 text-center rounded-2xl space-y-2">
          <UploadCloud className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-xs font-bold text-slate-300">डेटा उपलब्ध नाही.</h3>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
            <span>दाखवलेल्या टीम्स: <b className="text-amber-400">{displayedData.length}</b> / {filteredData.length}</span>
            <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              सक्रिय मेसेज: {activeTemplate?.title || 'General'}
            </span>
          </div>

          {/* 💻 DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-amber-400 font-extrabold uppercase text-[10px]">
                    <th className="p-2.5">अ.क्र.</th>
                    <th className="p-2.5">मंडळाचे नाव & प्रकार</th>
                    <th className="p-2.5">संपर्क व्यक्ती</th>
                    <th className="p-2.5">जिल्हा & पिनकोड</th>
                    <th className="p-2.5 text-center">सुरक्षित कृती (Actions)</th>
                    <th className="p-2.5 w-72">रिमार्क (Call Details)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedData.map((item, idx) => {
                    const hasRemark = Boolean(remarks[item.id] && remarks[item.id].trim() !== '');
                    const msgText = activeTemplate.getMessage ? activeTemplate.getMessage(item.contactPerson, item.teamName) : '';

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                        
                        <td className="p-2.5">
                          <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                            {item.teamName}
                            {hasRemark ? (
                              <span className="p-0.5 text-emerald-400" title="रिमार्क जोडला आहे"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                            ) : (
                              <span className="p-0.5 text-slate-600" title="कॉल प्रलंबित"><Circle className="w-3.5 h-3.5" /></span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {item.type}
                          </span>
                        </td>

                        <td className="p-2.5">
                          <p className="font-semibold text-slate-200">{item.contactPerson || 'संपर्क नाव नाही'}</p>
                        </td>

                        <td className="p-2.5">
                          <span className="text-amber-300 font-bold block">{item.district || 'N/A'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">पिन: {item.pincode || '-'}</span>
                        </td>

                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.phone && (
                              <>
                                <a
                                  href={`https://wa.me/91${item.phone}?text=${msgText}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition"
                                >
                                  <MessageSquare className="w-3 h-3" /> WA 1
                                </a>

                                <a
                                  href={`tel:${item.phone}`}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition"
                                >
                                  <Phone className="w-3 h-3" /> Call 1
                                </a>
                              </>
                            )}

                            {item.alternateNumber && (
                              <>
                                <a
                                  href={`https://wa.me/91${item.alternateNumber}?text=${msgText}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-emerald-950 text-emerald-300 hover:text-white border border-emerald-700/50 font-bold text-[10px] rounded-lg flex items-center gap-1 transition"
                                >
                                  <MessageSquare className="w-3 h-3" /> WA 2
                                </a>

                                <a
                                  href={`tel:${item.alternateNumber}`}
                                  className="px-2 py-1 bg-blue-950 text-blue-300 hover:text-white border border-blue-700/50 font-bold text-[10px] rounded-lg flex items-center gap-1 transition"
                                >
                                  <Phone className="w-3 h-3" /> Call 2
                                </a>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 📝 रिमार्कसाठी मोठी जागा + सेव्ह बटण कंपोनंट */}
                        <td className="p-2.5">
                          <RemarkBox 
                            item={item}
                            initialRemark={remarks[item.id]}
                            onSave={saveRemarkToGoogleSheet}
                            syncingId={syncingRemarkId}
                            savedId={savedSuccessId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📱 MOBILE CARDS VIEW */}
          <div className="grid grid-cols-1 md:hidden gap-2">
            {displayedData.map((item) => {
              const hasRemark = Boolean(remarks[item.id] && remarks[item.id].trim() !== '');
              const msgText = activeTemplate.getMessage ? activeTemplate.getMessage(item.contactPerson, item.teamName) : '';

              return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2 shadow-sm">
                  
                  <div className="flex justify-between items-center gap-1.5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {hasRemark ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <h3 className="font-extrabold text-xs text-white truncate">{item.teamName}</h3>
                    </div>

                    <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
                      {item.district || 'N/A'} {item.pincode ? `(${item.pincode})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{item.contactPerson || 'नाव नाही'}</span>
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.phone && (
                        <>
                          <a
                            href={`https://wa.me/91${item.phone}?text=${msgText}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-2.5 h-2.5" /> WA1
                          </a>

                          <a
                            href={`tel:${item.phone}`}
                            className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded flex items-center gap-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" /> Call1
                          </a>
                        </>
                      )}

                      {item.alternateNumber && (
                        <>
                          <a
                            href={`https://wa.me/91${item.alternateNumber}?text=${msgText}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold text-[10px] rounded flex items-center gap-0.5"
                          >
                            WA2
                          </a>

                          <a
                            href={`tel:${item.alternateNumber}`}
                            className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-700/50 font-bold text-[10px] rounded flex items-center gap-0.5"
                          >
                            Call2
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 📝 मोबाइलवर रिमार्क बॉक्स */}
                  <RemarkBox 
                    item={item}
                    initialRemark={remarks[item.id]}
                    onSave={saveRemarkToGoogleSheet}
                    syncingId={syncingRemarkId}
                    savedId={savedSuccessId}
                  />

                </div>
              );
            })}
          </div>

          {/* 🔽 आणखी २५ टीम्स दाखवण्यासाठी 'Load More' बटण */}
          {displayedData.length < filteredData.length && (
            <div className="text-center pt-2 pb-4">
              <button
                type="button"
                onClick={loadMoreTeams}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                + आणखी २५ पथके पाहा (आत्ता दाखवले: {displayedData.length} / {filteredData.length})
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}