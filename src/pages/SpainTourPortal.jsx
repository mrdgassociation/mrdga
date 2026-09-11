import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import SpainTourForm from './SpainTourForm';
import { 
  Plane, CheckCircle, Clock, AlertCircle, Phone, Mail, 
  Shirt, Edit, PlusCircle, Loader2, Lock, BellRing, ExternalLink, Download
} from 'lucide-react';

export default function SpainTourPortal({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [applications, setApplications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [fcmEnabled, setFcmEnabled] = useState(false);

  useEffect(() => {
    const verifyUserAccess = async () => {
      if (!currentUser?.email) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const userEmail = currentUser.email.toLowerCase().trim();
        const userDocRef = doc(db, 'users', userEmail);
        const userSnap = await getDoc(userDocRef);

        let allowed = false;
        let superAdminFlag = false;

        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.department === 'SUPER' && uData.role === 'Super Admin') {
            allowed = true;
            superAdminFlag = true;
          } else if (uData.spainTourAccess || uData.department === 'MRDGA' || uData.department === 'SPAIN_MEMBER') {
            allowed = true;
          }
        }

        if (!allowed) {
          const whitelistDocRef = doc(db, 'spain_tour_whitelist', userEmail);
          const whitelistSnap = await getDoc(whitelistDocRef);
          if (whitelistSnap.exists() && whitelistSnap.data().isActive) {
            allowed = true;
            if (whitelistSnap.data().role === 'Super Admin') {
              superAdminFlag = true;
            }
          }
        }

        setHasAccess(allowed);
        setIsSuperAdmin(superAdminFlag);

        if (allowed) {
          await setupFcmToken(userEmail);
          await loadApplications(userEmail, superAdminFlag);
        }

      } catch (err) {
        console.error("Access verification failed:", err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    verifyUserAccess();
  }, [currentUser]);

  const setupFcmToken = async (email) => {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });

      if (token) {
        setFcmEnabled(true);
        const userRef = doc(db, 'users', email);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(userRef, { fcmToken: token });
        }
      }
    } catch (fcmErr) {
      console.warn("FCM registration optional:", fcmErr);
    }
  };

  const loadApplications = async (email, superAdminFlag) => {
    try {
      let q;
      if (superAdminFlag) {
        q = query(collection(db, "spain_tour_applications_2026"));
      } else {
        q = query(
          collection(db, "spain_tour_applications_2026"),
          where("submittedBy", "==", email)
        );
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setApplications(list);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'Documents Pending');
    if (s.includes('Approved') || s.includes('Ready')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-400" /> Documents Approved
        </span>
      );
    }
    if (s.includes('Correction')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/80 flex items-center gap-1 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-400" /> Correction Required
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
        <Clock className="w-3 h-3 text-amber-400" /> Under Review / Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2 font-sans">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span>Loading Spain Tour Portal...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl my-8 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">
          Your account (<b className="text-slate-200">{currentUser?.email}</b>) is not authorized for Spain Tour 2026.
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <SpainTourForm 
        currentUser={currentUser} 
        initialData={editingData}
        isSuperAdmin={isSuperAdmin}
        onComplete={() => {
          setShowForm(false);
          setEditingData(null);
          loadApplications(currentUser?.email, isSuperAdmin);
        }} 
        onCancel={() => {
          setShowForm(false);
          setEditingData(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto font-sans text-slate-200">
      
      {/* 🌟 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
              🇪🇸 Spain Tour 2026
            </span>
            {isSuperAdmin && (
              <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                Super Admin Mode
              </span>
            )}
            {fcmEnabled && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
                <BellRing className="w-3 h-3" /> Notifications Active
              </span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-black text-white">
            Traveler Visa & Registration Portal
          </h1>
          <p className="text-xs text-slate-400">
            View and manage your visa submission, tour kit measurements, and verification status.
          </p>
        </div>

        {(isSuperAdmin || applications.length === 0) && (
          <button
            type="button"
            onClick={() => { setEditingData(null); setShowForm(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Registration</span>
          </button>
        )}
      </div>

      {/* 🌟 2. Application Cards */}
      {applications.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Plane className="w-10 h-10 text-amber-400/60 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Application Submitted Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please submit your passport, employment information, and kit sizes for visa processing.
          </p>
          <button
            type="button"
            onClick={() => { setEditingData(null); setShowForm(true); }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition cursor-pointer shadow-lg"
          >
            Start Registration (Apply Now)
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {isSuperAdmin && (
            <p className="text-xs text-slate-400 px-1 font-mono">
              Total Applications: <b className="text-white">{applications.length}</b> (Super Admin View)
            </p>
          )}

          {applications.map((app) => (
            <div 
              key={app.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition"
            >
              {/* Header: Name, ID, Passport, Edit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                      {app.fullNameAsPassport}
                    </h2>
                    <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded font-mono">
                      #{app.memberId || app.id.slice(-6)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Passport: <b className="text-slate-200">{app.passportNo}</b> | Expiry: {app.expiryDate || '-'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {getStatusBadge(app.status)}
                  <button
                    type="button"
                    onClick={() => { setEditingData(app); setShowForm(true); }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                {/* Contact */}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Contact Details</p>
                  <p className="font-mono text-slate-200 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-amber-400" /> {app.applicantContactNo || '-'}
                  </p>
                  <p className="font-sans text-slate-400 flex items-center gap-1.5 truncate text-[11px]">
                    <Mail className="w-3 h-3 text-amber-400 shrink-0" /> {app.applicantEmail || '-'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Emergency: <b className="text-slate-300">{app.emergencyContactName || '-'} ({app.emergencyContactNo || '-'})</b>
                  </p>
                </div>

                {/* Employment */}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Employment Details</p>
                  <p className="text-slate-300 font-medium truncate">{app.employmentCategory || 'Not specified'}</p>
                  <p className="text-slate-400 text-[11px] truncate">{app.employerName || 'No Employer Recorded'}</p>
                </div>

                {/* Kit Sizes */}
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Shirt className="w-3 h-3 text-amber-400" /> Tour Kit Measurements
                  </p>
                  <p className="font-mono text-slate-300 text-[11px]">
                    T-Shirt: <b className="text-amber-300">{app.tshirtSize || '-'}</b> | Shorts: <b className="text-amber-300">{app.shortsSize || '-'}</b>
                  </p>
                  <p className="font-mono text-slate-300 text-[11px]">
                    Track Pant: <b>Waist {app.trackpantWaist || '-'} | Length {app.trackpantLength || '-'}</b>
                  </p>
                  <p className="font-mono text-slate-300 text-[11px]">
                    Jacket: <b>{app.jacketSize || '-'}</b>
                  </p>
                </div>
              </div>

              {/* Agent Remarks */}
              {Array.isArray(app.agentRemarks) && app.agentRemarks.length > 0 && (
                <div className="bg-rose-950/20 border border-rose-800/40 p-2.5 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Visa Agent Remarks:
                  </p>
                  <p className="text-xs text-rose-200">
                    {app.agentRemarks[app.agentRemarks.length - 1].text}
                  </p>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
}