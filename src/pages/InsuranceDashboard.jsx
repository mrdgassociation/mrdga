import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService'; // 🔔 Notification Integration
import Swal from 'sweetalert2';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Phone, 
  MessageSquare, FileText, CheckCircle, XCircle, Clock, X, Lock, ExternalLink,
  MapPin, Users, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, UploadCloud, Loader2
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

// ==========================================
// 📌 SECTION 1: CONSTANTS & PRE-DEFINED DATA
// ==========================================
const PREDEFINED_REJECT_REASONS = [
  "१. मंडळाच्या लेटरहेडवर नावाची नोंद नाही (No Mandal Name on List)",
  "२. चुकीची फाईल / भलताच दस्तऐवज अपलोड केला आहे (Uploaded Wrong Document)",
  "३. गोविंदांची यादी अपलोड केलेली नाही / रिकामी फाईल (No List Added / Only Letterhead)",
  "४. फाईल उघडत नाही किंवा करप्ट आहे (PDF File Not Opening / Corrupted)",
  "५. फाईलला पासवर्ड लॉक आहे (PDF Protected / Asking for Password)",
  "६. यादीतील मजकूर / फोटो अस्पष्ट आहे (List Is Not Visible / Blur)",
  "७. गोविंदांचे पूर्ण नाव (आडनाव) किंवा वय दिलेले नाही (No Surname / Age Missing)",
  "८. लेटरहेडवर अध्यक्षांची सही किंवा मंडळाचा शिक्का नाही (No Sign / Stamp)",
  "९. गोविंदा यादीत १४ वर्षांखालील मुलांचा समावेश आहे (Under 14 Years Found)",
  "१०. या मंडळाची आधीच नोंदणी झाली आहे [Duplicate Entry] (दुबार नोंदणी)",
  "इतर कारण (कस्टम टाईप करा)"
];

