import React, { useState, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, Loader2, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import TaskEditDialog from './TaskEditDialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { useQueryClient } from '@tanstack/react-query';

export default function TaskItem({ task, value, onChange, index }) {
  const { t, getLocalizedField, isRTL } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [showNote, setShowNote] = useState(!!value?.note);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const taskName = getLocalizedField(task, 'name');
  const taskDescription = getLocalizedField(task, 'description');

  const handleCheck = () => {
    onChange({ ...value, completed: !value?.completed });
  };

  const handleNoteChange = (e) => {
    onChange({ ...value, note: e.target.value }, true);
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const useWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const fmt = useWebP ? 'image/webp' : 'image/jpeg';
        const ext = useWebP ? '.webp' : '.jpg';
        canvas.toBlob(blob => resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ext), { type: fmt })), fmt, 0.72);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handlePhotoCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    const photoUrls = value?.photo_urls || [];
    
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        photoUrls.push(file_url);
      }
      
      onChange({ ...value, photo_urls: photoUrls, photo_url: photoUrls[0] });
    } catch (error) {
      alert('העלאת התמונה נכשלה - בדוק אם יש קרדיטים זמינים או נסה שוב');
      console.error('Photo upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (urlToRemove) => {
    const photoUrls = (value?.photo_urls || []).filter(url => url !== urlToRemove);
    onChange({ 
      ...value, 
      photo_urls: photoUrls, 
      photo_url: photoUrls[0] || null 
    });
  };

  const isPhotoRequired = task.photo_requirement === 'required';
  const isPhotoOptional = task.photo_requirement === 'optional';
  const photoUrls = value?.photo_urls || (value?.photo_url ? [value.photo_url] : []);
  const hasPhoto = photoUrls.length > 0;
  const isCompleted = value?.completed;
  const needsPhoto = isPhotoRequired && !hasPhoto && isCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "p-5 rounded-3xl transition-all duration-300 border-2",
        isCompleted && !needsPhoto 
          ? "bg-[#2A3D5A] border-[#2A3D5A]" 
          : "bg-white border-[#E8E0D8] shadow-sm",
        needsPhoto && "border-[#7ABC98] bg-[#7ABC98]/5"
      )}
    >
      <div className="flex gap-4">
        {/* Custom Checkbox */}
        <motion.button
          onClick={handleCheck}
          whileTap={{ scale: 0.85 }}
          className={cn(
            "h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 mt-0.5",
            isCompleted 
              ? "bg-[#7ABC98] border-[#7ABC98]" 
              : "border-[#E8E0D8] bg-white hover:border-[#7ABC98]"
          )}
        >
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-medium text-base leading-tight transition-colors duration-300",
              isCompleted && !needsPhoto ? "text-white" : "text-[#2A3D5A]"
            )}>
              {taskName}
            </h3>
            {taskDescription && (
              <p className={cn(
                "text-sm mt-1 transition-colors duration-300",
                isCompleted && !needsPhoto ? "text-white/60" : "text-[#2A3D5A]/50"
              )}>
                {taskDescription}
              </p>
            )}
            {/* Example Images */}
            {task.example_images?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {task.example_images.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`דוגמה ${idx + 1}`}
                    className="h-20 w-20 object-cover rounded-2xl border-2 border-[#E8E0D8] shadow-sm cursor-zoom-in active:scale-95 transition-transform"
                    onClick={() => setLightboxUrl(url)}
                  />
                ))}
              </div>
            )}
            </div>
            <button
              type="button"
              onClick={() => setShowEditDialog(true)}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-xl transition-colors",
                isCompleted && !needsPhoto
                  ? "text-white/40 hover:text-white/70 hover:bg-white/10"
                  : "text-[#2A3D5A]/25 hover:text-[#2A3D5A]/50 hover:bg-[#2A3D5A]/5"
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Photo Section */}
          {(isPhotoRequired || isPhotoOptional) && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "gap-2 rounded-xl h-9 px-4 transition-all duration-200 border-2",
                    isCompleted && !needsPhoto
                      ? "bg-white/10 border-white/30 text-white hover:bg-white/20"
                      : isPhotoRequired 
                        ? "border-[#7ABC98] text-[#7ABC98] bg-[#7ABC98]/5 hover:bg-[#7ABC98]/10" 
                        : "border-[#E8E0D8] text-[#2A3D5A]/60 hover:bg-[#FFF8F0]"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {hasPhoto ? t('addMorePhotos') : t('takePhoto')}
                </Button>
                <span className={cn(
                  "text-xs font-medium",
                  isCompleted && !needsPhoto
                    ? "text-white/50"
                    : isPhotoRequired ? "text-[#7ABC98]" : "text-[#2A3D5A]/40"
                )}>
                  {isPhotoRequired ? t('photoRequired') : t('photoOptional')}
                  {hasPhoto && ` (${photoUrls.length})`}
                </span>
              </div>
              
              {hasPhoto && (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      className="relative inline-block"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-2xl border-2 border-white/50 shadow-md cursor-zoom-in active:scale-95 transition-transform"
                        onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-[#2A3D5A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#1e2d42] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </div>
          )}

          {/* Note */}
          {showNote ? (
            <Input
              placeholder={t('addNote')}
              value={value?.note || ''}
              onChange={handleNoteChange}
              className={cn(
                "text-sm rounded-xl border-2 transition-all duration-200",
                isCompleted && !needsPhoto
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  : "bg-[#FFF8F0] border-[#E8E0D8]"
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className={cn(
                "text-xs font-medium transition-colors",
                isCompleted && !needsPhoto
                  ? "text-white/50 hover:text-white/70"
                  : "text-[#2A3D5A]/40 hover:text-[#2A3D5A]/60"
              )}
            >
              + {t('addNote')}
            </button>
          )}
        </div>
      </div>
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <TaskEditDialog
        task={task}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSaved={() => {
          setShowEditDialog(false);
          queryClient.invalidateQueries({ queryKey: ['checklist-tasks'] });
        }}
      />
    </motion.div>
  );
}