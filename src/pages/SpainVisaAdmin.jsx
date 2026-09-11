import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { 
  collection, getDocs, doc, updateDoc, 
  arrayUnion, getDoc, writeBatch 
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { 
  Plane, Search, Filter, Download, CheckCircle, AlertCircle, 
  Clock, FileText, Phone, Mail, ChevronRight, ChevronDown, X, 
  RefreshCw, Send, Loader2, Eye, Printer, MessageCircle, UserCheck, 
  Briefcase, Lock, Unlock, Users, Calendar, Ticket, FileSpreadsheet,
  UploadCloud, ClipboardList
} from 'lucide-react';

const STATUS_OPTIONS = [
  "Documents Pending",
  "Under Verification",
  "Correction Required",
  "Documents Approved",
  "Visa Submitted",
  "Visa Approved",
  "Visa Rejected"
];

const GROUP_OPTIONS = [
  "MRDGA Members",
  "MRDGA Family",
  "PRO Teams",
  "Thane",
  "Women Teams",
  "Other"
];

const CATEGORY_OPTIONS = [
  "Confirmed",
  "Waitlist",
  "Cancelled"
];

export default function SpainVisaAdmin({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applications, setApplications] = useState([]);

  // 🔒 Master Kit Lock State
  const [isKitLocked, setIsKitLocked] = useState(false);
  const [isVisaDocLocked, setIsVisaDocLocked] = useState(true); // 👈 डीफॉल्ट लॉक ठेवले आहे
  const [lockUpdating, setLockUpdating] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Collapsible state
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Modals
  const [selectedMember, setSelectedMember] = useState(null);
  const [editForm, setEditForm] = useState({
    status: '',
    travelCategory: 'Confirmed',
    groupName: 'MRDGA Members',
    customGroup: '',
    visaAppointmentDate: '',
    visaStatus: 'Pending',
    ticketStatus: 'Not Booked',
    ticketPnr: '',
    agentRemark: ''
  });

  const [previewDoc, setPreviewDoc] = useState(null);

  // 📋 Bulk Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [pastedExcelText, setPastedExcelText] = useState('');
  const [importing, setImporting] = useState(false);

// 🔄 डेटा लोड करताना दोन्ही लॉक वाचणे
  const loadApplications = async () => {
    setLoading(true);
    try {
      const [appsSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, "spain_tour_applications_2026")),
        getDoc(doc(db, "settings", "registration_status")).catch(() => null)
      ]);

      const list = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setApplications(list);

      if (settingsSnap && settingsSnap.exists()) {
        const data = settingsSnap.data();
        setIsKitLocked(data.isKitLocked === true);
        setIsVisaDocLocked(data.isVisaDocLocked !== false); // डिफॉल्ट true (Locked)
      }
    } catch (err) {
      console.error("Error loading applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // 🔒 मास्टर किट लॉक टॉगल
  const handleToggleKitLock = async () => {
    setLockUpdating(true);
    const targetState = !isKitLocked;
    try {
      const settingsRef = doc(db, "settings", "registration_status");
      await updateDoc(settingsRef, {
        isKitLocked: targetState,
        kitLockedAt: new Date().toISOString(),
        kitLockedBy: currentUser?.email || 'Super Admin'
      });

      setIsKitLocked(targetState);
      Swal.fire({
        icon: 'success',
        title: targetState ? '🔒 All Kit Forms Locked!' : '🔓 Kit Forms Unlocked!',
        text: targetState ? 'Kit size forms locked.' : 'Kit size forms open.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });
    } catch (err) {
      console.error("Lock update failed:", err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update lock.' });
    } finally {
      setLockUpdating(false);
    }
  };

  // 🔒 १. मास्टर व्हिसा डॉक्युमेंट सबमिशन लॉक टॉगल (Admin Switch)
  const handleToggleVisaDocLock = async () => {
    setLockUpdating(true);
    const targetState = !isVisaDocLocked;
    try {
      const settingsRef = doc(db, "settings", "registration_status");
      await updateDoc(settingsRef, {
        isVisaDocLocked: targetState,
        visaDocLockedAt: new Date().toISOString(),
        visaDocLockedBy: currentUser?.email || 'Super Admin'
      });

      setIsVisaDocLocked(targetState);
      Swal.fire({
        icon: 'success',
        title: targetState ? '🔒 Visa Docs Submission Locked!' : '🔓 Visa Docs Submission Open!',
        text: targetState ? 'Users cannot submit or edit visa documents now.' : 'Users can now upload visa documents.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });
    } catch (err) {
      console.error("Visa doc lock update failed:", err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update visa doc lock.' });
    } finally {
      setLockUpdating(false);
    }
  };

  // 🔑 २. Non-MRDGA Whitelist सिंक (फक्त email, isActive, name ही ३ च फील्ड्स)
  const handleSyncNonMrdgaWhitelist = async () => {
    const nonMrdgaMembers = applications.filter(item => {
      const grp = (item.groupName || '').trim();
      const email = (item.applicantEmail || item.submittedBy || '').trim().toLowerCase();
      return grp !== 'MRDGA Members' && email && email.includes('@');
    });

    if (nonMrdgaMembers.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Non-MRDGA Members',
        text: 'All members are in MRDGA Members group or missing emails.',
        background: '#0f172a',
        color: '#fff'
      });
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (let member of nonMrdgaMembers) {
        const cleanEmail = (member.applicantEmail || member.submittedBy).trim().toLowerCase();
        const whitelistDocRef = doc(db, "spain_tour_whitelist", cleanEmail);

        // 🎯 फक्त हीच ३ फील्ड्स सेव्ह होतील
        batch.set(whitelistDocRef, {
          email: cleanEmail,
          isActive: true,
          name: member.fullNameAsPassport || member.fullName || ''
        }, { merge: true });

        count++;
      }

      await batch.commit();

      Swal.fire({
        icon: 'success',
        title: 'Whitelist Synced!',
        text: `Updated 3-field whitelist for ${count} non-MRDGA members.`,
        background: '#0f172a',
        color: '#fff'
      });

    } catch (err) {
      console.error("Whitelist sync error:", err);
      Swal.fire({ icon: 'error', title: 'Sync Failed', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const cleanPhone = (num) => (num || '').replace(/[^0-9]/g, '').slice(-10);

  // Counts & Statistics
  const counts = useMemo(() => {
    const total = applications.length;
    const confirmed = applications.filter(a => a.travelCategory === 'Confirmed' || !a.travelCategory).length;
    const waitlist = applications.filter(a => a.travelCategory === 'Waitlist').length;
    const approved = applications.filter(a => (a.status || '').includes('Approved')).length;
    const correction = applications.filter(a => (a.status || '').includes('Correction')).length;
    return { total, confirmed, waitlist, approved, correction };
  }, [applications]);

  // 🔍 सर्च आणि फिल्टर्स
  const filteredApplications = useMemo(() => {
    const rawSearch = searchTerm.trim().toLowerCase();
    return applications.filter(item => {
      const name = (item.fullNameAsPassport || item.fullName || '').toLowerCase();
      const passport = (item.passportNo || '').toLowerCase();
      const phone = cleanPhone(item.applicantContactNo || item.contactNo);
      const email = (item.applicantEmail || item.submittedBy || '').toLowerCase();
      const status = item.status || 'Documents Pending';
      const category = item.travelCategory || 'Confirmed';
      const group = item.groupName || 'MRDGA Members';

      const matchesSearch = !rawSearch || 
        name.includes(rawSearch) || 
        passport.includes(rawSearch) || 
        phone.includes(rawSearch) || 
        email.includes(rawSearch);

      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || category === categoryFilter;
      const matchesGroup = groupFilter === 'ALL' || group === groupFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesGroup;
    });
  }, [applications, searchTerm, statusFilter, categoryFilter, groupFilter]);

 
  // 📋 स्मार्ट पाईप (|) व टॅब बल्क इंपोर्टर
// 📋 १००% अचूक मॅपिंग असलेला बल्क इंपोर्टर
  const handleExecuteBulkImport = async () => {
    if (!pastedExcelText.trim()) {
      Swal.fire({ icon: 'warning', title: 'Empty', text: 'Please paste lines.' });
      return;
    }

    setImporting(true);
    try {
      const rawLines = pastedExcelText.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
      const batch = writeBatch(db);
      let importedCount = 0;

      for (let line of rawLines) {
        let delimiter = line.includes('|') ? '|' : '\t';
        let cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

        // हेडर ओळ वगळणे
        if (cols[0]?.toLowerCase() === 'name' || cols[1]?.toLowerCase() === 'surname') {
          continue;
        }

        if (!cols[0] && !cols[1]) continue;

        const fName = cols[0] || '';
        const lName = cols[1] || '';
        const full = `${fName} ${lName}`.replace(/\s+/g, ' ').trim().toUpperCase();

        // 🎯 अचूक इंडेक्सनुसार मॅपिंग:
        const dobRaw = cols[2] || '';
        const passportRaw = (cols[3] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const issueRaw = cols[4] || '';
        const expiryRaw = cols[5] || '';
        const maritalRaw = cols[6] || 'Married';
        const phoneRaw = (cols[7] || '').replace(/[^0-9]/g, '').slice(-10); // cols[7] = Phone
        const emailRaw = (cols[8] || '').toLowerCase().trim();              // cols[8] = Email
        const designationRaw = cols[9] || '';                              // cols[9] = Designation
        const officeRaw = cols[10] || '';                                  // cols[10] = Office/Company
        const homeAddressRaw = cols[11] || '';                             // cols[11] = Home Address

        const memberPayload = {
          memberId: `SP-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
          fullNameAsPassport: full,
          fullName: full,
          dob: dobRaw,
          passportNo: passportRaw,
          issueDate: issueRaw,
          expiryDate: expiryRaw,
          maritalStatus: maritalRaw,
          
          // संपर्क
          applicantContactNo: phoneRaw,
          applicantEmail: emailRaw,
          submittedBy: emailRaw || 'admin_import',

          // रोजगार
          designation: designationRaw,
          employmentCategory: designationRaw ? 'Salaried' : 'Business / Self-Employed',
          employerName: officeRaw.split(',')[0] || officeRaw, // कंपनीचे नाव
          employerAddress: officeRaw,

          // घराचा पत्ता (स्वल्पविरामासह १००% सुरक्षित)
          residentialAddress: homeAddressRaw,

          // टूर ऑपरेशन्स
          travelCategory: 'Confirmed',
          groupName: 'MRDGA Members',
          status: 'Documents Pending',
          gender: 'Male',
          passportPdfUrl: '',
          photoUrl: '',
          ticketStatus: 'Not Booked',
          ticketPnr: '',
          agentRemarks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const newDocRef = doc(collection(db, "spain_tour_applications_2026"));
        batch.set(newDocRef, memberPayload);
        importedCount++;
      }

      if (importedCount === 0) {
        Swal.fire({ icon: 'info', title: 'No Rows', text: 'No valid traveler records found.' });
        setImporting(false);
        return;
      }

      await batch.commit();

      Swal.fire({
        icon: 'success',
        title: 'Import Successful!',
        text: `Successfully imported ${importedCount} traveler profiles with exact details.`,
        background: '#0f172a',
        color: '#fff'
      });

      setPastedExcelText('');
      setShowImportModal(false);
      loadApplications();

    } catch (err) {
      console.error("Import error:", err);
      Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
    } finally {
      setImporting(false);
    }
  };

  // एडिट मॉडेल उघडणे
  const handleOpenEditModal = (member) => {
    setSelectedMember(member);
    setEditForm({
      status: member.status || STATUS_OPTIONS[0],
      travelCategory: member.travelCategory || 'Confirmed',
      groupName: GROUP_OPTIONS.includes(member.groupName) ? member.groupName : (member.groupName ? 'Other' : 'MRDGA Members'),
      customGroup: !GROUP_OPTIONS.includes(member.groupName) ? (member.groupName || '') : '',
      visaAppointmentDate: member.visaAppointmentDate || '',
      visaStatus: member.visaStatus || 'Pending',
      ticketStatus: member.ticketStatus || 'Not Booked',
      ticketPnr: member.ticketPnr || '',
      agentRemark: ''
    });
  };

  // सेव्ह ऑपरेशन्स
  const handleSaveMemberDetails = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      const finalGroup = editForm.groupName === 'Other' && editForm.customGroup.trim() 
        ? editForm.customGroup.trim().toUpperCase() 
        : editForm.groupName;

      const docRef = doc(db, "spain_tour_applications_2026", selectedMember.id);
      const updatePayload = {
        status: editForm.status,
        travelCategory: editForm.travelCategory,
        groupName: finalGroup,
        visaAppointmentDate: editForm.visaAppointmentDate,
        visaStatus: editForm.visaStatus,
        ticketStatus: editForm.ticketStatus,
        ticketPnr: editForm.ticketPnr.trim().toUpperCase(),
        lastUpdatedBy: currentUser?.email || 'Admin',
        updatedAt: new Date().toISOString()
      };

      let newRemarkObj = null;
      if (editForm.agentRemark.trim()) {
        newRemarkObj = {
          id: Date.now().toString(),
          by: currentUser?.email || 'Admin',
          text: editForm.agentRemark.trim(),
          createdAt: new Date().toISOString()
        };
        updatePayload.agentRemarks = arrayUnion(newRemarkObj);
      }

      await updateDoc(docRef, updatePayload);

      setApplications(prev => prev.map(item => 
        item.id === selectedMember.id 
          ? { 
              ...item, 
              ...updatePayload, 
              agentRemarks: newRemarkObj ? [...(item.agentRemarks || []), newRemarkObj] : item.agentRemarks 
            } 
          : item
      ));

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Details updated for ${selectedMember.fullNameAsPassport || selectedMember.fullName}`,
        timer: 1300,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff'
      });

      setSelectedMember(null);
    } catch (err) {
      console.error("Update error:", err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update details.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 📊 फिल्टरनुसार एक्सेल/CSV एक्सपोर्ट
  const handleExportFilteredCsv = () => {
    if (filteredApplications.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Data', text: 'No records match the current filter.' });
      return;
    }

    const headers = [
      "Sr No", "Member ID", "Full Name", "Gender", "Priority", "Group Name", 
      "Passport No", "DOB", "Issue Date", "Expiry Date", "Contact No", "Email",
      "Visa Date", "Visa Status", "Ticket Status", "Ticket PNR",
      "T-Shirt", "Shorts", "Track Waist", "Track Length", "Jacket", "Status"
    ];

    const rows = filteredApplications.map((item, idx) => [
      idx + 1,
      `"${item.memberId || ''}"`,
      `"${item.fullNameAsPassport || item.fullName || ''}"`,
      item.gender || 'Male',
      `"${item.travelCategory || 'Confirmed'}"`,
      `"${item.groupName || 'MRDGA Members'}"`,
      `"${item.passportNo || ''}"`,
      item.dob || '',
      item.issueDate || '',
      item.expiryDate || '',
      `"${item.applicantContactNo || item.contactNo || ''}"`,
      `"${item.applicantEmail || item.submittedBy || ''}"`,
      item.visaAppointmentDate || '',
      item.visaStatus || 'Pending',
      item.ticketStatus || 'Not Booked',
      `"${item.ticketPnr || ''}"`,
      `"${item.tshirtSize || ''}"`,
      `"${item.shortsSize || ''}"`,
      `"${item.trackpantWaist || ''}"`,
      `"${item.trackpantLength || ''}"`,
      `"${item.jacketSize || ''}"`,
      `"${item.status || 'Pending'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Spain_Tour_Manifest_${groupFilter}_${categoryFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🖨️ मास्टर ग्रुप PDF (A4 Landscape)
  const handlePrintMasterManifest = () => {
    if (filteredApplications.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Data', text: 'No records to print.' });
      return;
    }

    const printWindow = window.open('', '_blank');
    const rowsHtml = filteredApplications.map((item, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px; font-family: 'Segoe UI', sans-serif;">
        <td style="padding: 5px 6px; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: bold; text-transform: uppercase;">${item.fullNameAsPassport || item.fullName || '-'}</td>
        <td style="padding: 5px 6px; font-family: monospace; font-weight: bold;">${item.passportNo || '-'}</td>
        <td style="padding: 5px 6px; text-align: center;">${item.gender ? item.gender[0] : 'M'}</td>
        <td style="padding: 5px 6px; font-weight: 600;">${item.groupName || 'MRDGA'}</td>
        <td style="padding: 5px 6px; text-align: center;">
          <span style="padding: 2px 5px; border-radius: 4px; font-weight: bold; font-size: 9px; background: ${item.travelCategory === 'Confirmed' ? '#dcfce7; color: #15803d' : '#fef3c7; color: #b45309'}">
            ${item.travelCategory || 'Confirmed'}
          </span>
        </td>
        <td style="padding: 5px 6px; font-family: monospace;">${item.applicantContactNo || item.contactNo || '-'}</td>
        <td style="padding: 5px 6px; font-family: monospace; font-size: 9.5px; background: #f8fafc;">
          T:${item.tshirtSize || '-'} | S:${item.shortsSize || '-'} | Trk:${item.trackpantWaist || '-'}/${item.trackpantLength || '-'} | J:${item.jacketSize || '-'}
        </td>
        <td style="padding: 5px 6px; font-family: monospace; font-weight: bold; color: #0284c7;">${item.ticketPnr || '-'}</td>
        <td style="padding: 5px 6px; font-weight: bold;">${item.status || 'Pending'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spain Tour 2026 - Master Manifest</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #0f172a; color: #ffffff; padding: 7px 6px; font-size: 10.5px; text-align: left; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">
            <div>
              <h2 style="margin: 0; color: #0f172a; font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase;">
                MRDGA SPAIN TOUR 2026 — OFFICIAL DELEGATION MANIFEST
              </h2>
              <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">
                Active Filter: <b>${groupFilter}</b> | Priority: <b>${categoryFilter}</b> | Status: <b>${statusFilter}</b>
              </p>
            </div>
            <div style="text-align: right; font-size: 10.5px; font-family: monospace;">
              <p style="margin: 0;">Total Passengers: <b>${filteredApplications.length}</b></p>
              <p style="margin: 2px 0 0; color: #64748b;">Printed: ${new Date().toLocaleString()}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th>Full Name (Passport)</th>
                <th>Passport No</th>
                <th style="text-align: center; width: 30px;">Gen</th>
                <th>Group</th>
                <th style="text-align: center;">Priority</th>
                <th>Contact No</th>
                <th>Kit Sizes (T/S/Trk/Jkt)</th>
                <th>Flight PNR</th>
                <th>Visa Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // 🖨️ सिंगल पॅसेंजर डॉसियर पास (A4 Portrait Pass)
  const handlePrintSingleDossier = (item) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${item.fullNameAsPassport || item.fullName} - Dossier</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; }
          </style>
        </head>
        <body style="padding: 10px;">
          
          <div style="border: 2px solid #0f172a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            
            <div style="background: #0f172a; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h1 style="margin: 0; font-size: 17px; letter-spacing: 1px; color: #f59e0b; text-transform: uppercase;">MRDGA SPAIN TOUR 2026</h1>
                <p style="margin: 3px 0 0; font-size: 11px; color: #94a3b8;">Official Travel Pass & Visa Delegation Dossier</p>
              </div>
              <div style="text-align: right; font-family: monospace;">
                <span style="font-size: 13px; font-weight: bold; color: #38bdf8; background: #1e293b; padding: 4px 8px; border-radius: 6px;">
                  #${item.memberId || item.id.slice(-6)}
                </span>
              </div>
            </div>

            <div style="padding: 20px;">
              <div style="display: flex; gap: 18px; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 18px;">
                <div style="width: 110px; height: 130px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; shrink-0;">
                  ${item.photoUrl 
                    ? `<img src="${item.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    : `<span style="color: #94a3b8; font-size: 11px; text-align: center; font-weight: bold;">PHOTO<br>ATTACHED</span>`
                  }
                </div>

                <div style="flex: 1;">
                  <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #0f172a;">${item.fullNameAsPassport || item.fullName}</h2>
                  <p style="margin: 4px 0 10px; color: #64748b; font-size: 12px;">
                    Group: <b style="color: #0f172a;">${item.groupName || 'MRDGA Members'}</b> | Priority: <b style="color: #0f172a;">${item.travelCategory || 'Confirmed'}</b>
                  </p>
                  
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11.5px;">
                    <div><b>Passport No:</b> <span style="font-family: monospace; color: #b45309; font-weight: bold;">${item.passportNo || '-'}</span></div>
                    <div><b>Gender / DOB:</b> ${item.gender || 'Male'} (${item.dob || '-'})</div>
                    <div><b>Date of Issue:</b> ${item.issueDate || '-'}</div>
                    <div><b>Date of Expiry:</b> ${item.expiryDate || '-'}</div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 16px;">
                <h3 style="font-size: 12px; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Tour Kit Measurements</h3>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; font-size: 11.5px; font-family: monospace;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;">T-SHIRT<br><b style="font-size: 13px; color: #0f172a;">${item.tshirtSize || '-'}</b></div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;">SHORTS<br><b style="font-size: 13px; color: #0f172a;">${item.shortsSize || '-'}</b></div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;">TRACKPANT<br><b style="font-size: 12px; color: #0f172a;">W:${item.trackpantWaist || '-'} L:${item.trackpantLength || '-'}</b></div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px;">JACKET<br><b style="font-size: 13px; color: #0f172a;">${item.jacketSize || '-'}</b></div>
                </div>
              </div>

              <div style="margin-top: 16px;">
                <h3 style="font-size: 12px; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Logistics & Travel Status</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11.5px;">
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;"><b>Visa Status:</b><br><span style="color: #0284c7; font-weight: bold;">${item.status || 'Pending'}</span></div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;"><b>Visa Appt Date:</b><br>${item.visaAppointmentDate || 'Pending'}</div>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;"><b>Flight Ticket PNR:</b><br><span style="font-family: monospace; font-weight: bold; color: #16a34a; font-size: 12px;">${item.ticketPnr || 'Not Issued'}</span></div>
                </div>
              </div>

              <div style="margin-top: 16px;">
                <h3 style="font-size: 12px; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Contact & Residential Information</h3>
                <p style="font-size: 11.5px; margin: 4px 0;"><b>Phone:</b> ${item.applicantContactNo || item.contactNo || '-'} | <b>Email:</b> ${item.applicantEmail || item.submittedBy || '-'}</p>
                <p style="font-size: 11.5px; margin: 4px 0;"><b>Address:</b> ${item.residentialAddress || item.employerAddress || 'On File'}</p>
                <p style="font-size: 11.5px; margin: 4px 0;"><b>Occupation:</b> ${item.designation || item.employmentCategory || '-'} (${item.employerAddress || '-'})</p>
              </div>

            </div>

            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 20px; font-size: 10.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
              <span>Official MRDGA Spain Tour Delegation Document</span>
              <span>Authorized Signature: __________________</span>
            </div>

          </div>

        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleOpenDocModal = (url, title, isPdf = true) => {
    setPreviewDoc({ url, title, isPdf });
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'Documents Pending');
    if (s.includes('Approved') || s.includes('Ready')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">Approved</span>;
    }
    if (s.includes('Correction') || s.includes('Rejected')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-800 shrink-0 animate-pulse">Correction</span>;
    }
    if (s.includes('Verification')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-950 text-blue-400 border border-blue-800 shrink-0">Verifying</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-amber-400 border border-slate-700 shrink-0">Pending</span>;
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto font-sans text-slate-200">
      
      {/* 🌟 1. TOP HEADER BAR */}
      <div className="bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-white truncate">
                Tour Operations Hub
              </h1>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                Confirmed: {counts.confirmed}
              </span>
              {counts.waitlist > 0 && (
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                  Waitlist: {counts.waitlist}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Import, Lock, Print Group PDF, Export CSV & Refresh */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          
          {/* 📥 1-CLICK BULK EXCEL IMPORT */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
            title="Import Excel Rows directly into Database"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Import</span>
          </button>

          {/* 🔒 GLOBAL KIT LOCK */}
          <button
            type="button"
            disabled={lockUpdating}
            onClick={handleToggleKitLock}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border shadow-sm ${
              isKitLocked 
                ? 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900' 
                : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
            }`}
          >
            {lockUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isKitLocked ? (
              <Lock className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="hidden sm:inline">{isKitLocked ? 'Kit Locked' : 'Kit Open'}</span>
          </button>

          {/* 🔒 GLOBAL VISA DOCS LOCK TOGGLE */}
<button
  type="button"
  disabled={lockUpdating}
  onClick={handleToggleVisaDocLock}
  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border shadow-sm ${
    isVisaDocLocked 
      ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900' 
      : 'bg-blue-950 text-blue-300 border-blue-800 hover:bg-blue-900'
  }`}
  title={isVisaDocLocked ? "Click to Open Visa Document Uploads" : "Click to Lock Visa Document Uploads"}
>
  {lockUpdating ? (
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
  ) : isVisaDocLocked ? (
    <Lock className="w-3.5 h-3.5 text-rose-400" />
  ) : (
    <Unlock className="w-3.5 h-3.5 text-blue-400" />
  )}
  <span className="hidden sm:inline">{isVisaDocLocked ? 'Visa Docs Locked' : 'Visa Docs Open'}</span>
</button>

          {/* 🖨️ PRINT MASTER GROUP PDF */}
          <button
            onClick={handlePrintMasterManifest}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
            title="Print Filtered Manifest to A4 Landscape PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Group PDF</span>
          </button>

          {/* 📊 EXPORT FILTERED CSV */}
          <button
            onClick={handleExportFilteredCsv}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
            title="Download Filtered CSV / Excel Manifest"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={loadApplications}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🌟 2. MULTI-LEVEL FILTER PILLS & GROUPING */}
      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-2.5">
        
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold">
          <span className="text-[10px] text-slate-500 uppercase mr-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Priority:
          </span>
          {['ALL', 'Confirmed', 'Waitlist', 'Cancelled'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer ${
                categoryFilter === cat ? 'bg-amber-500 text-black font-extrabold' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? `All (${counts.total})` : cat}
            </button>
          ))}
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold border-t border-slate-800/80 pt-2">
          <span className="text-[10px] text-slate-500 uppercase mr-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Groups:
          </span>
          <button
            onClick={() => setGroupFilter('ALL')}
            className={`px-2 py-0.5 rounded-md transition shrink-0 cursor-pointer ${
              groupFilter === 'ALL' ? 'bg-slate-200 text-black' : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            All Groups
          </button>
          {GROUP_OPTIONS.map(grp => (
            <button
              key={grp}
              onClick={() => setGroupFilter(grp)}
              className={`px-2 py-0.5 rounded-md transition shrink-0 cursor-pointer ${
                groupFilter === grp ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative pt-1 border-t border-slate-800/80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Name, Passport No, Mobile, or Ticket PNR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
      </div>

      {/* 🌟 3. APPLICANTS LIST */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Loading manifests & tour entries...</span>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
          No records found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredApplications.map((item, idx) => {
            const isExpanded = expandedRowId === item.id;
            const rawPhone = cleanPhone(item.applicantContactNo || item.contactNo);
            const waMsg = encodeURIComponent(`Hello ${item.fullNameAsPassport || item.fullName}, this is regarding your Spain Tour registration.`);
            const isWaitlisted = item.travelCategory === 'Waitlist';

            return (
              <div
                key={item.id}
                className={`bg-slate-900/90 border rounded-xl transition shadow-sm overflow-hidden ${
                  isWaitlisted ? 'border-amber-500/30' : 'border-slate-800'
                } ${isExpanded ? 'border-amber-500/70 bg-slate-900' : 'hover:border-slate-700'}`}
              >
                {/* COMPACT HEADER ROW */}
                <div
                  onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                  className="p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-mono font-bold text-slate-500 w-5 shrink-0 text-center">
                      {idx + 1}
                    </span>

                    <div className="truncate">
                      <div className="flex items-center gap-2 truncate">
                        <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide truncate">
                          {item.fullNameAsPassport || item.fullName}
                        </h2>
                        {item.gender && (
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 rounded border border-slate-700">
                            {item.gender}
                          </span>
                        )}
                        {item.travelCategory && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            item.travelCategory === 'Confirmed' 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                              : item.travelCategory === 'Waitlist'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-red-950 text-red-300 border-red-800'
                          }`}>
                            {item.travelCategory}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 font-bold">{item.passportNo || 'No Passport'}</span>
                        <span>| Group: <b>{item.groupName || 'MRDGA Members'}</b></span>
                        {item.ticketPnr && (
                          <span className="text-emerald-400 font-bold">| PNR: {item.ticketPnr}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Icons */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {rawPhone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${rawPhone}`}
                          className="p-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg hover:bg-sky-500/20"
                          title="Call"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://wa.me/91${rawPhone}?text=${waMsg}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {getStatusBadge(item.status)}

                    <button
                      onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                      className="p-1 text-slate-400 hover:text-white rounded-md cursor-pointer ml-0.5"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED DETAIL DRAWER */}
                {isExpanded && (
                  <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 space-y-3 text-xs">
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          MEMBER ID: #{item.memberId || item.id.slice(-6)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Visa Date: <b className="text-amber-300">{item.visaAppointmentDate || 'Not Scheduled'}</b>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* 🖨️ INDIVIDUAL PASS PRINT BUTTON */}
                        <button
                          type="button"
                          onClick={() => handlePrintSingleDossier(item)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Print Individual Dossier Pass"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                          <span>Dossier PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span>Edit Operations / Group</span>
                        </button>
                      </div>
                    </div>

                    {/* Logistics & Kit Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      
                      {/* 1. Kit Measurements */}
                      <div className="p-2.5 bg-slate-900 rounded-xl space-y-1 border border-slate-800">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Kit Measurements</span>
                        <div className="grid grid-cols-2 gap-1 font-mono text-slate-300">
                          <p>T-Shirt: <b className="text-white">{item.tshirtSize || '-'}</b></p>
                          <p>Shorts: <b className="text-white">{item.shortsSize || '-'}</b></p>
                          <p>Track: <b className="text-white">W:{item.trackpantWaist || '-'} L:{item.trackpantLength || '-'}</b></p>
                          <p>Jacket: <b className="text-white">{item.jacketSize || '-'}</b></p>
                        </div>
                      </div>

                      {/* 2. Visa & Ticket Logistics */}
                      <div className="p-2.5 bg-slate-900 rounded-xl space-y-1 border border-slate-800">
                        <span className="text-[10px] text-sky-400 font-bold uppercase block">Visa & Flight Logistics</span>
                        <p className="text-slate-300">Visa Appt: <b className="text-white">{item.visaAppointmentDate || 'Pending'}</b></p>
                        <p className="text-slate-300">Visa Status: <b className="text-amber-300">{item.visaStatus || 'Pending'}</b></p>
                        <p className="text-slate-300">Ticket: <b className="text-white">{item.ticketStatus || 'Not Booked'}</b> ({item.ticketPnr || 'No PNR'})</p>
                      </div>

                      {/* 3. Contact & Address */}
                      <div className="p-2.5 bg-slate-900 rounded-xl space-y-1 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Contact & Address</span>
                        <p className="text-slate-300 font-mono truncate">📱 {item.applicantContactNo || item.contactNo || '-'}</p>
                        <p className="text-slate-300 truncate">✉️ {item.applicantEmail || item.submittedBy || '-'}</p>
                        <p className="text-slate-400 truncate">🏠 {item.residentialAddress || item.employerAddress || 'Address not scanned'}</p>
                      </div>

                    </div>

                    {/* Attached Documents Row */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Files:</span>
                      {item.passportPdfUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocModal(item.passportPdfUrl, `${item.fullNameAsPassport || item.fullName} - Passport`, true)}
                          className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Passport PDF
                        </button>
                      )}
                      {item.photoUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocModal(item.photoUrl, `${item.fullNameAsPassport || item.fullName} - Photo`, false)}
                          className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Visa Photo
                        </button>
                      )}
                      {item.bankStatementUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocModal(item.bankStatementUrl, `${item.fullNameAsPassport || item.fullName} - Bank`, true)}
                          className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          Bank
                        </button>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* 📥 1-CLICK BULK EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 font-sans overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl p-4 sm:p-5 space-y-3 shadow-2xl my-6">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Fast Bulk Import</span>
                <h3 className="font-bold text-sm text-white uppercase">Paste Rows Directly from Excel</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-amber-300">📌 Excel कॉलमचा क्रम:</p>
                <p className="text-[10px] font-mono text-slate-400">
                  Name | Surname | Dob | Passport No | Issues | Expired | Married | Home address | Phone | Email | Designation | Office Address
                </p>
                <p className="text-[10px] text-emerald-400">
                  ✓ पत्यामध्ये कितीही स्वल्पविराम (`,`) असले तरी काहीही फरक पडत नाही.
                </p>
              </div>

              <textarea
                rows={8}
                placeholder="Excel मधील ओळी सिलेक्ट करा, Ctrl+C दाबा आणि इथे Ctrl+V (पेस्ट) करा..."
                value={pastedExcelText}
                onChange={(e) => setPastedExcelText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 resize-y"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">
  {pastedExcelText.trim() 
    ? `${pastedExcelText.trim().split(/\r?\n/).filter(l => l.trim().length > 5).length} Valid Rows Detected` 
    : '0 Rows'}
</span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importing || !pastedExcelText.trim()}
                    onClick={handleExecuteBulkImport}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>Upload to Database</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 📝 EDIT OPERATIONS MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 font-sans overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-4 sm:p-5 space-y-3.5 shadow-2xl my-6">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Manage Operations</span>
                <h3 className="font-bold text-sm text-white uppercase">{selectedMember.fullNameAsPassport || selectedMember.fullName}</h3>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberDetails} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Travel Priority *</label>
                  <select
                    value={editForm.travelCategory}
                    onChange={(e) => setEditForm(prev => ({ ...prev, travelCategory: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-amber-300 font-bold focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Group *</label>
                  <select
                    value={editForm.groupName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, groupName: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {editForm.groupName === 'Other' && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Type Custom Group Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP GUESTS / SPONSORS"
                    value={editForm.customGroup}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customGroup: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg p-2 text-xs text-amber-300 font-bold uppercase"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Visa Appt Date</label>
                  <input
                    type="date"
                    value={editForm.visaAppointmentDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, visaAppointmentDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Visa Status</label>
                  <select
                    value={editForm.visaStatus}
                    onChange={(e) => setEditForm(prev => ({ ...prev, visaStatus: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Flight Ticket</label>
                  <select
                    value={editForm.ticketStatus}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ticketStatus: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Not Booked">Not Booked</option>
                    <option value="Booked">Booked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ticket PNR</label>
                  <input
                    type="text"
                    placeholder="e.g. 6E-XY892"
                    value={editForm.ticketPnr}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ticketPnr: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Document Status *</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Add Remark for Traveler</label>
                <textarea
                  rows={2}
                  placeholder="Optional notice..."
                  value={editForm.agentRemark}
                  onChange={(e) => setEditForm(prev => ({ ...prev, agentRemark: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition flex items-center gap-1 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Save Operations</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 👁️ DOCUMENT VIEWER MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
          <div className="bg-[#0c0d14] border border-amber-500/40 w-full max-w-4xl h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs truncate">
                <FileText className="w-4 h-4 shrink-0" /> {previewDoc.title}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-amber-500 text-black font-bold text-xs rounded-md flex items-center gap-1 hover:bg-amber-400 transition"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-hidden relative flex items-center justify-center">
              {previewDoc.isPdf ? (
                <iframe
                  src={
                    previewDoc.url.includes('drive.google.com')
                      ? `https://drive.google.com/file/d/${previewDoc.url.match(/[-\w]{25,}/)?.[0]}/preview`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(previewDoc.url)}&embedded=true`
                  }
                  title="Document Preview"
                  className="w-full h-full rounded-lg border border-slate-800"
                />
              ) : (
                <img src={previewDoc.url} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}