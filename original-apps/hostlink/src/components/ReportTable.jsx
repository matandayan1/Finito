import { useState, useMemo, useRef } from "react";
import { Search, MessageSquare, ChevronUp, ChevronDown, Download, Pencil, X, Check, Info, Navigation } from "lucide-react";

const DEFAULT_TEMPLATE = `היי {שם} תודה שביקרת בקימוראיה 💕
נשמח לדעת איך היתה החוויה שלך 
אנא דרג/י מ-1 עד 5 ⭐  
(1 = פחות טוב, 5 = מעולה)

Hi {שם} 👋 Thank you for visiting Kimuraya 🙏  
We'd love to know how your experience was.

Please rate from 1 to 5 ⭐  
(1 = not great, 5 = excellent)`;

function buildSmsLink(phone, name, template) {
  const firstName = (name || "").split(/\s+/)[0] || "";
  const body = template.replace(/\{שם\}/g, firstName);
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

function downloadCSV(rows) {
  const header = ["Name", "Phone (E.164)", "Status"];
  const csvRows = [header, ...rows.map(r => [r.name, r.phone_e164, r.status])];
  const content = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kimuraya-send-list.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportTable({ rows, sentStatus, onSentChange, template: externalTemplate, onTemplateChange }) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [template, setTemplate] = useState(externalTemplate || DEFAULT_TEMPLATE);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState(externalTemplate || DEFAULT_TEMPLATE);
  const rowRefs = useRef({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = rows.filter(r =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.phone_raw.includes(q) ||
      r.phone_e164.includes(q)
    );
    result = [...result].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "he");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [rows, search, sortDir]);

  const scrollToNextUnsent = () => {
    const next = filtered.find(r => !sentStatus?.[r.phone_e164]);
    if (next && rowRefs.current[next.phone_e164]) {
      rowRefs.current[next.phone_e164].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="space-y-4">

      {/* Message Template Editor */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-stone-700">תבנית הודעה</span>
          </div>
          {!editingTemplate ? (
            <button
              onClick={() => { setDraftTemplate(template); setEditingTemplate(true); }}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-600 font-semibold transition"
            >
              <Pencil className="h-3.5 w-3.5" />
              ערוך
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setTemplate(draftTemplate); setEditingTemplate(false); onTemplateChange && onTemplateChange(draftTemplate); }}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition"
              >
                <Check className="h-3.5 w-3.5" />
                שמור
              </button>
              <button
                onClick={() => setEditingTemplate(false)}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 font-semibold transition"
              >
                <X className="h-3.5 w-3.5" />
                בטל
              </button>
            </div>
          )}
        </div>
        {editingTemplate ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              השתמש ב-<code className="font-mono bg-amber-100 rounded px-1">{"{שם}"}</code> כדי להוסיף את שם הלקוח
            </div>
            <textarea
              value={draftTemplate}
              onChange={e => setDraftTemplate(e.target.value)}
              rows={8}
              className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl border border-stone-200 p-3 outline-none focus:ring-2 focus:ring-amber-300 transition font-mono resize-none"
              dir="auto"
            />
          </div>
        ) : (
          <pre className="text-xs text-stone-500 whitespace-pre-wrap font-sans bg-stone-50 rounded-xl p-3 border border-stone-100 max-h-28 overflow-auto" dir="auto">
            {template}
          </pre>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 placeholder-stone-400 outline-none focus:ring-2 focus:ring-amber-300 transition"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-stone-400">{filtered.length} rows</span>
          <button
            onClick={scrollToNextUnsent}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 transition text-amber-600 text-sm font-medium border border-amber-200"
            title="קפוץ למקום שהפסקתי"
          >
            <Navigation className="h-4 w-4" />
            המשך מכאן
          </button>
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition text-stone-600 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-100 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/70">
              <th className="text-left px-4 py-3 font-semibold text-stone-500 whitespace-nowrap">
                <button
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 hover:text-stone-700 transition"
                >
                  שם מלא
                  {sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-stone-500 whitespace-nowrap">טלפון</th>
              <th className="text-left px-4 py-3 font-semibold text-stone-500 whitespace-nowrap hidden sm:table-cell">סטטוס</th>
              <th className="px-4 py-3 font-semibold text-stone-500 text-center whitespace-nowrap">שלח SMS</th>
              <th className="px-4 py-3 font-semibold text-stone-500 text-center whitespace-nowrap">נשלח?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-stone-400">לא נמצאו תוצאות</td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr key={i} ref={el => rowRefs.current[row.phone_e164] = el} className={`border-b border-stone-50 transition-colors ${sentStatus?.[row.phone_e164] ? "bg-emerald-50/40" : "hover:bg-amber-50/30"}`}>
                <td className="px-4 py-3.5 font-medium text-stone-800">{row.name || "—"}</td>
                <td className="px-4 py-3.5 text-stone-600 font-mono text-xs">{row.phone_e164}</td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <a
                    href={buildSmsLink(row.phone_e164, row.name, template)}
                    onClick={() => onSentChange && onSentChange(row.phone_e164, true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all text-white font-semibold text-sm shadow-sm whitespace-nowrap"
                  >
                    <MessageSquare className="h-4 w-4" />
                    שלח
                  </a>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={sentStatus?.[row.phone_e164] || false}
                    onChange={(e) => onSentChange && onSentChange(row.phone_e164, e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}