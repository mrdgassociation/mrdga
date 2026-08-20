// ==========================================
// #SECTION: COMPACT HELPDESK (4-COL MOBILE + SEARCH & DISTRICT FILTER + SUPERADMIN)
// ==========================================
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Phone, HelpCircle, MessageSquare, Plus, Edit, Trash2, 
  MapPin, X, Check, Search, Filter 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { contactService } from '../services/contactService';
import { authService } from '../services/authService';

// 📂 DEFAULT FALLBACK DATA (जर डेटाबेस रिकामी असेल तर)
const defaultContactData = [
  {
    id: "cat-1",
    categoryTitle: "🏛️ MRDGA कामकाज व अधिकृत संपर्क",
    categoryDesc: "असोसिएशन नोंदणी, नियम व सर्वसाधारण चौकशीसाठी",
    contacts: [
      { id: "c1", name: "श्रीकृष्ण (बाळा) पडेलकर", role: "अध्यक्ष", phone: "9800000000", whatsapp: "919800000000", district: "सर्व राज्य" },
      { id: "c2", name: "गीता झगडे", role: "सचिव", phone: "9800000001", whatsapp: "919800000001", district: "सर्व राज्य" }
    ]
  },
  {
    id: "cat-2",
    categoryTitle: "🛡️ Insurance (विमा) संबंधित मार्गदर्शन",
    categoryDesc: "गोविंदा अपघात विमा फॉर्म, कागदपत्रे व क्लेम मदतीसाठी",
    contacts: [
      { id: "c3", name: "सौ. शिल्पा पवार", role: "शाखा प्रबंधक (दि ओरिएंटल इन्शुरन्स)", phone: "8422919066", whatsapp: "918422919066", district: "चर्चगेट ऑफिस" },
      { id: "c4", name: "विजय सालवकर", role: "MRDGA विमा समन्वयक", phone: "9819000880", whatsapp: "919819000880", district: "मुंबई व उपनगर" }
    ]
  },
  {
    id: "cat-3",
    categoryTitle: "🏆 MRDGA व इतर स्पर्धांची माहिती",
    categoryDesc: "राज्यस्तरीय स्पर्धा नोंदणी, नियम व वेळापत्रक माहिती",
    contacts: [
      { id: "c5", name: "राजेश सोनावडेकर", role: "स्पर्धा सहभाग नोंदणी", phone: "9800000002", whatsapp: "919800000002", district: "मुंबई उपनगर" },
      { id: "c6", name: "संदीप काणेकर", role: "स्पर्धा नोंदणी", phone: "9800000003", whatsapp: "919800000003", district: "मुंबई शहर" },
      { id: "c7", name: "विवेक नाक्ती", role: "स्पर्धा नोंदणी", phone: "9800000004", whatsapp: "919800000004", district: "मुंबई शहर" }
    ]
  }
];

