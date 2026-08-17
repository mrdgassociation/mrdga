// ==========================================
// #SECTION 1: IMPORTS & INITIALIZATION
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  User, Mail, Phone, Shield, Printer, FileSpreadsheet, 
  Shirt, RefreshCw, Loader2, PhoneCall, 
  BarChart3, Search, Edit3, X, Save, AlertCircle, Plane,
  Filter, Calendar, Trophy, Sparkles, MapPin, Heart
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UserProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fetchingWork, setFetchingWork] = useState(false);

  // 🎯 २ मुख्य टॅब्स ('PROFILE' | 'WORK_REPORTS')
  const [activeMainTab, setActiveMainTab] = useState('PROFILE');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 🎯 इव्हेंट फिल्टर स्टेट ('ALL' | '16AUG_EVENT' | 'COMPETITION_2026')
  const [selectedEventFilter, setSelectedEventFilter] = useState('ALL');
  const [workSearchTerm, setWorkSearchTerm] = useState('');

  // 🔒 Read-Only Identity (from 'users' collection)
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const [userDesignation, setUserDesignation] = useState('Member');
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');

  // 📝 Personal & Apparel Kit Profile (from 'member_profiles')
  const [profileData, setProfileData] = useState({
    phone: '',
    whatsappNumber: '',
    emergencyContact: '',
    bloodGroup: '',
    dob: '',
    address: '',
    district: '',
    pincode: '',
    passportNumber: '',
    passportExpiry: '',
    tshirtSize: '',
    trackPantSize: '',
    shoeSize: ''
  });

  const [editFormData, setEditFormData] = useState({ ...profileData });

  // 📊 २ स्वतंत्र इव्हेंट्सचा कामाचा डेटा
  const [augustEventRemarks, setAugustEventRemarks] = useState([]); // Event 1 (Google Sheet)
  const [competitionRemarks, setCompetitionRemarks] = useState([]); // Event 2 (Firestore teams -> comments)

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // ==========================================
  // #SECTION 2: DATA FETCHING (2 Events Combined)
  // ==========================================
  const loadUserProfileAndWork = async (user) => {
    setLoading(true);
    const cleanEmail = user.email.toLowerCase().trim();
    const displayName = user.displayName || cleanEmail.split('@')[0];
    const googlePhoto = user.photoURL || '';

    try {
      setUserEmail(cleanEmail);
      setUserPhoto(googlePhoto);

      // १. Firestore 'users' मधून पद व रोल लोड करणे
      let loadedFullName = displayName;
      try {
        const userDocRef = doc(db, 'users', cleanEmail);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          loadedFullName = uData.fullName || uData.name || uData.displayName || displayName;
          setUserFullName(loadedFullName);
          setUserDesignation(uData.designation || 'Member');
          setUserRole(uData.role || 'Reviewer');
          setUserDepartment(uData.department || 'MRDGA');
        } else {
          setUserFullName(displayName);
          setUserDesignation('Member');
        }
      } catch (e) {
        setUserFullName(displayName);
      }

      // २. Firestore 'member_profiles' मधून किट व पर्सनल डेटा
      try {
        const profileDocRef = doc(db, 'member_profiles', cleanEmail);
        const profileDocSnap = await getDoc(profileDocRef);

        if (profileDocSnap.exists()) {
          const pData = profileDocSnap.data();
          setProfileData(pData);
          setEditFormData(pData);
        } else {
          const defaultKit = {
            phone: '', whatsappNumber: '', emergencyContact: '',
            bloodGroup: 'B+', dob: '', address: '', district: 'Mumbai City',
            pincode: '', passportNumber: '', passportExpiry: '',
            tshirtSize: 'L (40)', trackPantSize: '34', shoeSize: 'UK 8'
          };
          setProfileData(defaultKit);
          setEditFormData(defaultKit);
        }
      } catch (e) {}

      // ३. दोन्ही इव्हेंट्सचा कामाचा डेटा फेच करणे
      fetchBothEventsWork(cleanEmail, loadedFullName);

    } catch (err) {
      console.error("❌ Profile Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBothEventsWork = async (cleanEmail, displayName) => {
    setFetchingWork(true);
    const emailPrefix = cleanEmail.split('@')[0].toLowerCase();
    const cleanName = (displayName || '').toLowerCase().trim();

    try {
      // -------------------------------------------------------------
      // 🎯 EVENT 1: १६ ऑगस्ट श्रीकृष्ण जन्मोत्सव कॉलिंग (Google Sheet)
      // -------------------------------------------------------------
      try {
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwduB8dMvnNqbEZ4rnfSBbZoAZqfN4tp9qBFR_6Gm6ErcOfuMAcftC3A8M17MqIsYO3fw/exec";
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=GET_REMARKS`);
        const resData = await res.json();
        
        if (resData) {
          const list = resData.rawList || resData.data || resData.list || resData.remarks || (Array.isArray(resData) ? resData : []);
          
          const matchedAug = list.filter(item => {
            const adminField = (
              item['ॲडमिन'] || item.admin || item.updatedBy || item.byEmail || item.user || item.email || ''
            ).toLowerCase().trim();

            return (
              adminField.includes(cleanEmail) ||
              (emailPrefix.length > 2 && adminField.includes(emailPrefix)) ||
              (cleanName && adminField.includes(cleanName))
            );
          }).map(item => ({
            eventId: '16AUG_EVENT',
            eventTitle: '१६ ऑगस्ट श्रीकृष्ण जन्मोत्सव बैठक',
            teamName: item['मंडळाचे नाव'] || item.teamName || item.mandalName || 'अज्ञात मंडळ',
            phone: item['फोन नंबर'] || item.phone || item.mobile || '',
            remark: item['रिमार्क'] || item.remark || item.comment || '-',
            timestamp: item['तारीख व वेळ'] || item.timestamp || item.date || '',
            category: 'निमंत्रण कॉलिंग'
          }));

          setAugustEventRemarks(matchedAug);
        }
      } catch (e) {
        console.warn("Event 1 (16 Aug) fetch issue:", e);
      }

      // -------------------------------------------------------------
      // 🎯 EVENT 2: दहीहंडी स्पर्धा २०२६ कॉलिंग (Firestore 'teams' Collection)
      // -------------------------------------------------------------
      try {
        const compSnap = await getDocs(collection(db, 'teams'));
        const compCallings = [];

        compSnap.docs.forEach(docSnap => {
          const t = docSnap.data();
          const comments = t.comments || [];

          // मंडळाचे/संघाचे नाव काढणे (Team Name First)
          const actualMandalName = t.teamName || t.mandalName || t.name || (t.captain?.name ? `${t.captain.name} (पथक)` : docSnap.id);

          // अचूक संपर्क फोन नंबर काढणे (Phone Only)
          const actualPhone = t.captain?.mobile || t.captain?.phone || t.manager?.mobile || t.manager?.phone || t.phone || t.mobile || t.contactNumber || '';

          // या युझरने केलेल्या कमेंट्स / कॉल्स शोधणे
          comments.forEach(c => {
            const cEmail = (c.byEmail || c.email || '').toLowerCase().trim();
            const cName = (c.byName || c.name || '').toLowerCase().trim();

            if (
              cEmail === cleanEmail || 
              cEmail.includes(cleanEmail) || 
              (emailPrefix.length > 2 && cEmail.includes(emailPrefix)) ||
              (cleanName && cName.includes(cleanName))
            ) {
              compCallings.push({
                eventId: 'COMPETITION_2026',
                eventTitle: t.competitionTitle || 'राज्यस्तरीय दहीहंडी स्पर्धा २०२६',
                tournamentId: t.competitionId || docSnap.id,
                teamName: actualMandalName,
                phone: actualPhone,
                remark: c.text || c.comment || c.remark || '-',
                timestamp: c.createdAt || c.timestamp || t.createdAt || '',
                category: t.category ? `गट: ${t.category}` : 'स्पर्धा पडताळणी',
                status: t.status || 'Pending'
              });
            }
          });
        });

        setCompetitionRemarks(compCallings);
      } catch (e) {
        console.warn("Event 2 (Competition) fetch issue:", e);
      }

    } catch (err) {
      console.error("Master Work Fetch Error:", err);
    } finally {
      setFetchingWork(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setCurrentUser(user);
        loadUserProfileAndWork(user);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // #SECTION 3: COMBINED & FILTERED REMARKS
  // ==========================================
  const displayedRemarks = useMemo(() => {
    let combined = [];

    if (selectedEventFilter === 'ALL') {
      combined = [...augustEventRemarks, ...competitionRemarks];
    } else if (selectedEventFilter === '16AUG_EVENT') {
      combined = [...augustEventRemarks];
    } else if (selectedEventFilter === 'COMPETITION_2026') {
      combined = [...competitionRemarks];
    }

    if (!workSearchTerm.trim()) return combined;

    return combined.filter(item => 
      (item.teamName || '').toLowerCase().includes(workSearchTerm.toLowerCase()) || 
      (item.remark || '').toLowerCase().includes(workSearchTerm.toLowerCase()) ||
      (item.phone || '').includes(workSearchTerm)
    );
  }, [selectedEventFilter, augustEventRemarks, competitionRemarks, workSearchTerm]);

  // ==========================================
  // #SECTION 4: SAVE TO 'member_profiles'
  // ==========================================
  const handleSaveProfileModal = async (e) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    setSavingProfile(true);
    try {
      const cleanEmail = currentUser.email.toLowerCase().trim();
      const profileDocRef = doc(db, 'member_profiles', cleanEmail);

      await setDoc(profileDocRef, {
        ...editFormData,
        email: cleanEmail,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setProfileData({ ...editFormData });
      Swal.fire({ 
        icon: 'success', 
        title: 'माहिती सेव्ह झाली!', 
        text: 'आपली किट व वैयक्तिक माहिती सुरक्षितरीत्या अद्ययावत झाली.',
        timer: 1500, 
        showConfirmButton: false, 
        background: '#0f172a', 
        color: '#fff' 
      });
      setIsEditModalOpen(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'माहिती सेव्ह झाली नाही.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // 🖨️ Print Work Report (Event Contextual)
  const handlePrintWorkReport = () => {
    const originalTitle = document.title;
    const today = new Date().toISOString().slice(0, 10);
    const eventName = selectedEventFilter === '16AUG_EVENT' ? '16Aug_Event' : selectedEventFilter === 'COMPETITION_2026' ? 'Competition_2026' : 'All_Events';
    document.title = `MRDGA_Work_Report_${userFullName}_${eventName}_${today}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  // 📥 Excel Export (Clean Headers & Values)
  const handleExportCallingExcel = () => {
    if (displayedRemarks.length === 0) return;

    const exportData = displayedRemarks.map((item, idx) => ({
      "अ.क्र.": idx + 1,
      "इव्हेंट मोहीम": item.eventTitle || '',
      "मंडळाचे नाव": item.teamName || '',
      "फोन नंबर": item.phone ? String(item.phone) : '-',
      "गट / तपशील": item.category || '',
      "नोंदवलेला रिमार्क": item.remark || '',
      "तारीख": item.timestamp ? String(item.timestamp).split('T')[0] : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calling_Report");
    XLSX.writeFile(wb, `MRDGA_Calling_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const isKitComplete = profileData.tshirtSize && profileData.trackPantSize && profileData.shoeSize;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium text-xs animate-pulse space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-400" />
        <p>सदस्य प्रोफाईल लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full px-2 sm:px-4 py-3 font-sans text-slate-200">
      
      {/* 🖨️ PRINT STYLES */}
      <style>{`
        @media print {
          body { background-color: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-area { background: white !important; color: black !important; border: none !important; width: 100% !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { color: black !important; border: 1px solid #333 !important; padding: 6px !important; }
          th { background-color: #f3f4f6 !important; }
        }
      `}</style>

   {/* ========================================== */}
      {/* 👤 १. कॉम्पॅक्ट ओळखपत्र (Sleek Modern Profile Card) */}
      {/* ========================================== */}
      <div className="no-print relative bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-md">
        <div className="flex items-center justify-between gap-3">
          
          {/* डावी बाजू: फोटो + माहिती */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {userPhoto ? (
                <img 
                  src={userPhoto} 
                  alt={userFullName} 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-amber-400/40 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-lg">
                  {(userFullName || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-white truncate leading-tight">
                  {userFullName}
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                  ⭐ {userDesignation}
                </span>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                  {userRole}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{userEmail}</span>
              </p>

              {profileData.phone && (
                <p className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{profileData.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* उजवी बाजू: कॉम्पॅक्ट ॲक्शन बटन्स (Compact Sleek Icons) */}
          <div className="flex items-center gap-1.5 shrink-0 self-center">
            {activeMainTab === 'PROFILE' ? (
              <button
                type="button"
                onClick={() => { setEditFormData({ ...profileData }); setIsEditModalOpen(true); }}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 font-bold rounded-xl text-[11px] flex items-center gap-1 transition cursor-pointer shadow-sm"
                title="माहिती अपडेट करा"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">माहिती अपडेट</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrintWorkReport}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 rounded-xl text-[11px] flex items-center gap-1 transition shadow-sm cursor-pointer"
                title="अधिकृत कार्य अहवाल प्रिंट"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">प्रिंट</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadUserProfileAndWork(currentUser)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition cursor-pointer"
              title="डेटा रिफ्रेश करा"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingWork ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 🔘 २. मुख्य २ टॅब्स (Modern Segment Control)*/}
      {/* ========================================== */}
      <div className="no-print flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-bold gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveMainTab('PROFILE')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'PROFILE'
              ? 'bg-slate-800 text-amber-300 shadow-md border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>१. सदस्य ओळख & इव्हेंट किट</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('WORK_REPORTS')}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'WORK_REPORTS'
              ? 'bg-slate-800 text-amber-300 shadow-md border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>२. माझे कार्य अहवाल ({augustEventRemarks.length + competitionRemarks.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 👤 टॅब १: सदस्य ओळख & इव्हेंट किट (MODERN DOSSIER VIEW)                     */}
      {/* ========================================================================= */}
      {activeMainTab === 'PROFILE' && (
        <div className="no-print space-y-4">
          
          {!isKitComplete && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2.5 text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>आपली इव्हेंट किट साइज (टी-शर्ट/ट्रॅक/शूज) पूर्ण भरलेली नाही.</span>
              </div>
              <button
                onClick={() => { setEditFormData({ ...profileData }); setIsEditModalOpen(true); }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl shrink-0 text-xs transition cursor-pointer"
              >
                आता भरा
              </button>
            </div>
          )}

          {/* 👕 अ. असोसिएशन किट साइजेस (Bold Big Display Cards) */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  असोसिएशन इव्हेंट किट साइजेस (Apparel Kit)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                किट वाटप
              </span>
            </div>

            {/* 🎯 मोठ्या ठळक साइजेस (Desktop Fluid & Mobile Single Row) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
              
              {/* टी-शर्ट */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 hover:border-amber-500/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition group shadow-inner">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shirt className="w-3 h-3 text-amber-400" /> टी-शर्ट
                </span>
                <p className="text-xl sm:text-3xl font-black text-amber-300 font-mono mt-1 tracking-tight">
                  {profileData.tshirtSize ? profileData.tshirtSize.split(' ')[0] : '-'}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {profileData.tshirtSize || 'नोंद नाही'}
                </span>
              </div>

              {/* ट्रॅक पॅन्ट */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 hover:border-slate-600 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition group shadow-inner">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  👖 ट्रॅक कंबर
                </span>
                <p className="text-xl sm:text-3xl font-black text-white font-mono mt-1 tracking-tight">
                  {profileData.trackPantSize || '-'}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {profileData.trackPantSize ? `Size: ${profileData.trackPantSize}` : 'नोंद नाही'}
                </span>
              </div>

              {/* शूज */}
              <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 hover:border-emerald-500/40 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition group shadow-inner">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  👟 शूज (UK)
                </span>
                <p className="text-xl sm:text-3xl font-black text-emerald-300 font-mono mt-1 tracking-tight">
                  {profileData.shoeSize ? profileData.shoeSize.replace('UK ', '') : '-'}
                </p>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {profileData.shoeSize || 'नोंद नाही'}
                </span>
              </div>

            </div>
          </div>

          {/* 📇 ब. वैयक्तिक & संपर्क माहिती (Modern Clean Grid) */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                वैयक्तिक व संपर्क तपशील (Personal Dossier)
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">मोबाईल नंबर</p>
                <p className="text-xs sm:text-sm font-bold text-white font-mono">{profileData.phone || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">व्हॉट्सॲप नंबर</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-300 font-mono">{profileData.whatsappNumber || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">आपत्कालीन संपर्क</p>
                <p className="text-xs sm:text-sm font-bold text-rose-300 font-mono">{profileData.emergencyContact || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">रक्तगट (Blood Group)</p>
                <p className="text-xs sm:text-sm font-black text-amber-300">{profileData.bloodGroup || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">जन्मतारीख</p>
                <p className="text-xs sm:text-sm font-bold text-slate-200">{profileData.dob || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">जिल्हा / विभाग</p>
                <p className="text-xs sm:text-sm font-bold text-slate-200">{profileData.district || '-'}</p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5 col-span-2">
                <p className="text-[10px] text-slate-400 font-medium">घरचा संपूर्ण पत्ता & पिनकोड</p>
                <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                  {profileData.address ? `${profileData.address} (${profileData.pincode || '-'})` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* ✈️ क. पासपोर्ट तपशील */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 rounded-3xl space-y-3 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Plane className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                पासपोर्ट व आंतरराष्ट्रीय दौरे (Passport Info - Optional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">पासपोर्ट नंबर</p>
                <p className="text-xs sm:text-sm font-mono font-bold text-slate-200 uppercase">
                  {profileData.passportNumber || <span className="text-slate-600 font-normal">नोंद नाही</span>}
                </p>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">पासपोर्ट समाप्ती दिनांक (Expiry)</p>
                <p className="text-xs sm:text-sm font-mono text-slate-200">
                  {profileData.passportExpiry || <span className="text-slate-600">नोंद नाही</span>}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 टॅब २: माझे कार्य अहवाल & कामगिरी (TAB 2: FULL-WIDTH WORK REPORTS)      */}
      {/* ========================================================================= */}
      {activeMainTab === 'WORK_REPORTS' && (
        <div className="no-print space-y-4">
          
          {/* 🔘 इव्हेंट निवड फिल्टर बार */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <span className="text-xs font-bold text-slate-300 shrink-0">इव्हेंट निवडा:</span>
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none"
              >
                <option value="ALL">सर्व इव्हेंट्स एकत्र ({augustEventRemarks.length + competitionRemarks.length})</option>
                <option value="16AUG_EVENT">१. श्रीकृष्ण जन्मोत्सव बैठक ({augustEventRemarks.length})</option>
                <option value="COMPETITION_2026">२. राज्यस्तरीय दहीहंडी स्पर्धा २०२६ ({competitionRemarks.length})</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono self-end sm:self-auto">
              एकूण नोंदी: <b className="text-white text-sm">{displayedRemarks.length}</b>
            </div>
          </div>

          {/* 📈 इव्हेंटनुसार समरी कार्ड्स */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center shadow-sm">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">१६ ऑगस्ट बैठक कॉल्स</p>
              <p className="text-base sm:text-2xl font-black text-amber-300 font-mono mt-1">{augustEventRemarks.length}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center shadow-sm">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">दहीहंडी स्पर्धा कॉल्स</p>
              <p className="text-base sm:text-2xl font-black text-slate-200 font-mono mt-1">{competitionRemarks.length}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center shadow-sm col-span-2 md:col-span-1">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">एकूण संपर्क नोंदी</p>
              <p className="text-base sm:text-2xl font-black text-emerald-300 font-mono mt-1">
                {augustEventRemarks.length + competitionRemarks.length}
              </p>
            </div>
          </div>

{/* 📞 कॉलिंग नोंदी व रिमार्क्स विभाग (Mobile Cards + Desktop Table) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg space-y-3 p-3.5 sm:p-4">
            
            {/* 🔍 हेडर, सर्च आणि एक्सपोर्ट */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  {selectedEventFilter === '16AUG_EVENT' ? '१६ ऑगस्ट बैठक आमंत्रण नोंदी' : 
                   selectedEventFilter === 'COMPETITION_2026' ? 'दहीहंडी स्पर्धा पडताळणी कॉल्स' : 'सर्व संपर्क नोंदी व रिमार्क्स'} 
                  <span className="text-amber-400 ml-1">({displayedRemarks.length})</span>
                </h3>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="मंडळ, फोन किंवा रिमार्कने शोधा..."
                    value={workSearchTerm}
                    onChange={(e) => setWorkSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportCallingExcel}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shrink-0 shadow-sm"
                  title="Excel एक्सपोर्ट"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
                </button>
              </div>
            </div>

            {displayedRemarks.length === 0 ? (
              <p className="p-8 text-center text-slate-500 text-xs italic">
                या इव्हेंटमध्ये आपल्या खात्यावरून ({userEmail}) कोणताही कॉलिंग डेटा सापडला नाही.
              </p>
            ) : (
              <>
                {/* ========================================================= */}
                {/* 📱 १. मोबाईल कार्ड व्ह्यू (Mobile Only Cards: block md:hidden) */}
                {/* ========================================================= */}
                <div className="block md:hidden space-y-2.5">
                  {displayedRemarks.map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 space-y-2 shadow-sm relative overflow-hidden"
                    >
                      {/* वरची ओळ: अ.क्र., इव्हेंट टॅग आणि तारीख */}
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-[9px]">
                            {idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-bold font-mono ${
                            item.eventId === '16AUG_EVENT' 
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {item.eventId === '16AUG_EVENT' ? '१६ ऑगस्ट बैठक' : 'दहीहंडी स्पर्धा'}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">
                          {item.timestamp ? String(item.timestamp).split('T')[0] : '-'}
                        </span>
                      </div>

                      {/* मधली ओळ: मंडळाचे नाव आणि क्विक कॉलिंग बटन्स */}
                      <div className="flex justify-between items-start gap-2 pt-0.5">
                        <div>
                          <h4 className="font-bold text-xs text-white leading-tight">
                            {toTitleCase(item.teamName)}
                          </h4>
                          {item.phone && (
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                              📞 {item.phone}
                            </p>
                          )}
                        </div>

                        {/* मोबाईलवर थेट कॉल / व्हॉट्सॲप बटन्स */}
                        {item.phone && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`https://wa.me/91${item.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition"
                              title="WhatsApp"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${item.phone}`}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition"
                              title="कॉल करा"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* खालची ओळ: नोंदवलेला रिमार्क बॉक्स */}
                      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-xs">
                        <p className="text-[10px] text-slate-400 font-semibold mb-0.5">नोंदवलेला रिमार्क:</p>
                        <p className="text-emerald-300 text-xs italic font-medium leading-relaxed">
                          "{item.remark}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ========================================================= */}
                {/* 🖥️ २. डेस्कटॉप टेबल व्ह्यू (Desktop Only Table: hidden md:block)*/}
                {/* ========================================================= */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-3 text-center">अ.क्र.</th>
                        <th className="p-3">इव्हेंट मोहीम</th>
                        <th className="p-3">मंडळ / संघ</th>
                        <th className="p-3">नोंदवलेला रिमार्क / अपडेट</th>
                        <th className="p-3 text-center">तारीख</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-sans">
                      {displayedRemarks.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono ${
                              item.eventId === '16AUG_EVENT' 
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' 
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {item.eventId === '16AUG_EVENT' ? '१६ ऑगस्ट' : 'दहीहंडी स्पर्धा'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {toTitleCase(item.teamName)}
                            {item.phone && <span className="block text-[10px] font-mono text-slate-400 font-normal">{item.phone}</span>}
                          </td>
                          <td className="p-3 text-emerald-300/90 text-[11px] italic">
                            "{item.remark}"
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-slate-400">
                            {item.timestamp ? String(item.timestamp).split('T')[0] : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ✏️ ३. माहिती अपडेट करण्याचा POPUP MODAL                                    */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl flex flex-col p-4 sm:p-6 space-y-4 text-white">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  वैयक्तिक माहिती & किट साइज अपडेट करा
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="space-y-4 text-xs">
              
              {/* किट साइज विभाग */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5" /> असोसिएशन इव्हेंट किट साइजेस
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">टी-शर्ट साइज *</label>
                    <select
                      value={editFormData.tshirtSize}
                      onChange={(e) => setEditFormData({ ...editFormData, tshirtSize: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none font-bold"
                    >
                      <option value="">निवडा...</option>
                      <option value="M (38)">M (38)</option>
                      <option value="L (40)">L (40)</option>
                      <option value="XL (42)">XL (42)</option>
                      <option value="XXL (44)">XXL (44)</option>
                      <option value="3XL (46)">3XL (46)</option>
                      <option value="4XL (48)">4XL (48)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">ट्रॅक पॅन्ट कंबर *</label>
                    <select
                      value={editFormData.trackPantSize}
                      onChange={(e) => setEditFormData({ ...editFormData, trackPantSize: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none font-bold"
                    >
                      <option value="">निवडा...</option>
                      <option value="28">28</option>
                      <option value="30">30</option>
                      <option value="32">32</option>
                      <option value="34">34</option>
                      <option value="36">36</option>
                      <option value="38">38</option>
                      <option value="40">40</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">शूज साइज (UK) *</label>
                    <select
                      value={editFormData.shoeSize}
                      onChange={(e) => setEditFormData({ ...editFormData, shoeSize: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none font-bold"
                    >
                      <option value="">निवडा...</option>
                      <option value="UK 6">UK 6</option>
                      <option value="UK 7">UK 7</option>
                      <option value="UK 8">UK 8</option>
                      <option value="UK 9">UK 9</option>
                      <option value="UK 10">UK 10</option>
                      <option value="UK 11">UK 11</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* संपर्क माहिती */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <p className="font-bold text-slate-200">संपर्क & वैयक्तिक माहिती</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">मोबाईल नंबर *</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="9820xxxxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">व्हॉट्सॲप नंबर</label>
                    <input
                      type="tel"
                      value={editFormData.whatsappNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, whatsappNumber: e.target.value })}
                      placeholder="9820xxxxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">आपत्कालीन संपर्क (Emergency)</label>
                    <input
                      type="tel"
                      value={editFormData.emergencyContact}
                      onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                      placeholder="कुटुंबातील व्यक्तीचा नंबर"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">रक्तगट (Blood Group)</label>
                    <select
                      value={editFormData.bloodGroup}
                      onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">जन्मतारीख</label>
                    <input
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">जिल्हा / विभाग</label>
                    <input
                      type="text"
                      value={editFormData.district}
                      onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                      placeholder="उदा. Mumbai City, Thane"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-semibold">घरचा संपूर्ण पत्ता</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="घर क्र., इमारत, रस्ता, विभाग..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none mb-2"
                  />
                  <input
                    type="text"
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    placeholder="पिनकोड (4000xx)"
                    className="w-full sm:w-48 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* पासपोर्ट माहिती */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <p className="font-bold text-slate-200">पासपोर्ट तपशील (Optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">पासपोर्ट नंबर</label>
                    <input
                      type="text"
                      value={editFormData.passportNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, passportNumber: e.target.value.toUpperCase() })}
                      placeholder="उदा. Z1234567"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1 font-semibold">पासपोर्ट समाप्ती दिनांक</label>
                    <input
                      type="date"
                      value={editFormData.passportExpiry}
                      onChange={(e) => setEditFormData({ ...editFormData, passportExpiry: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* मोडल ॲक्शन बटन्स */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>माहिती सेव्ह करा</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🖨️ अधिकृत A4 कार्य अहवाल प्रिंट लेआउट (PRINT VIEW ONLY)                    */}
      {/* ========================================================================= */}
      <div className="hidden print:block print-area text-black p-4">
        <div className="text-center pb-3 border-b-2 border-black">
          <h1 className="text-base font-black uppercase tracking-wider">
            MAHARASHTRA RAJYA DAHIHANDI GOVINDA ASSOCIATION (MRDGA)
          </h1>
          <h2 className="text-xs font-bold mt-0.5">
            📋 अधिकृत कार्यकर्ता कार्य अहवाल ({selectedEventFilter === '16AUG_EVENT' ? '१६ ऑगस्ट श्रीकृष्ण जन्मोत्सव बैठक' : selectedEventFilter === 'COMPETITION_2026' ? 'राज्यस्तरीय दहीहंडी स्पर्धा २०२६' : 'सर्व इव्हेंट्स एकत्रित'})
          </h2>
          <p className="text-[10px] text-gray-600 mt-0.5">
            अहवाल दिनांक: {new Date().toLocaleDateString('mr-IN')}
          </p>
        </div>

        {/* अधिकारी ओळख माहिती */}
        <div className="grid grid-cols-2 gap-3 py-3 border-b border-gray-400 text-xs">
          <div>
            <p>कार्यकर्त्याचे नाव: <b>{userFullName}</b></p>
            <p>ईमेल आयडी: <b>{userEmail}</b></p>
            <p>मोबाईल: <b>{profileData.phone || '-'}</b></p>
          </div>
          <div>
            <p>MRDGA संघटना पद: <b>{userDesignation}</b></p>
            <p>विभाग / रोल: <b>{userDepartment} ({userRole})</b></p>
            <p>एकूण कॉलिंग नोंदी: <b>{displayedRemarks.length} पथके/संघ</b></p>
          </div>
        </div>

        {/* कॉलिंग टेबल */}
        {displayedRemarks.length > 0 && (
          <div className="pt-3">
            <h3 className="font-bold text-xs mb-1">संपर्क केलेली मंडळे & रिमार्क्स (Calling Logs):</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border border-black text-center">अ.क्र.</th>
                  <th className="p-1 border border-black">इव्हेंट मोहीम</th>
                  <th className="p-1 border border-black">मंडळ / संघ</th>
                  <th className="p-1 border border-black">फोन नंबर</th>
                  <th className="p-1 border border-black">नोंदवलेला रिमार्क</th>
                  <th className="p-1 border border-black text-center">तारीख</th>
                </tr>
              </thead>
              <tbody>
                {displayedRemarks.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-1 border border-black text-center font-mono">{idx + 1}</td>
                    <td className="p-1 border border-black text-[10px]">{item.eventId === '16AUG_EVENT' ? '१६ ऑगस्ट' : 'दहीहंडी स्पर्धा'}</td>
                    <td className="p-1 border border-black font-semibold">{toTitleCase(item.teamName)}</td>
                    <td className="p-1 border border-black font-mono">{item.phone || '-'}</td>
                    <td className="p-1 border border-black italic">{item.remark}</td>
                    <td className="p-1 border border-black text-center font-mono text-[10px]">
                      {item.timestamp ? String(item.timestamp).split('T')[0] : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* स्वाक्षरी ब्लॉक */}
        <div className="mt-12 flex justify-between items-end text-xs font-bold pt-6">
          <div>
            <p>दिनांक: {new Date().toLocaleDateString('mr-IN')}</p>
            <p className="text-[10px] text-gray-500 font-normal">MRDGA अधिकृत पोर्टल प्रणाली</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-b border-black mb-1"></div>
            <p>सादरकर्ता स्वाक्षरी</p>
            <p className="text-[10px] text-gray-600 font-normal">({userFullName} - {userDesignation})</p>
          </div>
        </div>

      </div>

    </div>
  );
}