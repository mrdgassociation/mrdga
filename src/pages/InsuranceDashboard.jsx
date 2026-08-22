// ==========================================
// #SECTION 1: IMPORTS & COMPONENT INITIALIZATION
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  ShieldCheck, Search, Filter, RefreshCw, Phone, 
  MessageSquare, FileText, CheckCircle, XCircle, Clock, X, Lock, ExternalLink,
  MapPin, Users, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download, UploadCloud, Loader2, Camera, Eye, Edit3, Printer, PlusCircle, Calendar, Copy, BarChart3, Target, Edit
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

import CertificatePrintModal from '../components/CertificatePrintModal';
import InsuranceDuplicatesTab from '../components/InsuranceDuplicatesTab';
// ⚠️ InsuranceAnalysisWidget चे न वापरलेले इम्पोर्ट काढून टाकले आहे

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

const parseFormattedDate = (createdAtField) => {
  if (!createdAtField) return '';
  try {
    let d;
    if (typeof createdAtField === 'object' && createdAtField.toDate) {
      d = createdAtField.toDate();
    } else {
      d = new Date(createdAtField);
    }
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

export default function InsuranceDashboard() {

  // ==========================================
  // #SECTION 2: STATE MANAGEMENT
  // ==========================================
  const [requests, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎯 TABS STATE
  const [activeTab, setActiveTab] = useState('ALL_REQUESTS');

  // 🎯 Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const [visibleCount, setVisibleCount] = useState(10);

  // Review / Approve Modal States
  const [selectedReq, setSelectedReq] = useState(null);
  const [policyNo, setPolicyNo] = useState('');
  const [editableGovindaCount, setEditableGovindaCount] = useState('');
  const [policyCopyFile, setPolicyCopyFile] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reject Modal States
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [duplicateRefId, setDuplicateRefId] = useState('');

  // Viewer Modal & Zoom States
  const [viewPdfUrl, setViewPdfUrl] = useState(null);
  const [viewPdfTitle, setViewPdfTitle] = useState('मंडळाची अपलोड केलेली लेटरहेड PDF यादी');
  const [zoomLevel, setZoomLevel] = useState(100);

  // 🎯 २ PDF समोरासमोर दाखवण्यासाठी स्टेट
  const [comparePdfs, setComparePdfs] = useState(null);

  // User Profile States
  const [userRole, setUserRole] = useState('Reviewer');
  const [userDepartment, setUserDepartment] = useState('MRDGA');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const [printReqData, setPrintReqData] = useState(null);

  // ==========================================
  // #SECTION 3: API & AUTHENTICATION HANDLERS
  // ==========================================
  const loadInsuranceRequests = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "insurance_requests_2026"));
      let list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 🎯 सिरीयल प्रमाणे सॉर्टिंग (0001, 0002...)
      list.sort((a, b) => {
        const idA = a.appId || "";
        const idB = b.appId || "";
        return idA.localeCompare(idB);
      });

      setInsurances(list || []);
    } catch (err) {
      console.error("❌ [ERROR]: Error fetching insurance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.displayName || user.email.split('@')[0]);
        try {
          const userDoc = await authService.getUserRole(user.email);
          if (userDoc) {
            if (userDoc.role) setUserRole(userDoc.role);
            if (userDoc.department) setUserDepartment(userDoc.department);
          }
        } catch (e) {
          console.error("❌ [ERROR]: Role fetch error:", e);
        }
        loadInsuranceRequests();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const hasInsuranceAccess = userRole === 'Super Admin' || userDepartment === 'SUPER' || userDepartment === 'INSURANCE' || userDepartment === 'MRDGA';

  const canApproveOrReject = 
    userDepartment === 'INSURANCE' || 
    (userDepartment === 'SUPER' && userRole === 'Super Admin') || 
    (userDepartment === 'MRDGA' && userRole === 'Super Admin');

  const isSuperAdminOnly = (userDepartment === 'SUPER' && userRole === 'Super Admin') || (userDepartment === 'MRDGA' && userRole === 'Super Admin') || userRole === 'Super Admin';

  // 🛡️ फक्त सुपर ॲडमिनसाठी App ID एडिट फंक्शन (Zero-Waste Local Update)
  const handleEditAppId = async (item) => {
    if (!isSuperAdminOnly) {
      Swal.fire({ icon: 'error', title: 'अधिकार नाही!', text: 'फक्त Super Admin लाच App ID बदलण्याचा अधिकार आहे.', background: '#0f172a', color: '#fff' });
      return;
    }

    const { value: newAppId } = await Swal.fire({
      title: 'App ID बदला / सुधारा',
      html: `<div style="font-size:12px; color:#cbd5e1; text-align:left; margin-bottom:8px;">मंडळ: <b>${item.teamName}</b><br/>सध्याचा ID: <b style="color:#f59e0b">${item.appId}</b></div>`,
      input: 'text',
      inputValue: item.appId,
      inputPlaceholder: 'उदा. MRDGA-20260821-0005',
      showCancelButton: true,
      confirmButtonText: 'अपडेट करा',
      cancelButtonText: 'रद्द करा',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      background: '#0f172a',
      color: '#fff',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'App ID रिक्त असू शकत नाही!';
        }
      }
    });

    if (newAppId && newAppId.trim() !== item.appId) {
      try {
        const docRef = doc(db, "insurance_requests_2026", item.id);
        const newCommentObj = {
          id: Date.now().toString(),
          byEmail: userEmail,
          byName: userName,
          role: userRole,
          text: `[Super Admin Update]: App ID बदलला (${item.appId} -> ${newAppId.trim()})`,
          createdAt: new Date().toISOString()
        };

        await updateDoc(docRef, {
          appId: newAppId.trim(),
          comments: arrayUnion(newCommentObj)
        });

        // 🎯 ० Reads: स्थानिक स्टेट थेट अपडेट करणे
        setInsurances(prev => prev.map(reqItem => 
          reqItem.id === item.id 
            ? { 
                ...reqItem, 
                appId: newAppId.trim(), 
                comments: [...(reqItem.comments || []), newCommentObj] 
              } 
            : reqItem
        ));

        Swal.fire({
          icon: 'success',
          title: 'App ID यशस्वीरीत्या बदलला!',
          timer: 1500,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#fff'
        });

      } catch (err) {
        console.error("App ID change error:", err);
        Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'App ID अपडेट करता आला नाही.', background: '#0f172a', color: '#fff' });
      }
    }
  };

  // ==========================================
  // #SECTION 4: SUMMARY STATS CALCULATIONS (Zero Extra Reads)
  // ==========================================
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalApprovedGovindas = 0;

    requests.forEach(item => {
      const st = String(item.status || '').toLowerCase();
      const count = Number(item.govindaCount) || 0;

      if (st.includes('approved') || st.includes('मंजूर')) {
        approved++;
        totalApprovedGovindas += count;
      } else if (st.includes('rejected') || st.includes('नामंजूर') || st.includes('नाकार')) {
        rejected++;
      } else {
        pending++;
      }
    });

    return { 
      total: requests.length, 
      pending, 
      approved, 
      rejected, 
      totalApprovedGovindas, 
      target: 160000 
    };
  }, [requests]);

  // ==========================================
  // #SECTION 5: SEARCH & FILTERING LOGIC
  // ==========================================
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
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

      let matchesDate = true;
      if (dateFilter) {
        const itemDateStr = parseFormattedDate(item.createdAt);
        matchesDate = itemDateStr === dateFilter;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [requests, searchTerm, statusFilter, dateFilter]);

  const displayedRequests = useMemo(() => {
    return filteredRequests.slice(0, visibleCount);
  }, [filteredRequests, visibleCount]);

  const loadMoreData = () => {
    setVisibleCount(prev => prev + 10);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 75));
  const handleResetZoom = () => setZoomLevel(100);

  // ==========================================
  // #SECTION 6: FILE PROCESSING HELPERS
  // ==========================================
  const convertFileToBase64 = async (file) => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_DIMENSION = 1600;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              if (width > height) {
                height = Math.round((height * MAX_DIMENSION) / width);
                width = MAX_DIMENSION;
              } else {
                width = Math.round((width * MAX_DIMENSION) / height);
                height = MAX_DIMENSION;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
            resolve(compressedBase64);
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      });
    }

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
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
        });
      }
    }
  };

  const getStatusBadge = (status) => {
    const s = status || '';
    if (s === 'Approved' || s === 'मंजूर' || s.includes('Approved') || s.includes('मंजूर')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 uppercase">
          Approved
        </span>
      );
    }
    if (s === 'Rejected' || s === 'नामंजूर' || s.includes('Rejected') || s.includes('नामंजूर') || s.includes('नाकारलेले')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-rose-950/40 text-rose-300 border border-rose-800/60 uppercase">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide bg-slate-800 text-amber-200/90 border border-slate-700 uppercase">
        Pending
      </span>
    );
  };

  // ==========================================
  // #SECTION 7: REJECT & APPROVE HANDLERS (Zero-Waste Local Updates)
  // ==========================================
  const handleConfirmReject = async () => {
    if (!canApproveOrReject) {
      Swal.fire({ icon: 'error', title: 'अधिकार नाही!', text: 'फक्त विमा विभाग मधील अधिकारीच अर्ज Reject करू शकतात.', confirmButtonColor: '#ef4444', background: '#0f172a', color: '#fff' });
      return;
    }

    if (!rejectModalReq) return;

    let finalReason = selectedReason === "इतर कारण (कस्टम टाईप करा)" 
      ? customReason.trim() 
      : selectedReason;

    if (selectedReason.includes("Duplicate Entry") && duplicateRefId.trim()) {
      finalReason += ` [मूळ अर्ज ID: ${duplicateRefId.trim()}]`;
    }

    if (!finalReason) {
      Swal.fire({ icon: 'warning', title: 'नाकारण्याचे कारण निवडा किंवा टाका!', confirmButtonColor: '#d97706', background: '#0f172a', color: '#fff' });
      return;
    }

    setSubmitting(true);

    try {
      const docRef = doc(db, "insurance_requests_2026", rejectModalReq.id);
      const newCommentObj = {
        id: Date.now().toString(),
        byEmail: userEmail,
        byName: userName,
        role: userRole,
        text: `[नामंजूर कारण]: ${finalReason}`,
        createdAt: new Date().toISOString()
      };

      await updateDoc(docRef, {
        status: 'Rejected',
        rejectReason: finalReason,
        comments: arrayUnion(newCommentObj)
      });

      // 🎯 ० Reads: स्थानिक स्टेट थेट अपडेट
      setInsurances(prev => prev.map(item => 
        item.id === rejectModalReq.id 
          ? { 
              ...item, 
              status: 'Rejected', 
              rejectReason: finalReason,
              comments: [...(item.comments || []), newCommentObj]
            } 
          : item
      ));

      Swal.fire({
        icon: 'success',
        title: 'अर्ज नाकारण्यात आला!',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      setRejectModalReq(null);
      setCustomReason('');
      setDuplicateRefId('');
      setSelectedReason(PREDEFINED_REJECT_REASONS[0]);

    } catch (err) {
      console.error("Reject action failed:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'स्टेटस बदलता आला नाही.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInsurance = async (rawStatusInput) => {
    if (!selectedReq) return;

    const cleanStatus = (rawStatusInput.includes('Approved') || rawStatusInput.includes('मंजूर')) 
      ? 'Approved' 
      : 'Pending';

    if (cleanStatus === 'Approved' && !canApproveOrReject) {
      Swal.fire({ icon: 'error', title: 'अधिकार नाही!', text: 'फक्त विमा विभाग मधील अधिकारीच अर्ज Approve करू शकतात.', confirmButtonColor: '#ef4444', background: '#0f172a', color: '#fff' });
      return;
    }

    const finalPolicyNo = policyNo.trim() || selectedReq.policyNumber || '';
    if (cleanStatus === 'Approved' && !finalPolicyNo) {
      Swal.fire({
        icon: 'warning',
        title: 'पॉलिसी नंबर आवश्यक आहे!',
        text: 'अर्ज मंजूर करण्यासाठी कृपया विमा पॉलिसी / सर्टिफिकेट नंबर टाका.',
        confirmButtonColor: '#d97706',
        background: '#0f172a',
        color: '#fff'
      });
      return;
    }

    setSubmitting(true);

    try {
      let uploadedCertificateUrl = selectedReq.certificateUrl || '';

      if (policyCopyFile) {
        const base64File = await convertFileToBase64(policyCopyFile);
        const gasUrl = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

        const fileExt = policyCopyFile.name.split('.').pop() || 'jpg';
        const customFileName = `${selectedReq.teamName}_Policy_${finalPolicyNo}.${fileExt}`;

        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: customFileName,
            fileType: policyCopyFile.type,
            fileData: base64File,
            uploadType: 'policy_certificate'
          })
        });

        const rawText = await response.text();
        try {
          const resData = JSON.parse(rawText);
          if (resData.status === 'success') {
            uploadedCertificateUrl = resData.fileUrl;
          }
        } catch (parseErr) {
          console.warn("GAS Response JSON parsing issue:", parseErr);
        }
      }

      const docRef = doc(db, "insurance_requests_2026", selectedReq.id);
      
      const updateData = {
        status: cleanStatus,
        policyNumber: finalPolicyNo,
        govindaCount: Number(editableGovindaCount) || selectedReq.govindaCount || 0,
        certificateUrl: uploadedCertificateUrl
      };

      let newCommentObj = null;
      if (newComment.trim()) {
        newCommentObj = {
          id: Date.now().toString(),
          byEmail: userEmail,
          byName: userName,
          role: userRole,
          text: newComment.trim(),
          createdAt: new Date().toISOString()
        };
        updateData.comments = arrayUnion(newCommentObj);
      }

      await updateDoc(docRef, updateData);

      // 🎯 ० Reads: स्थानिक स्टेट थेट अपडेट
      setInsurances(prev => prev.map(item => 
        item.id === selectedReq.id 
          ? { 
              ...item, 
              ...updateData,
              comments: newCommentObj ? [...(item.comments || []), newCommentObj] : item.comments
            } 
          : item
      ));

      Swal.fire({
        icon: 'success',
        title: 'विमा अर्ज अद्ययावत झाला!',
        timer: 1200,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      setNewComment('');
      setPolicyCopyFile(null);
      setSelectedReq(null);

    } catch (err) {
      console.error("Update Insurance action failed:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: 'डेटा सेव्ह झाला नाही.', background: '#0f172a', color: '#fff' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !hasInsuranceAccess) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या डॅशबोर्डचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-slate-400">हे डॅशबोर्ड फक्त विमा व्यवस्थापन टीमसाठी आहे.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto px-1.5 py-1.5 font-sans text-slate-200">
      
      {/* ========================================== */}
      {/* #SECTION 8: SOBER & CLEAN HEADER BANNER   */}
      {/* ========================================== */}
      <div className="flex flex-row items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-2 sm:p-2.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white leading-none flex items-center gap-1.5">
              गोविंदा विमा व्यवस्थापन
              <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded font-mono font-medium uppercase hidden sm:inline-block">
                {userDepartment}
              </span>
            </h2>
          </div>
        </div>

        {/* 📊 सोबर आकडेवारी (1.6 Lakh Target) */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300">
          <div className="flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            <span>उद्दिष्ट: <b className="text-slate-100">1,60,000</b></span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-emerald-300 font-semibold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>मंजूर: {stats.totalApprovedGovindas.toLocaleString('mr-IN')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.open('#/insurance-info?admin_mode=true', '_blank')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[10px] sm:text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">नवीन अर्ज</span> (Testing)
          </button>

          <button 
            onClick={loadInsuranceRequests} 
            className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-xs rounded-lg transition cursor-pointer"
            title="रिफ्रेश"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* #SECTION 9: SOBER TAB NAVIGATION STRIP    */}
      {/* ========================================== */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab('ALL_REQUESTS')}
          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-[11px] sm:text-xs ${
            activeTab === 'ALL_REQUESTS' 
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
          <span>सर्व अर्ज ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DUPLICATES')}
          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-[11px] sm:text-xs ${
            activeTab === 'DUPLICATES' 
              ? 'bg-slate-800 text-rose-300 shadow-sm border border-slate-700 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Copy className="w-3.5 h-3.5 text-rose-400" />
          <span>⚠️ दुबार अर्ज</span>
        </button>

        <button
          onClick={() => setActiveTab('ANALYSIS')}
          className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-[11px] sm:text-xs ${
            activeTab === 'ANALYSIS' 
              ? 'bg-slate-800 text-indigo-300 shadow-sm border border-slate-700 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
          <span>📊 विश्लेषण</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* #SECTION 10: TAB 1 - ALL REQUESTS VIEW     */}
      {/* ========================================== */}
      {activeTab === 'ALL_REQUESTS' && (
        <>
          {/* 📊 SOBER STATS SUMMARY CARDS */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            <div 
              onClick={() => { setStatusFilter('ALL'); setVisibleCount(10); }}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer text-center hidden sm:block ${statusFilter === 'ALL' ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
            >
              <p className="text-[9px] text-slate-400 font-medium uppercase truncate">एकूण अर्ज</p>
              <p className="text-xs sm:text-sm font-bold text-white font-mono">{stats.total}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Pending'); setVisibleCount(10); }}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer text-center ${statusFilter === 'Pending' ? 'bg-slate-800 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
            >
              <p className="text-[9px] text-slate-400 font-medium uppercase truncate">प्रलंबित</p>
              <p className="text-xs sm:text-sm font-bold text-amber-200/90 font-mono">{stats.pending}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Approved'); setVisibleCount(10); }}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer text-center ${statusFilter === 'Approved' ? 'bg-slate-800 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
            >
              <p className="text-[9px] text-slate-400 font-medium uppercase truncate">मंजूर</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-300 font-mono">{stats.approved}</p>
            </div>

            <div 
              onClick={() => { setStatusFilter('Rejected'); setVisibleCount(10); }}
              className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer text-center ${statusFilter === 'Rejected' ? 'bg-slate-800 border-rose-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
            >
              <p className="text-[9px] text-slate-400 font-medium uppercase truncate">नाकारलेले</p>
              <p className="text-xs sm:text-sm font-bold text-rose-300 font-mono">{stats.rejected}</p>
            </div>
          </div>

          {/* 🔍 COMPACT SOBER FILTERS BAR */}
          <div className="p-1.5 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-1.5 bg-slate-900/80 border border-slate-800">
            <div className="sm:col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="नाव, App ID किंवा फोनने शोधा..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 sm:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(10); }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-slate-200 font-medium focus:outline-none"
              >
                <option value="ALL" className="bg-[#0f172a]">सर्व स्टेटस</option>
                <option value="Pending" className="bg-[#0f172a]">प्रलंबित</option>
                <option value="Approved" className="bg-[#0f172a]">मंजूर</option>
                <option value="Rejected" className="bg-[#0f172a]">नाकारलेले</option>
              </select>

              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none z-10" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setVisibleCount(10); }}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-7 pr-1 py-1 text-[11px] text-slate-300 focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="p-6 text-center text-slate-400 font-medium text-xs animate-pulse space-y-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              <p>डेटा लोड होत आहे...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
              कोणताही विमा अर्ज सापडला नाही.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                <span>दाखवलेले अर्ज: <b className="text-slate-200">{displayedRequests.length}</b> / {filteredRequests.length}</span>
              </div>

              {displayedRequests.map((item) => {
                const isApproved = item.status === 'Approved' || item.status === 'मंजूर' || item.status?.includes('मंजूर');
                const hasCertificate = !!item.certificateUrl;
                const mandalAddressText = item.address || item.mandalAddress || '';

                return (
                  <div 
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        
                        {/* 🎯 APP ID + Super Admin Edit Button */}
                        <div className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          <span className="text-[10px] font-mono font-semibold text-slate-300">
                            #{item.appId}
                          </span>
                          {isSuperAdminOnly && (
                            <button
                              type="button"
                              onClick={() => handleEditAppId(item)}
                              className="text-amber-400 hover:text-amber-300 p-0.5 transition cursor-pointer"
                              title="Super Admin: App ID सुधारा / एडिट करा"
                            >
                              <Edit className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        
                        {getStatusBadge(item.status)}

                        {item.policyNumber && (
                          <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700/80">
                            पॉलिसी: {item.policyNumber}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-xs sm:text-sm text-slate-100 leading-snug">
                        {item.teamName}
                      </h3>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap font-sans">
                        <span><MapPin className="w-3 h-3 inline text-slate-500"/> {item.district} ({item.pincode || '-'})</span>
                        {mandalAddressText && (
                          <span className="text-[11px] text-slate-300 font-sans ml-0.5 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            📍 {mandalAddressText}
                          </span>
                        )}
                        <span className="text-slate-300 font-semibold font-mono"><ShieldCheck className="w-3 h-3 inline text-slate-400"/> {item.govindaCount} गोविंदा</span>
                        {item.rejectReason && (
                          <div className="text-[11px] text-rose-300 font-sans mt-0.5 bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-800/60 flex items-start gap-1">
                            <span className="font-bold text-rose-400 shrink-0">कारण:</span>
                            <span className="truncate">{item.rejectReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                      <div className="text-left md:text-right">
                        <p className="font-medium text-xs text-slate-200">{item.contactPerson}</p>
                        <p className="font-mono text-[10px] text-slate-400">{item.whatsappNumber}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a 
                          href={`https://wa.me/91${item.whatsappNumber}?text=नमस्कार ${encodeURIComponent(item.contactPerson)}, ${encodeURIComponent(item.teamName)} संदर्भात...`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                          title="WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        <a 
                          href={`tel:${item.whatsappNumber}`} 
                          className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                          title="कॉल करा"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {item.fileUrl && (
                          <button 
                            onClick={() => { setViewPdfTitle('मंडळाची अपलोड केलेली लेटरहेड PDF यादी'); setViewPdfUrl(item.fileUrl); setZoomLevel(100); }}
                            className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white cursor-pointer" 
                            title="यादी PDF पहा"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-start md:justify-end gap-1.5 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-800/80 w-full md:w-auto">
                      <button 
                        onClick={() => { setSelectedReq(item); setPolicyNo(item.policyNumber || ''); setEditableGovindaCount(item.govindaCount || ''); }} 
                        className="px-2.5 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-medium transition flex items-center gap-0.5 cursor-pointer shrink-0"
                      >
                        रिमार्क्स <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>

                      {isApproved && (
                        <button 
                          onClick={() => setPrintReqData(item)} 
                          className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>प्रिंट</span>
                        </button>
                      )}

                      {isApproved ? (
                        hasCertificate ? (
                          <button 
                            onClick={() => { setViewPdfTitle(`${item.teamName} - जोडलेली पॉलिसी कॉपी`); setViewPdfUrl(item.certificateUrl); setZoomLevel(100); }} 
                            className="px-2.5 py-1 bg-slate-800 text-emerald-300 border border-slate-700 hover:bg-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>पॉलिसी कॉपी</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setSelectedReq(item); setPolicyNo(item.policyNumber || ''); setEditableGovindaCount(item.govindaCount || ''); }} 
                            className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                          >
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            <span>अपलोड पॉलिसी</span>
                          </button>
                        )
                      ) : (
                        canApproveOrReject && (
                          <>
                            <button 
                              onClick={() => { setSelectedReq(item); setPolicyNo(item.policyNumber || ''); setEditableGovindaCount(item.govindaCount || ''); }} 
                              className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Approve
                            </button>

                            <button 
                              onClick={() => setRejectModalReq(item)} 
                              className="px-2.5 py-1 bg-rose-950/40 text-rose-300 border border-rose-800/80 hover:bg-rose-900/60 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" /> Reject
                            </button>
                          </>
                        )
                      )}
                    </div>

                  </div>
                );
              })}

              {displayedRequests.length < filteredRequests.length && (
                <div className="text-center pt-2 pb-3">
                  <button 
                    type="button" 
                    onClick={loadMoreData} 
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs rounded-lg transition cursor-pointer"
                  >
                    + आणखी १० अर्ज पाहा
                  </button>
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* #SECTION 11: TAB 2 - DUPLICATES VIEW       */}
      {/* ========================================== */}
      {activeTab === 'DUPLICATES' && (
        <InsuranceDuplicatesTab 
          requests={requests}
          onTriggerReject={(req) => {
            setRejectModalReq(req);
            setSelectedReason("१०. या मंडळाची आधीच नोंदणी झाली आहे [Duplicate Entry] (दुबार नोंदणी)");
          }}
          onViewPdf={(url, title) => {
            setViewPdfTitle(title || 'यादी PDF');
            setViewPdfUrl(url);
            setZoomLevel(100);
          }}
          onComparePdfs={(compareData) => {
            setComparePdfs(compareData);
          }}
        />
      )}

      {/* ========================================== */}
      {/* #SECTION 12: TAB 3 - ANALYSIS VIEW        */}
      {/* ========================================== */}
      {activeTab === 'ANALYSIS' && (
        <div className="p-8 text-center bg-[#0c0d14] rounded-2xl border border-slate-800 text-slate-400 text-xs">
          📊 विश्लेषण आकडेवारी लवकरच अद्ययावत केली जाईल.
        </div>
      )}

      {/* ========================================== */}
      {/* #SECTION 13: MODALS (PDF, REJECT & APPROVE) */}
      {/* ========================================== */}

      {/* 📄 Side-by-Side Comparison Modal */}
      {comparePdfs && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-sans">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-7xl h-[94vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-white">
                  दुबार यादी पडताळणी (Side-by-Side PDF Comparison)
                </h3>
              </div>

              <button 
                onClick={() => setComparePdfs(null)} 
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1"
              >
                <X className="w-4 h-4" /> बंद करा
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-slate-950 overflow-hidden">
              
              <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    १. {comparePdfs.title1 || 'पहिला अर्ज'}
                  </span>
                  <a 
                    href={comparePdfs.pdf1} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:text-white"
                  >
                    उघडा ↗
                  </a>
                </div>
                <iframe
                  src={
                    comparePdfs.pdf1.includes('drive.google.com')
                      ? `https://drive.google.com/file/d/${comparePdfs.pdf1.match(/[-\w]{25,}/)?.[0]}/preview`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(comparePdfs.pdf1)}&embedded=true`
                  }
                  title="PDF Viewer 1"
                  className="w-full h-full border-0"
                />
              </div>

              <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-rose-300 truncate">
                    २. {comparePdfs.title2 || 'दुसरा दुबार अर्ज'}
                  </span>
                  <a 
                    href={comparePdfs.pdf2} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:text-white"
                  >
                    उघडा ↗
                  </a>
                </div>
                <iframe
                  src={
                    comparePdfs.pdf2.includes('drive.google.com')
                      ? `https://drive.google.com/file/d/${comparePdfs.pdf2.match(/[-\w]{25,}/)?.[0]}/preview`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(comparePdfs.pdf2)}&embedded=true`
                  }
                  title="PDF Viewer 2"
                  className="w-full h-full border-0"
                />
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && canApproveOrReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 text-white shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> विमा अर्ज नाकारण्याचे कारण
              </h3>
              <button onClick={() => { setRejectModalReq(null); setDuplicateRefId(''); }} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-slate-300">
                मंडळ: <strong className="text-white font-bold">{rejectModalReq.teamName}</strong> (App ID: <span className="font-mono text-slate-200">{rejectModalReq.appId}</span>)
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">कारण निवडा (Select Reason) *</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-slate-500"
                >
                  {PREDEFINED_REJECT_REASONS.map((reason, idx) => (
                    <option key={idx} value={reason} className="bg-[#0f172a]">
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason.includes("Duplicate Entry") && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">पहिल्या मूळ अर्जाचा App ID *</label>
                  <input
                    type="text"
                    placeholder="उदा. MRDGA-INS-2026-8899"
                    value={duplicateRefId}
                    onChange={(e) => setDuplicateRefId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              )}

              {selectedReason === "इतर कारण (कस्टम टाईप करा)" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">विशिष्ट कारण टाईप करा *</label>
                  <textarea
                    rows={2}
                    placeholder="उदा. फोटो अस्पष्ट आहे, सही जुळत नाही..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setRejectModalReq(null); setDuplicateRefId(''); }}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReject}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                {submitting ? 'सबमिट होत आहे...' : 'खात्री करा व Reject करा'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Approve / Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto text-white relative shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  #{selectedReq.appId}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedReq.teamName}</h3>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400">संपर्क व्यक्ती</p>
                  <p className="font-semibold text-white">{selectedReq.contactPerson}</p>
                  <p className="font-mono text-slate-400">{selectedReq.whatsappNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">पर्यायी नंबर</p>
                  <p className="font-semibold text-white">{selectedReq.alternateNumber || '-'}</p>
                </div>
                <div className="mt-2 col-span-2">
                  <p className="text-xs text-slate-400">जिल्हा, पिनकोड & पत्ता</p>
                  <p className="font-semibold text-white">{selectedReq.district} ({selectedReq.pincode || '-'})</p>
                  <p className="text-xs text-slate-300 font-sans mt-0.5">{selectedReq.address || selectedReq.mandalAddress || ''}</p>
                </div>
                
                <div className="mt-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 col-span-2">
                  <label className="text-xs font-semibold text-slate-200 block mb-1 flex items-center gap-1">
                    <Edit3 className="w-4 h-4 text-slate-400" /> विमा गोविंदा संख्या (यादीनुसार तपासून सुधारा) *
                  </label>
                  <input
                    type="number"
                    value={editableGovindaCount}
                    onChange={(e) => setEditableGovindaCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono font-bold focus:outline-none focus:border-slate-500"
                    placeholder="उदा. 100"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    * युझरने टाकलेली संख्या: <b>{selectedReq.govindaCount}</b> (यादीत संख्या वेगळी असल्यास इथे बदला).
                  </p>
                </div>
              </div>

              {/* Policy Number */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  विमा पॉलिसी / सर्टिफिकेट नंबर (Policy No.) *
                </label>
                <input
                  type="text"
                  placeholder="उदा. POL-2026-987654"
                  value={policyNo}
                  onChange={(e) => setPolicyNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-slate-500 font-mono"
                  required
                />
              </div>

              {/* Policy Certificate Upload */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  पॉलिसी कॉपी (PDF / Image/Photo) अपलोड करा:
                </label>
                <input 
                  type="file" 
                  accept="application/pdf,image/*"
                  onChange={(e) => setPolicyCopyFile(e.target.files[0])}
                  className="text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 cursor-pointer w-full"
                />
                {selectedReq.certificateUrl && (
                  <p className="text-xs text-emerald-400 font-semibold mt-1">
                    ✓ पॉलिसी कॉपी आधीच जोडलेली आहे. (नवीन निवडल्यास अपडेट होईल)
                  </p>
                )}
              </div>

              {/* Officer Remarks */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-200 border-b border-slate-800 pb-1">
                  अधिकारी ट्रॅकिंग नोट्स / रिमार्क्स ({selectedReq.comments?.length || 0})
                </p>

                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {selectedReq.comments && selectedReq.comments.length > 0 ? (
                    selectedReq.comments.map((c, i) => (
                      <div key={c.id || i} className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-300">{c.byName} ({c.role})</span>
                          <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('mr-IN') : ''}</span>
                        </div>
                        <p className="text-slate-200 mt-0.5">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">अद्याप कोणताही रिमार्क जोडलेला नाही.</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="उदा. प्रिमियम भरला, पॉलिसी जनरेट झाली..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Submit Approval */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                {canApproveOrReject ? (
                  <button 
                    onClick={() => handleUpdateInsurance('Approved')} 
                    disabled={submitting} 
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                    {selectedReq.status === 'Approved' || selectedReq.status === 'मंजूर' ? 'अपडेट करा' : 'मंजूर करा'}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateInsurance('Pending')} 
                    disabled={submitting} 
                    className="flex-1 py-2.5 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                    रिमार्क / पॉलिसी कॉपी अपडेट करा
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Single PDF View Modal */}
      {viewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-slate-300" /> {viewPdfTitle}
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                <button onClick={handleZoomOut} title="Zoom Out" className="p-1 text-slate-300 hover:text-white transition cursor-pointer">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-slate-200 font-bold px-1 min-w-[45px] text-center">
                  {zoomLevel}%
                </span>
                <button onClick={handleZoomIn} title="Zoom In" className="p-1 text-slate-300 hover:text-white transition cursor-pointer">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleResetZoom} title="Reset Zoom" className="p-1 text-slate-400 hover:text-white transition cursor-pointer border-l border-slate-800 ml-1 pl-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a href={viewPdfUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1 transition border border-slate-700">
                  <Download className="w-3.5 h-3.5" /> डाऊनलोड
                </a>
                <button onClick={() => { setViewPdfUrl(null); setZoomLevel(100); }} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-auto relative flex justify-center items-start">
              <div className="w-full h-full transition-transform duration-200 origin-top" style={{ transform: `scale(${zoomLevel / 100})` }}>
                <iframe
                  src={
                    viewPdfUrl.includes('drive.google.com')
                      ? `https://drive.google.com/file/d/${viewPdfUrl.match(/[-\w]{25,}/)?.[0]}/preview`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(viewPdfUrl)}&embedded=true`
                  }
                  title="Policy Document Viewer"
                  className="w-full h-full rounded-xl border border-slate-800"
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Certificate Print Modal */}
      {printReqData && (
        <CertificatePrintModal 
          reqData={printReqData} 
          onClose={() => setPrintReqData(null)} 
        />
      )}

    </div>
  );
}