export default function InsuranceDashboard() {

  // ==========================================
  // 📌 SECTION 2: COMPONENT STATES
  // ==========================================
  const [requests, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Review / Approve Modal States
  const [selectedReq, setSelectedReq] = useState(null);
  const [policyNo, setPolicyNo] = useState('');
  const [policyCopyFile, setPolicyCopyFile] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reject Modal States
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [duplicateRefId, setDuplicateRefId] = useState('');

  // PDF Viewer Modal & Zoom States
  const [viewPdfUrl, setViewPdfUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // User Profile States
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // ==========================================
  // 📌 SECTION 3: DATA FETCHING & AUTH LIFECYCLE
  // ==========================================
  const loadInsuranceRequests = async () => {
    console.log("🔍 [LOG]: Fetching insurance requests from Firestore collection 'insurance_requests_2026'...");
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "insurance_requests_2026"));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ [LOG]: Successfully loaded ${list.length} insurance records.`);
      setInsurances(list || []);
    } catch (err) {
      console.error("❌ [ERROR]: Error fetching insurance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🚀 [LOG]: Subscribing to Auth State Listener...");
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        console.log("👤 [LOG]: Current Admin Email:", user.email);
        setUserEmail(user.email || '');
        setUserName(user.displayName || user.email.split('@')[0]);
        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc) {
            console.log("🔑 [LOG]: Fetched Role/Dept:", userDoc.role, userDoc.department);
            if (userDoc.role) setUserRole(userDoc.role);
            if (userDoc.department) setUserDepartment(userDoc.department);
          }
        } catch (e) {
          console.error("❌ [ERROR]: Role fetch error:", e);
        }
        loadInsuranceRequests();
      } else {
        console.warn("⚠️ [LOG]: No authenticated admin found. Stopping loader.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const hasInsuranceAccess = userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'INSURANCE' || userDepartment === 'MRDGA';

  // ==========================================
  // 📌 SECTION 4: HELPER FUNCTIONS (PDF & ZOOM)
  // ==========================================
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 75));
  const handleResetZoom = () => setZoomLevel(100);

  const convertFileToBase64 = async (file) => {
    console.log(`🗜️ [LOG]: Converting/Compressing PDF file '${file.name}' (${file.size} bytes)...`);
    const TWO_MB_BYTES = 2 * 1024 * 1024;
    if (file.size <= TWO_MB_BYTES) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
      });
    }

    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
        const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(compressedBlob);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
      } catch (pdfErr) {
        console.warn("⚠️ [LOG]: PDF Compression failed, using original file base64.", pdfErr);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
      }
    }
  };

  // Status Badge Display Mapping
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'मंजूर':
      case 'मंजूर (Approved)':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/30">मंजूर (Approved)</span>;
      case 'Rejected':
      case 'नामंजूर':
      case 'नामंजूर (Rejected)':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-rose-500/10 text-rose-400 border-rose-500/30">नामंजूर (Rejected)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/30">प्रलंबित (Pending)</span>;
    }
  };

  // ==========================================
  // 📌 SECTION 5: ACTION HANDLERS (REJECT & APPROVE)
  // ==========================================

  // 🛑 REJECT HANDLER (Clean DB Status: 'Rejected')
  const handleConfirmReject = async () => {
    if (!rejectModalReq) return;

    let finalReason = selectedReason === "इतर कारण (कस्टम टाईप करा)" 
      ? customReason.trim() 
      : selectedReason;

    if (selectedReason.includes("Duplicate Entry") && duplicateRefId.trim()) {
      finalReason += ` [मूळ अर्ज ID: ${duplicateRefId.trim()}]`;
    }

    if (!finalReason) {
      Swal.fire({ icon: 'warning', title: 'नाकारण्याचे कारण निवडा किंवा टाका!', confirmButtonColor: '#f59e0b', background: '#0c0d14', color: '#fff' });
      return;
    }

    console.log(`🛑 [LOG]: Rejecting Application ID '${rejectModalReq.appId}' for reason: '${finalReason}'`);
    setSubmitting(true);

    try {
      const docRef = doc(db, "insurance_requests_2026", rejectModalReq.id);
      
      // 🗄️ Save Clean Status 'Rejected' in DB
      await updateDoc(docRef, {
        status: 'Rejected',
        rejectReason: finalReason,
        comments: arrayUnion({
          id: Date.now().toString(),
          byEmail: userEmail,
          byName: userName,
          role: userRole,
          text: `[नामंजूर कारण]: ${finalReason}`,
          createdAt: new Date().toISOString()
        })
      });

      console.log("✅ [LOG]: Firestore document status updated to 'Rejected'. Triggering notification...");

      // 🔔 TRIGGER FCM & IN-APP NOTIFICATION
      try {
        await notificationService.sendNotification({
          title: "🛑 गोविंदा विमा अर्ज नामंजूर",
          message: `${rejectModalReq.teamName} चा विमा अर्ज नामंजूर झाला आहे. कारण: ${finalReason}. कृपया My Status वर जाऊन सुधारित फाईल अपलोड करा.`,
          category: "REGISTRATION",
          targetGroup: "ALL",
          userEmail: rejectModalReq.email,
          appId: rejectModalReq.appId,
          type: "INSURANCE_REJECTED"
        });
        console.log("🔔 [LOG]: Notification sent successfully!");
      } catch (notifErr) {
        console.error("❌ [ERROR]: Notification trigger failed:", notifErr);
      }

      Swal.fire({
        icon: 'success',
        title: 'अर्ज नाकारण्यात आला व नोटीफिकेशन पाठवले!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setRejectModalReq(null);
      setCustomReason('');
      setDuplicateRefId('');
      setSelectedReason(PREDEFINED_REJECT_REASONS[0]);
      loadInsuranceRequests();

    } catch (err) {
      console.error("❌ [ERROR]: Reject action failed:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्टेटस बदलता आला नाही.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 🟢 APPROVE / UPDATE HANDLER (Clean DB Status: 'Approved' / 'Pending')
  const handleUpdateInsurance = async (rawStatusInput) => {
    if (!selectedReq) return;

    // 🗄️ Convert raw input to Clean DB Strings ('Approved' or 'Pending')
    const cleanStatus = (rawStatusInput.includes('Approved') || rawStatusInput.includes('मंजूर')) 
      ? 'Approved' 
      : 'Pending';

    console.log(`🟢 [LOG]: Updating Insurance Request ID '${selectedReq.appId}' to Clean Status '${cleanStatus}'...`);
    setSubmitting(true);

    try {
      let uploadedCertificateUrl = selectedReq.certificateUrl || '';

      // Upload Policy Certificate PDF if selected
      if (policyCopyFile) {
        console.log("📄 [LOG]: Uploading policy certificate PDF file...");
        const base64File = await convertFileToBase64(policyCopyFile);
        const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: `${selectedReq.teamName}_PolicyCertificate.pdf`,
            fileType: policyCopyFile.type,
            fileData: base64File
          })
        });

        const rawText = await response.text();
        try {
          const resData = JSON.parse(rawText);
          if (resData.status === 'success') {
            uploadedCertificateUrl = resData.fileUrl;
            console.log("✅ [LOG]: Certificate PDF uploaded at:", uploadedCertificateUrl);
          }
        } catch (parseErr) {
          console.warn("⚠️ [LOG]: GAS Response JSON parsing issue:", parseErr);
        }
      }

      const docRef = doc(db, "insurance_requests_2026", selectedReq.id);
      
      const updateData = {
        status: cleanStatus,
        policyNumber: policyNo.trim() || selectedReq.policyNumber || '',
        certificateUrl: uploadedCertificateUrl
      };

      if (newComment.trim()) {
        updateData.comments = arrayUnion({
          id: Date.now().toString(),
          byEmail: userEmail,
          byName: userName,
          role: userRole,
          text: newComment.trim(),
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(docRef, updateData);
      console.log("✅ [LOG]: Firestore document updated successfully.");

      // 🔔 TRIGGER NOTIFICATION ON APPROVAL
      if (cleanStatus === 'Approved') {
        try {
          await notificationService.sendNotification({
            title: "🎉 गोविंदा विमा अर्ज मंजूर!",
            message: `${selectedReq.teamName} चा विमा अर्ज मंजूर झाला आहे. पॉलिसी क्र: ${policyNo.trim() || 'प्रक्रियेत'}.`,
            category: "REGISTRATION",
            targetGroup: "ALL",
            userEmail: selectedReq.email,
            appId: selectedReq.appId,
            type: "INSURANCE_APPROVED"
          });
          console.log("🔔 [LOG]: Approval notification dispatched.");
        } catch (notifErr) {
          console.error("❌ [ERROR]: Approval notification failed:", notifErr);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'विमा अर्ज अद्ययावत झाला!',
        timer: 1200,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setNewComment('');
      setPolicyCopyFile(null);
      setSelectedReq(null);
      loadInsuranceRequests();

    } catch (err) {
      console.error("❌ [ERROR]: Update Insurance action failed:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'डेटा सेव्ह झाला नाही.', background: '#0c0d14', color: '#fff' });
    } finally {
      setSubmitting(false);
    }
  };

  // Security Access Guard Render
  if (!loading && !hasInsuranceAccess) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या डॅशबोर्डचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-gray-400">हे डॅशबोर्ड फक्त विमा व्यवस्थापन टीमसाठी आहे.</p>
      </div>
    );
  }

  // Search and Status Filtering Logic
  const filteredRequests = requests.filter(item => {
    const tName = item.teamName || '';
    const appId = item.appId || '';
    const cPerson = item.contactPerson || '';
    const phone = item.whatsappNumber || '';

    const matchesSearch = tName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          cPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || 
                          item.status === statusFilter || 
                          (statusFilter === 'Pending' && (!item.status || item.status.includes('Pending') || item.status.includes('प्रलंबित'))) ||
                          (statusFilter === 'Approved' && (item.status === 'Approved' || item.status.includes('मंजूर'))) ||
                          (statusFilter === 'Rejected' && (item.status === 'Rejected' || item.status.includes('नामंजूर')));

    return matchesSearch && matchesStatus;
  });

  // ==========================================
  // 📌 SECTION 6: MAIN RENDER (UI & CARDS)
  // ==========================================
  return (
    <div className="space-y-3 max-w-7xl mx-auto px-1 py-1 font-sans">
      
      {/* 🔹 Header Banner */}
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white leading-tight flex items-center gap-1.5">
              गोविंदा विमा <span className="text-amber-400">व्यवस्थापन</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded font-extrabold uppercase">
                {userRole}
              </span>
            </h2>
            <p className="text-[10px] text-gray-400">
              एकूण अर्ज: <b className="text-amber-400 font-bold">{requests.length}</b> 
              {statusFilter !== 'ALL' && ` • फिल्टर केलेले: ${filteredRequests.length}`}
            </p>
          </div>
        </div>

        <button 
          onClick={loadInsuranceRequests} 
          className="p-1.5 sm:px-3 sm:py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">रिफ्रेश</span>
        </button>
      </div>

      {/* 🔹 Search & Filters */}
      <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row gap-2 bg-black/40 border border-slate-800">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="मंडळाचे नाव, App ID किंवा फोन नंबरने शोधा..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-500/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-amber-400/60 shrink-0 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-black/60 border border-amber-500/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50"
          >
            <option value="ALL" className="bg-[#0c0d14]">सर्व अर्ज (Status)</option>
            <option value="Pending" className="bg-[#0c0d14]">प्रलंबित (Pending)</option>
            <option value="Approved" className="bg-[#0c0d14]">मंजूर (Approved)</option>
            <option value="Rejected" className="bg-[#0c0d14]">नाकारलेले (Rejected)</option>
          </select>
        </div>
      </div>

      {/* 📱 CARDS GRID LIST */}
      {loading ? (
        <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">डेटा लोड होत आहे...</p>
      ) : filteredRequests.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणताही विमा अर्ज सापडला नाही.</p>
      ) : (
        <div className="space-y-2.5">
          {filteredRequests.map((item) => (
            <div 
              key={item.id}
              className="glass-panel p-3 rounded-2xl border border-amber-500/20 bg-black/40 hover:border-amber-500/40 transition shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              {/* Left Details */}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    #{item.appId}
                  </span>
                  
                  {getStatusBadge(item.status)}

                  {item.policyNumber && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      पॉलिसी: {item.policyNumber}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-xs sm:text-sm text-white leading-tight">{item.teamName}</h3>

                <div className="flex items-center gap-3 text-[11px] text-gray-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" /> {item.district} ({item.pincode || '-'})
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-amber-400 shrink-0" /> {item.category || 'Mens'}
                  </span>
                  <span className="flex items-center gap-1 text-amber-300 font-bold font-mono">
                    <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" /> {item.govindaCount} गोविंदा ({item.pyramidCapacity})
                  </span>
                </div>
              </div>

              {/* Middle Contact & File Actions */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                <div className="text-left md:text-right pr-2">
                  <p className="text-[10px] text-gray-400">संपर्क व्यक्ती:</p>
                  <p className="font-bold text-xs text-white leading-none">{item.contactPerson}</p>
                  <p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.whatsappNumber}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a 
                    href={`https://wa.me/91${item.whatsappNumber}?text=नमस्कार ${encodeURIComponent(item.contactPerson)}, ${encodeURIComponent(item.teamName)} संदर्भात...`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition"
                    title="WhatsApp मेसेज पाठवा"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>

                  <a 
                    href={`tel:${item.whatsappNumber}`} 
                    className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500 hover:text-white transition"
                    title="मुख्य नंबरवर कॉल करा"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {item.alternateNumber && (
                    <a 
                      href={`tel:${item.alternateNumber}`} 
                      className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition"
                      title="पर्यायी नंबरवर कॉल करा"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {item.fileUrl && (
                    <button 
                      onClick={() => { console.log("👁️ [LOG]: Opening PDF preview for:", item.fileUrl); setViewPdfUrl(item.fileUrl); setZoomLevel(100); }}
                      className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500 hover:text-black transition cursor-pointer" 
                      title="अपलोड केलेली PDF यादी पहा"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Approve/Reject Trigger */}
              <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                <button 
                  onClick={() => { setSelectedReq(item); setPolicyNo(item.policyNumber || ''); }} 
                  className="px-2.5 py-1 bg-slate-800 text-amber-400 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  रिमार्क्स <ChevronRight className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => { setSelectedReq(item); setPolicyNo(item.policyNumber || ''); }} 
                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-500 hover:text-black transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve / Review
                  </button>

                  <button 
                    onClick={() => setRejectModalReq(item)} 
                    className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-500 hover:text-white transition"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          📌 SECTION 7: REJECT REASON MODAL
         ========================================== */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-rose-500/40 rounded-3xl w-full max-w-md p-5 space-y-4 text-white shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> विमा अर्ज नाकारण्याचे कारण
              </h3>
              <button onClick={() => { setRejectModalReq(null); setDuplicateRefId(''); }} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                मंडळ: <strong className="text-white">{rejectModalReq.teamName}</strong> (App ID: <span className="font-mono text-amber-400">{rejectModalReq.appId}</span>)
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">कारण निवडा (Select Reason) *</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {PREDEFINED_REJECT_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason} className="bg-[#0c0d14]">
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason.includes("Duplicate Entry") && (
                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1">
                    पहिल्या मूळ अर्जाचा App ID (Reference ID) टाका *
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. MRDGA-INS-2026-8899"
                    value={duplicateRefId}
                    onChange={(e) => setDuplicateRefId(e.target.value)}
                    className="w-full bg-black border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {selectedReason === "इतर कारण (कस्टम टाईप करा)" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">विशिष्ट कारण टाईप करा *</label>
                  <textarea
                    rows={2}
                    placeholder="उदा. फोटो अस्पष्ट आहे, सही जुळत नाही..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-black border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setRejectModalReq(null); setDuplicateRefId(''); }}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReject}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                {submitting ? 'सबमिट होत आहे...' : 'खात्री करा व Reject करा'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          📌 SECTION 8: APPROVE / REVIEW MODAL
         ========================================== */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto text-white relative shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  #{selectedReq.appId}
                </span>
                <h3 className="text-base font-black text-white mt-1">{selectedReq.teamName}</h3>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-1.5 bg-slate-800 text-gray-400 hover:text-white rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400">संपर्क व्यक्ती</p>
                  <p className="font-bold text-white">{selectedReq.contactPerson}</p>
                  <p className="font-mono text-gray-400">{selectedReq.whatsappNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">पर्यायी नंबर</p>
                  <p className="font-bold text-white">{selectedReq.alternateNumber || '-'}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400">जिल्हा & पिनकोड</p>
                  <p className="font-bold text-white">{selectedReq.district} ({selectedReq.pincode || '-'})</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400">विमा गोविंदा संख्या</p>
                  <p className="font-bold text-amber-400 font-mono">{selectedReq.govindaCount} गोविंदा</p>
                </div>
              </div>

              {/* Policy Number */}
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                <label className="text-[11px] font-bold text-amber-400 block">विमा पॉलिसी / सर्टिफिकेट नंबर (Policy No.):</label>
                <input
                  type="text"
                  placeholder="उदा. POL-2026-987654"
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                  className="w-full bg-black border border-amber-500/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Policy Certificate Upload */}
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                <label className="text-[11px] font-bold text-amber-400 block">विमा प्रमाणपत्र / पॉलिसी कॉपी PDF अपलोड करा (Optional):</label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => setPolicyCopyFile(e.target.files[0])}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black cursor-pointer w-full"
                />
                {selectedReq.certificateUrl && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">
                    ✓ पॉलिसी कॉपी आधीच जोडलेली आहे.
                  </p>
                )}
              </div>

              {/* Officer Remarks */}
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-amber-400 border-b border-slate-800 pb-1">
                  अधिकारी ट्रॅकिंग नोट्स / रिमार्क्स ({selectedReq.comments?.length || 0})
                </p>

                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {selectedReq.comments && selectedReq.comments.length > 0 ? (
                    selectedReq.comments.map((c, i) => (
                      <div key={c.id || i} className="bg-black/60 p-2 rounded-xl border border-white/5 text-[11px]">
                        <div className="flex justify-between items-center text-[9px] text-gray-400">
                          <span className="font-bold text-amber-400">{c.byName} ({c.role})</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('mr-IN') : ''}</span>
                        </div>
                        <p className="text-gray-200 mt-0.5">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">अद्याप कोणताही रिमार्क जोडलेला नाही.</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="उदा. प्रिमियम भरला, पॉलिसी जनरेट झाली..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-black border border-amber-500/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Submit Approval */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleUpdateInsurance('Approved')}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 text-black hover:bg-emerald-400 font-black border border-emerald-500/30 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                  मंजूर करा व नोटीफिकेशन पाठवा
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          📌 SECTION 9: INLINE PDF PREVIEW MODAL
         ========================================== */}
      {viewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header Controls */}
            <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <FileText className="w-4 h-4" /> मंडळाची अपलोड केलेली लेटरहेड PDF यादी
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-black/60 border border-slate-800 rounded-xl px-2 py-1">
                <button onClick={handleZoomOut} title="Zoom Out" className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-amber-400 font-bold px-1 min-w-[45px] text-center">
                  {zoomLevel}%
                </span>
                <button onClick={handleZoomIn} title="Zoom In" className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleResetZoom} title="Reset Zoom" className="p-1 text-slate-400 hover:text-white transition cursor-pointer border-l border-slate-800 ml-1 pl-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Download & Close */}
              <div className="flex items-center gap-2">
                <a href={viewPdfUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 transition">
                  <Download className="w-3.5 h-3.5" /> डाऊनलोड
                </a>
                <button onClick={() => { setViewPdfUrl(null); setZoomLevel(100); }} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF View */}
            <div className="flex-1 bg-slate-950 p-2 overflow-auto relative flex justify-center items-start">
              <div className="w-full h-full transition-transform duration-200 origin-top" style={{ transform: `scale(${zoomLevel / 100})` }}>
                <iframe
                  src={
                    viewPdfUrl.includes('drive.google.com')
                      ? `https://drive.google.com/file/d/${viewPdfUrl.match(/[-\w]{25,}/)?.[0]}/preview`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(viewPdfUrl)}&embedded=true`
                  }
                  title="Insurance Letterhead PDF"
                  className="w-full h-full rounded-xl border border-slate-800"
                />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}