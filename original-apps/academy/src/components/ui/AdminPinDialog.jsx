import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ADMIN_CODE = 'manager123';

export default function AdminPinDialog({ open, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      setCode('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCode(''); setError(false); onClose(); } }}>
      <DialogContent className="max-w-xs text-center">
        <h2 className="text-lg font-semibold mb-1">קוד מנהל</h2>
        <p className="text-sm text-neutral-500 mb-4">הזן קוד כדי לערוך</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            placeholder="••••"
            autoFocus
            className="text-center text-lg tracking-widest"
          />
          {error && <p className="text-red-500 text-sm">קוד שגוי, נסה שוב</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
            <Button type="submit" className="flex-1">כניסה</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}