import { FileText, Clock, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

export default function HistoryPanel({ reports, onReopen, activeReportId }) {
  if (!reports || reports.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-3">דוחות קודמים</h2>
      <div className="space-y-2">
        {reports.map(r => {
          const total = r.rows_processed || 0;
          const sentMap = r.sent_status || {};
          const sentCount = Object.values(sentMap).filter(Boolean).length;
          const pct = total > 0 ? Math.round((sentCount / total) * 100) : 0;
          const isActive = r.id === activeReportId;

          return (
            <div
              key={r.id}
              className={`flex items-center justify-between gap-3 bg-white rounded-xl border px-4 py-3 shadow-sm transition ${isActive ? "border-amber-300 ring-1 ring-amber-200" : "border-stone-100"}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className={`h-5 w-5 shrink-0 ${isActive ? "text-amber-400" : "text-stone-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-stone-700 font-medium text-sm truncate">{r.filename}</p>
                  <p className="text-stone-400 text-xs flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {r.upload_timestamp ? format(new Date(r.upload_timestamp), "dd/MM/yyyy, HH:mm") : "—"}
                    <span className="ml-2 text-stone-300">·</span>
                    <span>{total} לקוחות</span>
                  </p>
                  {/* Progress bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 shrink-0 w-20 text-left">
                      {sentCount}/{total} נשלחו
                    </span>
                    {sentCount === total && total > 0 && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    {sentCount < total && (
                      <Circle className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onReopen(r)}
                className="shrink-0 flex items-center gap-1.5 text-amber-500 hover:text-amber-600 text-xs font-semibold transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                פתח
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}