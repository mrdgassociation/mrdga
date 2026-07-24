// ==========================================
// #SECTION 1: IMPORTS
// ==========================================
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { 
  UserPlus, UserCheck, Mail, Edit, RefreshCw, Lock, X, 
  Building2, Search, Filter, Phone, MessageSquare, ShieldCheck, UserX 
} from 'lucide-react';

export default function UserManagement() {
  // ==========================================
  // #SECTION 2: STATES
  // ==========================================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('');
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Reviewer');
  const [department, setDepartment] = useState('MRDGA');
  const [customDepartment, setCustomDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [saving, setSaving] = useState(false);

  const [departmentList, setDepartmentList] = useState(['MRDGA', 'INSURANCE', 'SUPER']);

  // ==========================================
  // #SECTION 3: FETCH DATA
  // ==========================================
  const loadUsersData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAllUsers();
      const loadedUsers = data || [];
      setUsers(loadedUsers);

      const existingDepts = loadedUsers
        .map(u => u.department)
        .filter(d => d && typeof d === 'string');

      const uniqueDepts = Array.from(new Set(['MRDGA', 'INSURANCE', 'SUPER', ...existingDepts]));
      setDepartmentList(uniqueDepts);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
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
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // #SECTION 4: HANDLERS
  // ==========================================
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEmail('');
    setName('');
    setPhone('');
    setRole('Reviewer');
    setDepartment('MRDGA');
    setCustomDepartment('');
    setIsCustomDept(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (u) => {
    setIsEditing(true);
    setEmail(u.email);
    setName(u.name || '');
    setPhone(u.phone || '');
    setRole(u.role || 'Reviewer');
    setDepartment(u.department || 'MRDGA');
    setCustomDepartment('');
    setIsCustomDept(false);
    setIsModalOpen(true);
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

    setSaving(true);
    try {
      await dataService.createOrUpdateUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone.trim(),
        role,
        department: finalDepartment,
        isActive: true,
        status: 'Active'
      });

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

  // Filter Logic
  const filteredUsers = users.filter(u => {
    const uName = u.name || '';
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
      
      {/* 🔹 COMPACT HEADER BAR */}
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-2.5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white leading-tight">
              युझर मॅनेजमेंट <span className="text-amber-400">({filteredUsers.length})</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">नवीन</span> जोडा
          </button>
          <button onClick={loadUsersData} className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🔍 ULTRA COMPACT FILTERS BAR (मोबाईलवर अजिबात जागा न खाणारा १ ओळीचा फिल्टर) */}
      <div className="bg-black/60 border border-amber-500/20 p-2 rounded-2xl space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/60" />
          <input
            type="text"
            placeholder="नाव, ईमेल किंवा फोन नंबर..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/80 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/50"
          />
        </div>

        {/* 3 Dropdowns in 1 Row on Mobile */}
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

      {/* 📱 BEAUTIFUL SINGLE-COLUMN CARDS LIST (मूळ कार्ड डिझाईन पण १-कॉलम व्ह्यू) */}
      {loading ? (
        <p className="p-8 text-center text-amber-400 font-semibold text-xs animate-pulse">युझर्स लोड होत आहेत...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="p-8 text-center text-gray-400 text-xs font-medium">कोणताही युझर सापडला नाही.</p>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((u) => {
            const isUserActive = u.isActive !== false && u.status !== 'Inactive';

            return (
              <div 
                key={u.email} 
                className="p-3 rounded-2xl border border-amber-500/20 bg-black/50 backdrop-blur-md space-y-2 shadow-lg"
              >
                {/* Header Row: Title, Dept & Role Badges */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">
                      {u.name || 'नाव दिलेले नाही'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-amber-400/70 shrink-0" /> {u.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
                      {u.department || 'MRDGA'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                      u.role === 'Super Admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                      u.role === 'Admin' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    }`}>
                      {u.role || 'Reviewer'}
                    </span>
                  </div>
                </div>

                {/* Footer Row: Calling & WhatsApp Actions + Edit */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  {/* Phone & Instant Call/WA Actions */}
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

                  {/* Status & Edit Button */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isUserActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    <button
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

      {/* 🔹 MODAL POPUP FOR ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-md p-5 space-y-4 text-white relative shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {isEditing ? 'युझर एडिट करा' : 'नवीन युझर जोडा'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white">
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
                    className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-2 py-2 text-xs text-white mt-1 focus:outline-none"
                  >
                    <option value="Reviewer" className="bg-[#0c0d14]">Reviewer</option>
                    <option value="Admin" className="bg-[#0c0d14]">Admin</option>
                    <option value="Super Admin" className="bg-[#0c0d14]">Super Admin</option>
                  </select>
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-white/5 text-gray-300 font-bold text-xs rounded-xl">रद्द करा</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl disabled:opacity-50">
                  {saving ? 'सेव्ह होत आहे...' : 'सेव्ह करा'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}