export default function Helpdesk() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // 📦 Contacts State
  const [contactGroups, setContactGroups] = useState(() => {
    const saved = localStorage.getItem("mrdga_contacts_cache");
    return saved ? JSON.parse(saved) : defaultContactData;
  });

  // 🔍 शोध आणि जिल्हा फिल्टर स्टेट्स
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [activeCatId, setActiveCatId] = useState("");

  // Form Fields State
  const [formData, setFormData] = useState({ name: "", role: "", phone: "", whatsapp: "", district: "" });
  const [newCatTitle, setNewCatTitle] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  // 🔐 1. AUTH SERVICE INTEGRATION (Super Admin चेक)
  useEffect(() => {
    const unsubscribe = authService.getCurrentUser(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const userData = await authService.getUserRole(firebaseUser.email);
          if (userData && userData.role === 'Super Admin') {
            setIsSuperAdmin(true);
          } else {
            setIsSuperAdmin(false);
          }
        } catch (err) {
          console.error("User role check error:", err);
          setIsSuperAdmin(false);
        }
      } else {
        setIsSuperAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔄 2. READ DATA FROM FIREBASE
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await contactService.getContacts();
      if (data && data.length > 0) {
        setContactGroups(data);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // 💾 3. SAVE HELPER FOR ADMIN
  const updateAndSaveData = async (newGroups) => {
    if (!isSuperAdmin) {
      Swal.fire({ icon: 'error', title: 'अधिकार नाहीत!', text: 'फक्त सुपरअ‍ॅडमिन हे बदल करू शकतात.' });
      return;
    }
    setContactGroups(newGroups);
    try {
      await contactService.saveContacts(newGroups);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'फायरबेसवर सेव्ह करताना अडचण आली!' });
    }
  };

  // ➕ 4. ADD NEW CATEGORY
  const handleAddCategory = () => {
    if (!newCatTitle.trim()) return;
    const newCat = {
      id: `cat-${Date.now()}`,
      categoryTitle: newCatTitle,
      categoryDesc: "विशेष मार्गदर्शन व संपर्क कक्ष",
      contacts: []
    };
    const updated = [...contactGroups, newCat];
    updateAndSaveData(updated);
    setNewCatTitle("");
    setShowNewCatInput(false);
  };

  // 🗑️ 5. DELETE CATEGORY
  const handleDeleteCategory = (catId) => {
    Swal.fire({
      title: 'ही कॅटेगरी हटवायची आहे का?',
      text: "यातील सर्व संपर्क नंबर हटवले जातील!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'होय, डिलीट करा',
      cancelButtonText: 'रद्द करा',
      background: '#0c0d14',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = contactGroups.filter(c => c.id !== catId);
        updateAndSaveData(updated);
      }
    });
  };

  // 📝 6. OPEN ADD / EDIT CONTACT MODAL
  const openContactModal = (catId, contact = null) => {
    setActiveCatId(catId);
    if (contact) {
      setEditingContact(contact);
      setFormData({ name: contact.name, role: contact.role, phone: contact.phone, whatsapp: contact.whatsapp || contact.phone, district: contact.district || "" });
    } else {
      setEditingContact(null);
      setFormData({ name: "", role: "", phone: "", whatsapp: "", district: "" });
    }
    setShowModal(true);
  };

  // 💾 7. SAVE CONTACT (ADD / UPDATE)
  const handleSaveContact = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    const updatedGroups = contactGroups.map(group => {
      if (group.id !== activeCatId) return group;

      if (editingContact) {
        const updatedContacts = group.contacts.map(item => 
          item.id === editingContact.id ? { ...item, ...formData } : item
        );
        return { ...group, contacts: updatedContacts };
      } else {
        const newContact = { id: `c-${Date.now()}`, ...formData };
        return { ...group, contacts: [...group.contacts, newContact] };
      }
    });

    updateAndSaveData(updatedGroups);
    setShowModal(false);
    Swal.fire({ icon: 'success', title: 'संपर्क जतन झाला!', timer: 1200, showConfirmButton: false });
  };

  // 🗑️ 8. DELETE CONTACT
  const handleDeleteContact = (catId, contactId) => {
    const updatedGroups = contactGroups.map(group => {
      if (group.id !== catId) return group;
      return { ...group, contacts: group.contacts.filter(c => c.id !== contactId) };
    });
    updateAndSaveData(updatedGroups);
  };

  // 📍 सर्व युनिक जिल्ह्यांची यादी काढणे
  const allDistricts = useMemo(() => {
    const distSet = new Set();
    contactGroups.forEach(g => {
      (g.contacts || []).forEach(c => {
        if (c.district) distSet.add(c.district.trim());
      });
    });
    return Array.from(distSet);
  }, [contactGroups]);

  // 🔍 सर्च व जिल्हा फिल्टर केलेले ग्रुप्स
  const filteredGroups = useMemo(() => {
    return contactGroups.map(group => {
      const matchedContacts = (group.contacts || []).filter(c => {
        const matchSearch = 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.phone.includes(searchQuery);

        const matchDist = selectedDistrict === "ALL" || c.district === selectedDistrict;

        return matchSearch && matchDist;
      });

      return {
        ...group,
        contacts: matchedContacts
      };
    }).filter(group => group.contacts.length > 0 || isSuperAdmin);
  }, [contactGroups, searchQuery, selectedDistrict, isSuperAdmin]);

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-white font-sans select-none">
      <Navbar />

      <main className="max-w-6xl mx-auto p-3 sm:p-6 flex-1 w-full space-y-4">

        {/* 👑 HEADER & SEARCH / DISTRICT FILTER BAR */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0c0d14] to-[#0c0d14] border border-amber-500/20 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-base sm:text-2xl font-black text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                <span>मदत केंद्र व अधिकृत संपर्क <span className="text-slate-400 text-xs sm:text-sm font-normal">(Helpdesk & Support)</span></span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                MRDGA असोसिएशन, अपघात विमा व स्पर्धा मार्गदर्शनासाठी विभागवार संपर्क प्रतिनिधी
              </p>
            </div>

            {/* 🟧 Admin "Add Category" Button */}
            {isSuperAdmin && !showNewCatInput && (
              <button
                onClick={() => setShowNewCatInput(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#161822] hover:bg-[#1f2233] text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" /> + कॅटेगरी जोडा (Admin)
              </button>
            )}
          </div>

          {/* 🔍 सर्च व जिल्हा फिल्टर कंट्रोल्स */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-white/5">
            <div className="sm:col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-amber-400/70" />
              <input
                type="text"
                placeholder="नाव, पद, जिल्हा किंवा फोन नंबरने शोधा..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400/50 cursor-pointer"
              >
                <option value="ALL" className="bg-[#0c0d14] text-white">सर्व जिल्हे / विभाग ({allDistricts.length})</option>
                {allDistricts.map(d => (
                  <option key={d} value={d} className="bg-[#0c0d14] text-white">{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ➕ NEW CATEGORY INPUT */}
        {isSuperAdmin && showNewCatInput && (
          <div className="p-3 sm:p-4 rounded-2xl bg-[#0c0d14] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs font-bold text-amber-400">
              🛠️ Admin Panel: नवीन विभाग किंवा जिल्हा कॅटेगरीचे नाव टाका
            </span>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="उदा. 📍 पालघर जिल्हा विशेष संपर्क"
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 w-full sm:w-64"
              />
              <button onClick={handleAddCategory} className="p-1.5 bg-emerald-500 text-black rounded-lg font-bold cursor-pointer"><Check className="w-4 h-4"/></button>
              <button onClick={() => setShowNewCatInput(false)} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg cursor-pointer"><X className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {/* 📂 CATEGORIES & CONTACT CARDS GRID */}
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="p-6 text-center bg-black/30 rounded-xl border border-white/5 space-y-1">
              <p className="text-xs text-slate-400 font-bold">कोणतेही संपर्क सापडले नाहीत.</p>
              <button onClick={() => { setSearchQuery(""); setSelectedDistrict("ALL"); }} className="text-[10px] text-amber-400 underline cursor-pointer">सर्व संपर्क दाखवा</button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.id} className="space-y-2.5">
                
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 px-1">
                  <div>
                    <h2 className="text-xs sm:text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
                      {group.categoryTitle}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">{group.categoryDesc}</p>
                  </div>

                  {/* 🔒 Admin Category Controls */}
                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openContactModal(group.id)}
                        className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] sm:text-[11px] font-bold hover:bg-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + नंबर जोडा
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(group.id)}
                        className="p-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/30 transition cursor-pointer"
                        title="कॅटेगरी डिलीट करा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 🎯 मोबाईलवर एका रांगेत ४ बॉक्स (4 Columns on Mobile) */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2">
                  {group.contacts.length === 0 ? (
                    <p className="col-span-full text-xs text-slate-500 italic p-3 bg-[#0c0d14] rounded-xl border border-slate-900">
                      या कॅटेगरीमध्ये सध्या कोणतेही संपर्क जोडलेले नाहीत.
                    </p>
                  ) : (
                    group.contacts.map((contact) => (
                      <div 
                        key={contact.id} 
                        className="bg-[#0c0d14] p-1.5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between items-center text-center shadow-md relative group"
                      >
                        {/* 👑 सुपर ॲडमिन Edit/Delete बटन्स (वरच्या कोपऱ्यात) */}
                        {isSuperAdmin && (
                          <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10 bg-black/80 rounded p-0.5 border border-slate-800">
                            <button
                              onClick={() => openContactModal(group.id, contact)}
                              className="p-0.5 text-slate-300 hover:text-amber-400 cursor-pointer"
                              title="एडिट करा"
                            >
                              <Edit className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(group.id, contact.id)}
                              className="p-0.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                              title="डिलीट करा"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* संपर्क माहिती (नाव व जिल्हा) */}
                        <div className="w-full space-y-0.5 pt-0.5">
                          <h3 className="font-extrabold text-white text-[9px] sm:text-[11px] leading-tight break-words" title={contact.name}>
                            {contact.name}
                          </h3>

                          <p className="text-[7.5px] sm:text-[9px] text-slate-400 leading-tight break-words" title={contact.role}>
                            {contact.role}
                          </p>

                          {contact.district && (
                            <div className="pt-0.5">
                              <span className="inline-block px-1 py-0.2 bg-slate-900 border border-slate-800 text-amber-300 text-[7px] sm:text-[8px] font-bold rounded truncate max-w-full">
                                {contact.district}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ⚡ कॉल व WhatsApp चे आयकॉन्स */}
                        <div className="w-full pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-center gap-1">
                          <a 
                            href={`tel:${contact.phone}`}
                            className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition flex items-center justify-center shadow-sm cursor-pointer"
                            title={`कॉल करा: ${contact.phone}`}
                          >
                            <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </a>

                          <a 
                            href={`https://wa.me/${contact.whatsapp || contact.phone}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition flex items-center justify-center shadow-sm cursor-pointer"
                            title="WhatsApp करा"
                          >
                            <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </a>
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </section>
            ))
          )}
        </div>

      </main>

      {/* 📝 SUPERADMIN MODAL FOR ADDING / EDITING CONTACT */}
      {showModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d14] border border-amber-500/30 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400">
                {editingContact ? "✏️ संपर्क अपडेट करा" : "➕ नवीन संपर्क जोडा"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">नाव (Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. श्री. सचिन शिंदे"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">पद / जबाबदारी (Role/Department) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. विमा समन्वयक / जिल्हा प्रतिनिधी"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">फोन नंबर (Phone) *</label>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">जिल्हा (District)</label>
                  <input
                    type="text"
                    placeholder="उदा. ठाणे / मुंबई"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WhatsApp नंबर (देश कोडासह)</label>
                <input
                  type="text"
                  placeholder="919876543210"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition cursor-pointer"
                >
                  सेव्ह करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}