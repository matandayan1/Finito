import { useState } from "react";
import { Ban, Plus, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";

function normalizePhone(raw) {
  if (!raw) return null;
  let phone = String(raw).replace(/[^\d+]/g, "");
  if (!phone) return null;
  if (phone.startsWith("0")) phone = "+972" + phone.slice(1);
  else if (phone.startsWith("972") && !phone.startsWith("+")) phone = "+" + phone;
  if (phone.length < 12) return null;
  return phone;
}

export default function BlocklistPanel({ blocked, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState(null);

  const handleAdd = () => {
    const normalized = normalizePhone(input);
    if (!normalized) {
      setError("מספר לא תקין. לדוגמה: 0501234567");
      return;
    }
    if (blocked.some(b => b.phone_e164 === normalized)) {
      setError("המספר כבר קיים ברשימה");
      return;
    }
    onAdd(normalized, label.trim() || null);
    setInput("");
    setLabel("");
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition"
      >
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-red-400" />
          <span className="text-sm font-semibold text-stone-700">רשימת מספרים חסומים</span>
          {blocked.length > 0 && (
            <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium border border-red-100">
              {blocked.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-stone-50">
          <div className="flex flex-col sm:flex-row gap-2 pt-3">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="מספר טלפון (לדוגמה: 0501234567)"
              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 placeholder-stone-400 outline-none focus:ring-2 focus:ring-red-200 transition"
              dir="ltr"
            />
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="תיאור (אופציונלי)"
              className="sm:w-40 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 placeholder-stone-400 outline-none focus:ring-2 focus:ring-red-200 transition"
            />
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 transition text-white text-sm font-semibold shadow-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              הוסף
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <X className="h-3 w-3" />
              {error}
            </p>
          )}

          {blocked.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-2">אין מספרים חסומים עדיין</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {blocked.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-stone-700 font-mono" dir="ltr">{b.phone_e164}</span>
                    {b.label && <span className="text-xs text-stone-400 truncate">· {b.label}</span>}
                  </div>
                  <button
                    onClick={() => onRemove(b.id)}
                    className="shrink-0 text-stone-300 hover:text-red-500 transition"
                    title="הסר"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-stone-400 flex items-start gap-1.5">
            <Ban className="h-3 w-3 mt-0.5 shrink-0" />
            מספרים ברשימה זו יוסרו אוטומטית מכל דוח שמועלה — לעולם לא תישלח אליהם הודעה.
          </p>
        </div>
      )}
    </div>
  );
}