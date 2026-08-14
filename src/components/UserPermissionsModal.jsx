// ==========================================
// #SECTION 1: IMPORTS & PERMISSIONS SCHEMA
// ==========================================
import React, { useState } from 'react';
import { 
  X, ShieldCheck, CheckSquare, Square, 
  Lock, Trophy, BookOpen, Calendar, Users, Loader2 
} from 'lucide-react';
import { dataService } from '../services/dataService';
import Swal from 'sweetalert2';

// 🎯 सिस्टममधील मुख्य मॉड्यूल्स आणि त्यांच्या परवानग्या
const PERMISSION_MODULES = [
  {
    id: 'spardha',
    title: 'स्पर्धा नोंदणी (Spardha)',
    icon: Trophy,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    actions: [
      { key: 'view', label: 'पाहणे (View Teams)' },
      { key: 'edit', label: 'बदल करणे (Edit/Update)' },
      { key: 'export', label: 'डेटा डाउनलोड (Excel Export)' }
    ]
  },
  {
    id: 'insurance',
    title: 'गोविंदा विमा (Insurance)',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    actions: [
      { key: 'view', label: 'विमा अर्ज पाहणे (View)' },
      { key: 'approve', label: 'मंजूर करणे (Approve)' },
      { key: 'reject', label: 'नाकारणे (Reject)' },
      { key: 'duplicates', label: 'दुबार अर्ज तपासणी (Duplicates)' }
    ]
  },
  {
    id: 'mandal_directory',
    title: 'मंडळ डिरेक्टरी (Directory & Calling)',
    icon: BookOpen,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    actions: [
      { key: 'view', label: 'डिरेक्टरी पाहणे (View)' },
      { key: 'remark', label: 'कॉलिंग रिमार्क नोंदवणे (Add Remarks)' },
      { key: 'upload', label: 'एक्सेल अपलोड (Upload Data)' }
    ]
  },
  {
    id: 'meeting_rsvp',
    title: 'बैठक हजेरी (16 Aug RSVP)',
    icon: Calendar,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/30',
    actions: [
      { key: 'view', label: 'उपस्थिती यादी पाहणे (View RSVP)' },
      { key: 'checkin', label: 'हजेरी मार्क करणे (Attendance Check-in)' }
    ]
  },
  {
    id: 'user_management',
    title: 'अॅडमिन व्यवस्थापन (User Access)',
    icon: Users,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30',
    actions: [
      { key: 'manage', label: 'युझर व अधिकार देणे (Super Admin Only)' }
    ]
  }
];

export default function UserPermissionsModal({ user, onClose, onUpdated }) {
  // 🛡️ युझरच्या आधीच्या परवानग्या किंवा डिफॉल्ट्स लोड करणे
  const [permissions, setPermissions] = useState(() => {
    if (user?.permissions && typeof user.permissions === 'object') {
      return user.permissions;
    }
    // जुन्या युझरसाठी सेफ डिफॉल्ट्स
    const isSuper = user?.role === 'Super Admin';
    const isAdmin = user?.role === 'Admin';

    return {
      spardha: { view: true, edit: isSuper || isAdmin, export: isSuper },
      insurance: { view: true, approve: isSuper || isAdmin, reject: isSuper || isAdmin, duplicates: true },
      mandal_directory: { view: true, remark: true, upload: isSuper },
      meeting_rsvp: { view: true, checkin: true },
      user_management: { manage: isSuper }
    };
  });

  const [saving, setSaving] = useState(false);

  // 🔄 चेकबॉक्स टॉगल हँडलर
  const handleToggle = (moduleId, actionKey) => {
    setPermissions(prev => {
      const moduleState = prev[moduleId] || {};
      return {
        ...prev,
        [moduleId]: {
          ...moduleState,
          [actionKey]: !moduleState[actionKey]
        }
      };
    });
  };

  // ⚡ पूर्ण मॉड्यूल ऑल ऑन / ऑल ऑफ
  const handleToggleModuleAll = (moduleObj) => {
    setPermissions(prev => {
      const moduleState = prev[moduleObj.id] || {};
      const allChecked = moduleObj.actions.every(act => moduleState[act.key]);
      
      const newModuleState = {};
      moduleObj.actions.forEach(act => {
        newModuleState[act.key] = !allChecked;
      });

      return {
        ...prev,
        [moduleObj.id]: newModuleState
      };
    });
  };

  // 💾 सेव्ह करणे (Save to Firestore)
  const handleSave = async () => {
    setSaving(true);
    try {
      await dataService.createOrUpdateUser({
        ...user,
        permissions
      });

      Swal.fire({
        icon: 'success',
        title: 'अधिकार अद्ययावत झाले!',
        text: `${user.name || user.email} च्या परवानग्या सेव्ह झाल्या.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#0c0d14',
        color: '#fff'
      });

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error("Save permissions error:", err);
      Swal.fire({
        icon: 'error',
        title: 'त्रुटी!',
        text: 'परवानग्या सेव्ह करता आल्या नाहीत.',
        background: '#0c0d14',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="bg-[#0c0d14] border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col text-white shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-900/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-white">
                युझर ॲक्सेस व अधिकार व्यवस्थापन
              </h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[250px] sm:max-w-none">
                <b>{user.name || 'युझर'}</b> ({user.email}) - <span className="text-amber-400 font-mono">{user.role}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permissions Grid Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {PERMISSION_MODULES.map(mod => {
            const ModIcon = mod.icon;
            const currentModPerms = permissions[mod.id] || {};
            const allChecked = mod.actions.every(act => currentModPerms[act.key]);

            return (
              <div 
                key={mod.id}
                className="bg-slate-950 p-3 rounded-2xl border border-white/5 space-y-2 hover:border-amber-500/30 transition shadow"
              >
                {/* Module Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${mod.bgColor} ${mod.color}`}>
                      <ModIcon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-white">{mod.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleModuleAll(mod)}
                    className="text-[10px] text-amber-400/80 hover:text-amber-300 font-semibold px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                  >
                    {allChecked ? 'सर्व काढा' : 'सर्व निवडा'}
                  </button>
                </div>

                {/* Module Checkboxes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {mod.actions.map(act => {
                    const isChecked = !!currentModPerms[act.key];

                    return (
                      <label
                        key={act.key}
                        onClick={() => handleToggle(mod.id, act.key)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                          isChecked 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-bold' 
                            : 'bg-black/40 border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                        <span className="truncate">{act.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 text-gray-300 font-bold text-xs rounded-xl hover:bg-white/10 cursor-pointer"
          >
            रद्द करा
          </button>
          
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-lg"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>अधिकार सेव्ह करा</span>
          </button>
        </div>

      </div>
    </div>
  );
}