// ==========================================
// #SECTION 1: IMPORTS
// ==========================================
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import { UserPlus, UserCheck, Mail, Edit, RefreshCw, Lock, X, Shield, Phone, CheckCircle } from 'lucide-react';

export default function UserManagement() {
  // ==========================================
  // #SECTION 2: STATES
  // ==========================================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('');
  
  // Modal Popup State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Reviewer');
  const [saving, setSaving] = useState(false);

  // ==========================================
  // #SECTION 3: FETCH DATA
  // ==========================================
  const loadUsersData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAllUsers();
      setTeamsUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  const setTeamsUsers = (data) => {
    setUsers(data);
  };

  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (user) => {
      if (user) {
        try {
          const uDoc = await authService.getUserRole(user.email);
          if (uDoc && uDoc.role) {
            setCurrentRole(uDoc.role);
          }
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
    setIsModalOpen(true);
  };

  const handleEditClick = (u) => {
    setIsEditing(true);
    setEmail(u.email);
    setName(u.name || '');
    setPhone(u.phone || '');
    setRole(u.role || 'Reviewer');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    try {
      await dataService.createOrUpdateUser({
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        role,
        isActive: true
      });

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'युझर अपडेट झाला!' : 'नवीन युझर जोडला!',
        timer: 1200,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      setIsModalOpen(false); // Modal बंद करा
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

  // Only Super Admin Security Restriction
  if (!loading && currentRole !== 'Super Admin') {
    return (
      <div className="p-8 text-center space-y-3">
        <Lock className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-white">तुम्हाला या पृष्ठाचा ॲक्सेस नाही.</h2>
        <p className="text-xs text-gray-400">फक्त Super Admin नवीन युझर्स मॅनेज करू शकतात.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-1 py-1 font-sans">
      
      {/* 🔹 HEADER BAR WITH ADD BUTTON */}
      <div className="flex justify-between items-center bg-black/50 border border-amber-500/20 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white leading-tight">
              युझर मॅनेजमेंट <span className="text-amber-400">({users.length})</span>
            </h2>
            <p className="text-[10px] text-gray-400">अधिकृत ॲडमिन्स व रिव्ह्युअर्स</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add User Modal Trigger Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
          >
            <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">नवीन</span> युझर जोडा
          </button>

          <button 
            onClick={loadUsersData} 
            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🔹 USERS LIST GRID */}
      {loading ? (
        <p className="p-12 text-center text-amber-400 font-semibold text-xs animate-pulse">युझर्स लोड होत आहेत...</p>
      ) : users.length === 0 ? (
        <p className="p-12 text-center text-gray-400 text-xs font-medium">कोणताही युझर जोडलेला नाही.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {users.map((u) => (
            <div key={u.email} className="glass-panel p-3.5 rounded-2xl border border-amber-500/15 bg-black/40 space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white leading-tight">{u.name || 'नाव दिलेले नाही'}</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-amber-400/70 shrink-0" /> {u.email}
                  </p>
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border shrink-0 ${
                  u.role === 'Super Admin' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                  u.role === 'Admin' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/40'
                }`}>
                  {u.role || 'Reviewer'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
                <span className="font-mono text-[10px]">{u.phone ? `📞 ${u.phone}` : 'फोन नाही'}</span>
                <button
                  onClick={() => handleEditClick(u)}
                  className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500 hover:text-black transition flex items-center gap-1 font-bold text-[10px]"
                >
                  <Edit className="w-3 h-3" /> एडिट / रोल बदला
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔹 MODAL POPUP FOR ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 rounded-3xl w-full max-w-md p-5 space-y-4 text-white relative shadow-2xl animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isEditing ? 'युझर एडिट करा' : 'नवीन युझर जोडा'}
                </h3>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 bg-black/40 text-gray-400 hover:text-white rounded-xl border border-amber-500/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-300 font-semibold">Google Email ID*</label>
                <input
                  type="email"
                  required
                  disabled={isEditing} // Editing करताना ईमेल बदलता येत नाही
                  placeholder="mrdga.user@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-400/50 disabled:opacity-50 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-semibold">पूर्ण नाव</label>
                <input
                  type="text"
                  placeholder="उदा. रूपेश तेली"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-semibold">फोन नंबर</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-400/50 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-300 font-semibold">युझर रोल (अधिकार)*</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none"
                >
                  <option value="Reviewer" className="bg-[#0c0d14]">Reviewer (कॉल/व्हॉट्सॲप & रिमार्क्स)</option>
                  <option value="Admin" className="bg-[#0c0d14]">Admin (Approve / Reject)</option>
                  <option value="Super Admin" className="bg-[#0c0d14]">Super Admin (पूर्ण अधिकार)</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl transition border border-white/10"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition disabled:opacity-50"
                >
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