// ==========================================
// #SECTION 1: IMPORTS
// ==========================================
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc,writeBatch } from 'firebase/firestore';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  UserPlus, UserCheck, Mail, Edit, RefreshCw, Lock, X, 
  Search, Phone, MessageSquare, CheckSquare, Square, Award,
  Plane,UploadCloud,ClipboardList
} from 'lucide-react';

// 🎯 Central Modules Import
import { SYSTEM_MODULES, ALL_MODULE_KEYS } from '../constants/modules';

// 🚩 अधिकृत MRDGA संघटना पदे
const MRDGA_DESIGNATIONS = [
  "President",
  "Working President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Member",
  "Non Member"
];

export default function UserManagement() {
  // ==========================================
  // #SECTION 2: STATES
  // ==========================================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('');
  
  // 🧭 मेन टॅब: सिस्टीम युझर्स विरुद्ध तात्पुरती स्पेन व्हॉईटलिस्ट
  const [activeTab, setActiveTab] = useState('SYSTEM_USERS'); // 'SYSTEM_USERS' | 'SPAIN_WHITELIST'
  const [whitelistUsers, setWhitelistUsers] = useState([]);
  const [isSpainModalOpen, setIsSpainModalOpen] = useState(false);
  const [spainName, setSpainName] = useState('');
  const [spainEmail, setSpainEmail] = useState('');

  // 📋 बल्क इंपोर्ट स्टेट्स
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  // Search & Filters (सिस्टीम युझर्ससाठी)
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Search (स्पेन व्हॉईटलिस्टसाठी)
  const [spainSearchTerm, setSpainSearchTerm] = useState('');

  // Modal State (सिस्टीम युझर्ससाठी)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form States (सिस्टीम युझर्ससाठी)
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Member');
  const [role, setRole] = useState('Reviewer');
  const [department, setDepartment] = useState('MRDGA');
  const [customDepartment, setCustomDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [allowedModules, setAllowedModules] = useState(ALL_MODULE_KEYS);
  const [saving, setSaving] = useState(false);

  const [departmentList, setDepartmentList] = useState(['MRDGA', 'INSURANCE', 'SUPER']);

  // ==========================================
  // #SECTION 3: FETCH DATA
  // ==========================================
  const loadUsersData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const loadedUsers = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(loadedUsers || []);

      const existingDepts = loadedUsers
        .map(u => u.department)
        .filter(d => d && typeof d === 'string');

      const uniqueDepts = Array.from(new Set(['MRDGA', 'INSURANCE', 'SUPER', ...existingDepts]));
      setDepartmentList(uniqueDepts);
    } catch (err) {
      console.error("❌ [ERROR] Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🇪🇸 स्पेन व्हॉईटलिस्ट डेटा लोड करणे
  const loadSpainWhitelist = async () => {
    try {
      const snap = await getDocs(collection(db, "spain_tour_whitelist"));
      setWhitelistUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Whitelist load error:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        try {
          const uDoc = await authService.getUserRole(user.email);
          if (uDoc && uDoc.role) setCurrentRole(uDoc.role);
        } catch (e) {
          console.error("Error role fetch:", e);
        }
        loadUsersData();
        loadSpainWhitelist();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // #SECTION 4: HANDLERS (SYSTEM USERS)
  // ==========================================
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEmail('');
    setName('');
    setPhone('');
    setDesignation('Member');
    setRole('Reviewer');
    setDepartment('MRDGA');
    setCustomDepartment('');
    setIsCustomDept(false);
    setAllowedModules(ALL_MODULE_KEYS);
    setIsModalOpen(true);
  };

  const handleEditClick = (u) => {
    setIsEditing(true);
    setEmail(u.email || u.id);
    setName(u.name || u.fullName || '');
    setPhone(u.phone || '');
    setDesignation(u.designation || 'Member');
    setRole(u.role || 'Reviewer');
    setDepartment(u.department || 'MRDGA');
    setCustomDepartment('');
    setIsCustomDept(false);
    
    if (u.allowedModules !== undefined && Array.isArray(u.allowedModules)) {
      setAllowedModules(u.allowedModules);
    } else {
      setAllowedModules(ALL_MODULE_KEYS);
    }
    
    setIsModalOpen(true);
  };

  const handleModuleToggle = (modKey) => {
    setAllowedModules(prev => {
      if (prev.includes(modKey)) {
        return prev.filter(m => m !== modKey);
      } else {
        return [...prev, modKey];
      }
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    const finalDepartment = isCustomDept 
      ? customDepartment.trim().toUpperCase() 
      : department;

    if (!finalDepartment) {
      Swal.fire({ icon: 'warning', title: 'विभाग (Department) निवडा!' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isMrdgaOrSuper = finalDepartment === 'MRDGA' || finalDepartment === 'SUPER';
    const finalDesignation = isMrdgaOrSuper ? (designation || 'Member') : '-';
    
    const userPayload = {
      email: cleanEmail,
      name: name.trim(),
      fullName: name.trim(),
      phone: phone.trim(),
      designation: finalDesignation,
      role: role,
      department: finalDepartment,
      allowedModules: allowedModules,
      isActive: true,
      status: 'Active',
      updatedAt: new Date().toISOString()
    };

    setSaving(true);

    try {
      const userRef = doc(db, "users", cleanEmail);
      await setDoc(userRef, userPayload, { merge: true });

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'युझर अपडेट झाला!' : 'नवीन युझर जोडला!',
        timer: 1200,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setIsModalOpen(false);
      loadUsersData();
    } catch (err) {
      console.error("❌ [FIRESTORE SAVE ERROR]:", err);
      Swal.fire({
        icon: 'error',
        title: 'त्रुटी!',
        text: 'माहिती सेव्ह करता आली नाही.',
        background: '#0c0d14',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // #SECTION 5: HANDLERS (SPAIN WHITELIST ONLY)
  // ==========================================
  const handleSaveSpainGuest = async (e) => {
    e.preventDefault();
    if (!spainEmail.trim()) return;

    const cleanEmail = spainEmail.trim().toLowerCase();
    setSaving(true);
    try {
      // 🎯 spain_tour_whitelist मध्ये फक्त ३ च फील्ड्स
      await setDoc(doc(db, "spain_tour_whitelist", cleanEmail), {
        email: cleanEmail,
        name: spainName.trim() || cleanEmail,
        isActive: true
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: 'स्पेन पाहुणा जोडला!',
        text: `${cleanEmail} ला व्हॉईटलिस्ट ॲक्सेस दिला आहे.`,
        timer: 1300,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setSpainEmail('');
      setSpainName('');
      setIsSpainModalOpen(false);
      loadSpainWhitelist();
    } catch (err) {
      console.error("Whitelist Save Error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: err.message, background: '#0c0d14', color: '#fff' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSpainGuest = async (item) => {
    try {
      const targetState = item.isActive === false ? true : false;
      await setDoc(doc(db, "spain_tour_whitelist", item.id), {
        isActive: targetState
      }, { merge: true });

      setWhitelistUsers(prev => prev.map(u => u.id === item.id ? { ...u, isActive: targetState } : u));
    } catch (err) {
      console.error("Toggle Error:", err);
    }
  };

  // 📋 एक्सेल कॉपी-पेस्ट बल्क इंपोर्टर (Name & Email)
  const handleBulkImportWhitelist = async () => {
    if (!bulkText.trim()) {
      Swal.fire({ icon: 'warning', title: 'Empty', text: 'कृपया एक्सेलच्या ओळी पेस्ट करा.' });
      return;
    }

    setBulkImporting(true);
    try {
      const lines = bulkText.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 3);
      const batch = writeBatch(db);
      let count = 0;

      for (let line of lines) {
        // पाईप (|), टॅब (\t) किंवा स्वल्पविराम (,) ऑटो-डिटेक्ट
        let delimiter = line.includes('|') ? '|' : line.includes('\t') ? '\t' : ',';
        let parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));

        // हेडर ओळ वगळणे
        if (parts[0]?.toLowerCase().includes('name') || parts[1]?.toLowerCase().includes('email')) {
          continue;
        }

        let pName = '';
        let pEmail = '';

        // कोणता कॉलम ईमेल आहे आणि कोणता नाव हे आपोआप ओळखणे
        if (parts[0]?.includes('@')) {
          pEmail = parts[0].toLowerCase();
          pName = parts[1] || parts[0].split('@')[0];
        } else if (parts[1]?.includes('@')) {
          pName = parts[0];
          pEmail = parts[1].toLowerCase();
        } else {
          continue; // वैध ईमेल नसल्यास ओळ सोडून द्या
        }

        const cleanEmail = pEmail.trim().toLowerCase();
        const docRef = doc(db, "spain_tour_whitelist", cleanEmail);

        // 🎯 फक्त ३ फील्ड्स सेव्ह करणे
        batch.set(docRef, {
          email: cleanEmail,
          name: pName.trim() || cleanEmail,
          isActive: true
        }, { merge: true });

        count++;
      }

      if (count === 0) {
        Swal.fire({ icon: 'warning', title: 'No Records', text: 'वैध ईमेल आयडी असलेल्या ओळी सापडल्या नाहीत.' });
        setBulkImporting(false);
        return;
      }

      await batch.commit();

      Swal.fire({
        icon: 'success',
        title: 'इंपोर्ट यशस्वी!',
        text: `एकूण ${count} पाहुणे spain_tour_whitelist मध्ये जोडले गेले.`,
        background: '#0c0d14',
        color: '#fff'
      });

      setBulkText('');
      setIsBulkModalOpen(false);
      loadSpainWhitelist();

    } catch (err) {
      console.error("Bulk Import Error:", err);
      Swal.fire({ icon: 'error', title: 'त्रुटी!', text: err.message, background: '#0c0d14', color: '#fff' });
    } finally {
      setBulkImporting(false);
    }
  };

  // Filter Logic (System Users)
  const filteredUsers = users.filter(u => {
    const uName = u.name || u.fullName || '';
    const uEmail = u.email || '';
    const uPhone = u.phone || '';
    const uDept = u.department || 'MRDGA';
    const uRole = u.role || 'Reviewer';
    const uActive = u.isActive !== false && u.status !== 'Inactive';

    const matchesSearch = uName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          uEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          uPhone.includes(searchTerm);

    const matchesDept = deptFilter === 'ALL' || uDept === deptFilter;
    const matchesRole = roleFilter === 'ALL' || uRole === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'ACTIVE' && uActive) || 
                          (statusFilter === 'INACTIVE' && !uActive);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  // Filter Logic (Spain Whitelist)
  const filteredSpainUsers = whitelistUsers.filter(item => {
    const sTerm = spainSearchTerm.trim().toLowerCase();
    const name = (item.name || '').toLowerCase();
    const email = (item.email || item.id || '').toLowerCase();
    return !sTerm || name.includes(sTerm) || email.includes(sTerm);
  });

  const isSelectedDeptMrdgaOrSuper = !isCustomDept && (department === 'MRDGA' || department === 'SUPER');

  if (!loading && currentRole !== 'Super Admin') {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या पृष्ठाचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-gray-400">फक्त Super Admin नवीन युझर्स मॅनेज करू शकतात.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto px-1 py-1 font-sans">
      
      {/* 🧭 NAVIGATION TABS */}
      <div className="flex gap-2 border-b border-amber-500/20 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('SYSTEM_USERS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'SYSTEM_USERS'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>कायमस्वरूपी युझर्स ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('SPAIN_WHITELIST');
            loadSpainWhitelist();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'SPAIN_WHITELIST'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-black/40 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <Plane className="w-3.5 h-3.5 text-indigo-300" />
          <span>🇪🇸 तात्पुरती स्पेन व्हॉईटलिस्ट</span>
          <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">
            {whitelistUsers.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM USERS (कायमस्वरूपी युझर्स - १००% मूळ कोड)                    */}
      {/* ========================================================================= */}
      {activeTab === 'SYSTEM_USERS' && (
        <div className="space-y-3">
          {/* COMPACT HEADER BAR */}
          <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-2.5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white leading-tight">
                  सिस्टीम युझर्स <span className="text-amber-400">({filteredUsers.length})</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddModal}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1 transition cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">नवीन</span> जोडा
              </button>
              <button onClick={loadUsersData} className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl cursor-pointer">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ULTRA COMPACT FILTERS BAR */}
          <div className="bg-black/60 border border-amber-500/20 p-2 rounded-2xl space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
              <input
                type="text"
                placeholder="नाव, ईमेल किंवा फोन नंबर..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/80 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50 font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-black/80 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-amber-400 font-bold focus:outline-none"
              >
                <option value="ALL">सर्व Dept</option>
                {departmentList.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-black/80 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white focus:outline-none"
              >
                <option value="ALL">सर्व Role</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Admin</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Viewer">Viewer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-black/80 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white focus:outline-none"
              >
                <option value="ALL">सर्व Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* CARDS LIST */}
          {loading ? (
            <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">युझर्स लोड होत आहेत...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणताही युझर सापडला नाही.</p>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((u) => {
                const isUserActive = u.isActive !== false && u.status !== 'Inactive';
                const userMods = u.allowedModules !== undefined && Array.isArray(u.allowedModules) ? u.allowedModules : ALL_MODULE_KEYS;
                const isMrdgaDept = u.department === 'MRDGA' || u.department === 'SUPER';
                const hasDesignation = isMrdgaDept && u.designation && u.designation !== '-';

                return (
                  <div 
                    key={u.email || u.id} 
                    className="p-3 rounded-2xl border border-amber-500/20 bg-black/50 backdrop-blur-md space-y-2 shadow-lg"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">
                            {u.name || u.fullName || 'नाव दिलेले नाही'}
                          </h4>
                          {hasDesignation && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              ⭐ {u.designation}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-amber-400/70 shrink-0" /> {u.email || u.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[8px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                          {u.department || 'MRDGA'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                          u.role === 'Super Admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                          u.role === 'Admin' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                          u.role === 'Viewer' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        }`}>
                          {u.role || 'Reviewer'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[9px] text-gray-400 font-semibold">ॲक्सेस:</span>
                      {userMods.length === 0 ? (
                        <span className="text-[8px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">कोणताही ॲक्सेस नाही</span>
                      ) : (
                        SYSTEM_MODULES.filter(m => userMods.includes(m.key)).map(m => (
                          <span key={m.key} className="text-[8px] bg-white/5 text-amber-300 border border-white/10 px-1.5 py-0.2 rounded font-bold">
                            {m.icon} {m.label}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-gray-300">
                          {u.phone ? u.phone : 'फोन नंबर नाही'}
                        </span>
                        {u.phone && (
                          <div className="flex items-center gap-1">
                            <a 
                              href={`https://wa.me/91${u.phone}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg"
                              title="WhatsApp करा"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                            <a 
                              href={`tel:${u.phone}`} 
                              className="p-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg"
                              title="कॉल करा"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isUserActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        <button
                          type="button"
                          onClick={() => handleEditClick(u)}
                          className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500 hover:text-black transition flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> एडिट
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPAIN WHITELIST (फक्त तात्पुरती ३ फील्ड्स यादी)                     */}
      {/* ========================================================================= */}
      {activeTab === 'SPAIN_WHITELIST' && (
        <div className="space-y-3">
          
          {/* HEADER & ADD BUTTON */}
          <div className="flex justify-between items-center bg-indigo-950/20 border border-indigo-500/30 p-2.5 rounded-2xl">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-indigo-400" /> स्पेन टूर तात्पुरती व्हॉईटलिस्ट ({filteredSpainUsers.length})
              </h2>
              <p className="text-[10px] text-slate-400">
                हे पाहुणे मुख्य <code>users</code> मध्ये ॲड न होता फक्त <code>spain_tour_whitelist</code> मध्ये राहतील.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSpainModalOpen(true)}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" /> + नवीन पाहुणा जोडा
              </button>

              <button
  type="button"
  onClick={() => setIsBulkModalOpen(true)}
  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md"
  title="एक्सेलवरून थेट अनेक पाहुणे ॲड करा"
>
  <ClipboardList className="w-3.5 h-3.5" /> Bulk Import
</button>
              <button 
                onClick={loadSpainWhitelist} 
                className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-indigo-400/60" />
            <input
              type="text"
              placeholder="नाव किंवा ईमेलने शोधा..."
              value={spainSearchTerm}
              onChange={(e) => setSpainSearchTerm(e.target.value)}
              className="w-full bg-black/80 border border-indigo-500/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 font-mono"
            />
          </div>

          {/* WHITELIST MEMBERS LIST */}
          {filteredSpainUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs bg-black/40 border border-dashed border-slate-800 rounded-2xl">
              कोणताही पाहुणा सापडला नाही. "+ नवीन पाहुणा जोडा" वर क्लिक करा.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredSpainUsers.map((item, idx) => {
                const isActive = item.isActive !== false;
                return (
                  <div 
                    key={item.id} 
                    className="p-2.5 bg-black/50 border border-slate-800 rounded-xl flex justify-between items-center shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-[10px] font-mono text-slate-500 w-5 shrink-0 text-center font-bold">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                          {item.name || item.email}
                        </h4>
                        <p className="text-[10px] text-indigo-300 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" /> {item.email || item.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSpainGuest(item)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border transition shadow-sm ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                        }`}
                      >
                        {isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SYSTEM USER MODAL (मूळ कोड)                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-md p-5 space-y-4 text-white relative shadow-2xl my-6">
            
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {isEditing ? 'युझर एडिट करा' : 'नवीन युझर जोडा'}
                </h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-300 font-semibold">Google Email ID*</label>
                <input
                  type="email"
                  required
                  disabled={isEditing}
                  placeholder="user@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none disabled:opacity-50 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-semibold">पूर्ण नाव</label>
                <input
                  type="text"
                  placeholder="उदा. रूपेश तेली"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none"
                />
              </div>

              {/* विभाग (Department) आणि युझर रोल */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-300 font-semibold">विभाग (Department)*</label>
                  {!isCustomDept ? (
                    <select
                      value={department}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setIsCustomDept(true);
                          setDepartment('');
                        } else {
                          setIsCustomDept(false);
                          setDepartment(e.target.value);
                        }
                      }}
                      className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-2 py-2 text-xs text-white mt-1 focus:outline-none"
                    >
                      {departmentList.map(dept => (
                        <option key={dept} value={dept} className="bg-[#0c0d14]">{dept}</option>
                      ))}
                      <option value="ADD_NEW" className="bg-amber-500/20 text-amber-400 font-bold">➕ नवीन जोडा...</option>
                    </select>
                  ) : (
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        placeholder="उदा. THANE"
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        className="w-full bg-black/80 border border-amber-400 rounded-xl px-2 py-2 text-xs text-amber-400 font-bold focus:outline-none"
                      />
                      <button type="button" onClick={() => { setIsCustomDept(false); setDepartment('MRDGA'); }} className="absolute right-1 top-2 text-[9px] text-gray-400">रद्द</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-gray-300 font-semibold">युझर रोल*</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-2 py-2 text-xs text-white mt-1 focus:outline-none font-bold"
                  >
                    <option value="Super Admin" className="bg-[#0c0d14]">Super Admin</option>
                    <option value="Admin" className="bg-[#0c0d14]">Admin</option>
                    <option value="Reviewer" className="bg-[#0c0d14]">Reviewer</option>
                    <option value="Viewer" className="bg-[#0c0d14]">Viewer (Read-Only)</option>
                  </select>
                </div>
              </div>

              {/* MRDGA संघटना पद */}
              {isSelectedDeptMrdgaOrSuper && (
                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">
                    MRDGA संघटना पद (Association Designation) *
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none"
                  >
                    {MRDGA_DESIGNATIONS.map(d => (
                      <option key={d} value={d} className="bg-[#0c0d14] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* मॉड्यूल्स Checkboxes */}
              <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-2xl border border-amber-500/20">
                <label className="text-[10px] text-amber-300 font-bold block">
                  परवानगी मॉड्यूल्स (Allowed Modules Access) *
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                  {SYSTEM_MODULES.map(mod => {
                    const isChecked = allowedModules.includes(mod.key);
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => handleModuleToggle(mod.key)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-black/40 border-white/5 text-gray-500'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="text-[11px] truncate">{mod.icon} {mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-semibold">फोन नंबर</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-white/5 text-gray-300 font-bold text-xs rounded-xl cursor-pointer">रद्द करा</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl disabled:opacity-50 cursor-pointer">
                  {saving ? 'सेव्ह होत आहे...' : 'सेव्ह करा'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SPAIN GUEST MODAL (केवळ ३ फील्ड्स: email, name, isActive)        */}
      {/* ========================================================================= */}
      {isSpainModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0c0d14] border border-indigo-500/40 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white">स्पेन तात्पुरता पाहुणा जोडा</h4>
              </div>
              <button onClick={() => setIsSpainModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <p className="text-[11px] text-slate-400">
              हा युझर फक्त <code>spain_tour_whitelist</code> मध्ये सेव्ह होईल. टूर संपल्यानंतर सहज डिलीट करता येईल.
            </p>

            <form onSubmit={handleSaveSpainGuest} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-300 font-semibold block mb-1">Google Email ID *</label>
                <input
                  type="email"
                  required
                  placeholder="guest@gmail.com"
                  value={spainEmail}
                  onChange={e => setSpainEmail(e.target.value)}
                  className="w-full bg-black/80 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-300 font-semibold block mb-1">पूर्ण नाव (Full Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रूपेश तेली"
                  value={spainName}
                  onChange={e => setSpainName(e.target.value)}
                  className="w-full bg-black/80 border border-slate-700 rounded-xl p-2.5 text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsSpainModalOpen(false)} 
                  className="flex-1 py-2 bg-slate-800 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  रद्द
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'सेव्ह होत आहे...' : 'व्हॉईटलिस्ट करा'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 📋 बल्क इंपोर्ट पॉपअप (Excel Paste) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0c0d14] border border-amber-500/40 rounded-3xl w-full max-w-lg p-5 space-y-3 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white">एक्सेल डेटा कॉपी-पेस्ट करा (Bulk Import)</h4>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-white p-1">✕</button>
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300">
              <p className="font-bold text-amber-400">📌 कसा डेटा पेस्ट करावा:</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                एक्सेलचे <b>Name</b> आणि <b>Email</b> हे दोन कॉलम कॉपी करून खाली पेस्ट करा. क्रम कोणताही असला (Name-Email किंवा Email-Name) तरी चालेल.
              </p>
            </div>

            <textarea
              rows={8}
              placeholder={`उदा:\nSANDESH MAHADIK\tsandesh@gmail.com\nRUPESH TELI\trupesh@gmail.com`}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="w-full bg-black/80 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none resize-y"
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono">
                {bulkText.trim() ? `${bulkText.trim().split(/\r?\n/).filter(l => l.trim().length > 3).length} ओळी डिटेक्ट झाल्या` : '० ओळी'}
              </span>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsBulkModalOpen(false)} 
                  className="px-3 py-1.5 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  रद्द
                </button>
                <button 
                  type="button" 
                  disabled={bulkImporting || !bulkText.trim()} 
                  onClick={handleBulkImportWhitelist}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkImporting ? 'अपलोड होत आहे...' : <><UploadCloud className="w-3.5 h-3.5" /> इंपोर्ट करा</>}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}