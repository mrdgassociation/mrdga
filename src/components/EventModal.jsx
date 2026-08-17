// ==========================================
// #SECTION: EVENT GALLERY MODAL (WITH PHOTO REORDERING & DRAG-DROP)
// ==========================================
import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Loader2, Sparkles, Image as ImageIcon, ArrowLeft, ArrowRight, Star } from 'lucide-react';
import Swal from 'sweetalert2';

export default function EventModal({ isOpen, onClose, onSave, eventData, saving }) {
  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    year: '2026',
    location: '',
    description: '',
    coverPhoto: '',
    photos: []
  });

  const [uploading, setUploading] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

  // 🔑 ImgBB API Key (.env किंवा थेट)
  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "c89b25fb5dd3c563e46cbbff9e5bb658";

  useEffect(() => {
    if (eventData) {
      setFormData({
        title: eventData.title || '',
        eventDate: eventData.eventDate || '',
        year: eventData.year || '2026',
        location: eventData.location || '',
        description: eventData.description || '',
        coverPhoto: eventData.coverPhoto || '',
        photos: eventData.photos || []
      });
    } else {
      setFormData({
        title: '',
        eventDate: new Date().toISOString().slice(0, 10),
        year: new Date().getFullYear().toString(),
        location: 'मुंबई',
        description: '',
        coverPhoto: '',
        photos: []
      });
    }
  }, [eventData]);

  if (!isOpen) return null;

  const handleDateChange = (val) => {
    const y = val ? new Date(val).getFullYear().toString() : '2026';
    setFormData(prev => ({ ...prev, eventDate: val, year: y }));
  };

  
  // ⚡ स्मार्ट इमेज कॉम्प्रेसर (Browser Canvas Compression)
  const compressImage = (file, maxWidth = 1600, quality = 0.8) => {
    return new Promise((resolve) => {
      // जर फाईल इमेज नसेल किंवा खूप लहान (उदा. < 200KB) असेल तर थेट पाठवा
      if (!file.type.startsWith('image/') || file.size < 200 * 1024) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // प्रमाणाशीर रिसाइज (Proportional Resize to max 1600px)
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG फॉरमॅटमध्ये 80% हाय-क्वालिटी कॉम्प्रेस करणे
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  // 📸 ImgBB वर ऑटो-कॉम्प्रेस करून फोटो अपलोड करणे
  const handleFilesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!IMGBB_API_KEY) {
      Swal.fire({ icon: 'error', title: 'API Key सापडली नाही!' });
      return;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];

        // १. आधी ब्राउझरमध्येच फोटो कॉम्प्रेस करा (५ MB -> ~२५० KB)
        const compressedFile = await compressImage(originalFile);

        // २. कॉम्प्रेस झालेली फाईल ImgBB वर पाठवा
        const bodyFormData = new FormData();
        bodyFormData.append('image', compressedFile);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: bodyFormData
        });

        const data = await res.json();
        if (data && data.success && data.data && data.data.url) {
          uploadedUrls.push(data.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...uploadedUrls],
          coverPhoto: prev.coverPhoto || uploadedUrls[0] || ''
        }));

        Swal.fire({
          icon: 'success',
          title: `${uploadedUrls.length} फोटो कॉम्प्रेस होऊन जलद अपलोड झाले!`,
          timer: 1500,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error("ImgBB Upload Error:", err);
      Swal.fire({ icon: 'error', title: 'अपलोड अयशस्वी!', text: 'कृपया पुन्हा प्रयत्न करा.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };



  // 🔄 फोटोचा क्रम पुढे-मागे करणे (Move Left/Right)
  const handleMovePhoto = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formData.photos.length) return;

    setFormData(prev => {
      const updated = [...prev.photos];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, photos: updated };
    });
  };

  // 🖱️ Drag and Drop Reordering
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setFormData(prev => {
      const updated = [...prev.photos];
      const draggedItem = updated.splice(draggedIndex, 1)[0];
      updated.splice(dropIndex, 0, draggedItem);
      return { ...prev, photos: updated };
    });
    setDraggedIndex(null);
  };

  // 🗑️ एका फोटोला काढून टाकणे
  const handleRemovePhoto = (index) => {
    setFormData(prev => {
      const updated = prev.photos.filter((_, i) => i !== index);
      let newCover = prev.coverPhoto;
      if (prev.coverPhoto === prev.photos[index]) {
        newCover = updated[0] || '';
      }
      return { ...prev, photos: updated, coverPhoto: newCover };
    });
  };

  // 🔗 थेट URL ने फोटो जोडणे
  const handleAddDirectUrl = () => {
    if (!newPhotoUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, newPhotoUrl.trim()],
      coverPhoto: prev.coverPhoto || newPhotoUrl.trim()
    }));
    setNewPhotoUrl('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'इव्हेंटचे नाव आवश्यक आहे!' });
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[92vh] rounded-3xl overflow-y-auto shadow-2xl flex flex-col p-4 sm:p-6 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              {eventData ? 'इव्हेंट गॅलरी एडिट करा' : 'नवीन इव्हेंट व गॅलरी जोडा'}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* इव्हेंट तपशील */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">इव्हेंटचे नाव / मोहीम *</label>
              <input
                type="text"
                required
                placeholder="उदा. श्रीकृष्ण जन्मोत्सव बैठक २०२६ किंवा राज्यस्तरीय स्पर्धा"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">इव्हेंट तारीख *</label>
                <input
                  type="date"
                  required
                  value={formData.eventDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">वर्ष (Year)</label>
                <input
                  type="text"
                  disabled
                  value={formData.year}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-1.5 text-amber-300 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">ठिकाण (Location)</label>
                <input
                  type="text"
                  placeholder="उदा. रवींद्र नाट्य मंदिर, मुंबई"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 font-semibold block mb-1">थोडक्यात माहिती (Short Description)</label>
              <textarea
                rows={2}
                placeholder="इव्हेंटबद्दल २ ओळींची माहिती..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* 📸 फोटो अपलोड & क्रम बदल विभाग (ImgBB + Reordering) */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="font-bold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" /> इव्हेंटचे फोटो ({formData.photos.length})
                </p>
                <p className="text-[10px] text-slate-400">
                  क्रम बदलण्यासाठी फोटो ड्रॅग करा किंवा <b className="text-amber-300">◀ ▶</b> बाण वापरा.
                </p>
              </div>

              <label className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{uploading ? 'अपलोड होत आहे...' : 'फोटो निवडा (Upload)'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleFilesUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct Image URL input */}
            <div className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="किंवा थेट फोटो URL टाका..."
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDirectUrl}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                + जोडा
              </button>
            </div>

            {/* 🖼️ फोटो ग्रिड विथ रीऑर्डरिंग (Reorderable Thumbnails Grid) */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2 max-h-72 overflow-y-auto p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                {formData.photos.map((url, idx) => {
                  const isCover = formData.coverPhoto === url;
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      className={`relative group rounded-xl overflow-hidden border bg-black aspect-square flex flex-col justify-between transition-all select-none ${
                        isCover ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-slate-800 hover:border-slate-600'
                      } ${draggedIndex === idx ? 'opacity-40 scale-95' : 'opacity-100'}`}
                    >
                      {/* फोटो इमेज (Auto-fit contain) */}
                      <div className="w-full h-full flex items-center justify-center p-1 cursor-grab active:cursor-grabbing">
                        <img src={url} alt={`img-${idx}`} className="max-w-full max-h-full object-contain pointer-events-none" />
                      </div>

                      {/* वरची पट्टी: क्रमांक बॅज & डिलीट */}
                      <div className="absolute top-1 inset-x-1 flex justify-between items-center pointer-events-auto">
                        <span className="text-[10px] font-mono font-black bg-black/80 text-amber-400 px-1.5 py-0.5 rounded-md border border-white/10 shadow">
                          #{idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md transition shadow cursor-pointer"
                          title="फोटो हटवा"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* खालची पट्टी: क्रम बदल बाण (◀ ▶) आणि कव्हर फोटो बटण */}
                      <div className="absolute bottom-1 inset-x-1 flex items-center justify-between gap-1 bg-black/85 backdrop-blur-sm p-1 rounded-lg border border-white/10 pointer-events-auto">
                        {/* डावीकडे सरकवा */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePhoto(idx, -1)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded cursor-pointer"
                          title="पुढे आणा (Move Left)"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>

                        {/* मुख्य कव्हर बनवा */}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, coverPhoto: url })}
                          className={`flex-1 text-[9px] font-bold py-0.5 px-1 rounded truncate text-center transition cursor-pointer flex items-center justify-center gap-0.5 ${
                            isCover ? 'bg-amber-500 text-black font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                          title="मुख्य कव्हर फोटो म्हणून सेट करा"
                        >
                          <Star className="w-2.5 h-2.5 shrink-0" />
                          <span>{isCover ? 'कव्हर' : 'कव्हर करा'}</span>
                        </button>

                        {/* उजवीकडे सरकवा */}
                        <button
                          type="button"
                          disabled={idx === formData.photos.length - 1}
                          onClick={() => handleMovePhoto(idx, 1)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded cursor-pointer"
                          title="मागे न्या (Move Right)"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{eventData ? 'बदल सेव्ह करा' : 'इव्हेंट पब्लिश करा'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}