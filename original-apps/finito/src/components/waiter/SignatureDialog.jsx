import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, User } from 'lucide-react';

export default function SignatureDialog({ open, workerName, onConfirm, onCancel }) {
  const [name, setName] = useState(workerName || '');

  useEffect(() => {
    if (open) setName(workerName || '');
  }, [open, workerName]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[#2A3D5A] flex items-center gap-2">
            <User className="h-5 w-5 text-[#7ABC98]" /> אישור סיום
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <p className="text-sm text-[#2A3D5A]/60 text-center">
            אשר/י שביצעת את כל המשימות
          </p>

          <div className="space-y-2">
            <p className="text-xs text-[#2A3D5A]/50">שם האחראי</p>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="שמך..."
              dir="rtl"
              className="rounded-2xl border-2 border-[#E8E0D8] focus:border-[#7ABC98] h-12 text-center text-base font-medium"
              autoFocus
            />
          </div>

          <div className="p-4 bg-[#F5F0EA] rounded-2xl text-center space-y-1">
            <p className="text-xs text-[#2A3D5A]/40">חתימה דיגיטלית</p>
            <p className="font-bold text-[#2A3D5A] text-lg">{name || '...'}</p>
            <p className="text-xs text-[#2A3D5A]/40">מאשר/ת שביצעתי את כל המשימות בדוח זה</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => name.trim() && onConfirm(name.trim())}
              disabled={!name.trim()}
              className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42] h-12"
            >
              <Check className="h-4 w-4 ml-2" /> אישור וסיום
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 rounded-2xl border-2 border-[#E8E0D8]"
            >
              חזור
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}