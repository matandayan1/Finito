import { AlertTriangle } from "lucide-react";

export default function DebugPanel({ debug }) {
  if (!debug) return null;

  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900 text-sm">Debug Information</h3>
          <p className="text-amber-700 text-xs mt-0.5">File loaded successfully, but no valid rows matched your filters.</p>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
            <span className="text-amber-600 font-medium">Chosen sheet:</span>
            <span className="ml-2 text-stone-700 font-mono">{debug.sheetName}</span>
          </div>
          <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
            <span className="text-amber-600 font-medium">Data rows:</span>
            <span className="ml-2 text-stone-700">{debug.totalRows}</span>
          </div>
        </div>

        {debug.allSheetsDebug && (
          <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
            <div className="text-amber-600 font-medium mb-1">All sheets:</div>
            <div className="text-stone-600 font-mono text-xs space-y-0.5">
              {Object.entries(debug.allSheetsDebug).map(([name, count]) => (
                <div key={name} className={name === debug.sheetName ? "font-bold text-amber-700" : ""}>
                  {name === debug.sheetName ? "▶ " : "  "}{name}: {count} rows
                </div>
              ))}
            </div>
          </div>
        )}

        {debug.first5Rows && debug.first5Rows.length > 0 && (
          <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
            <div className="text-amber-600 font-medium mb-1">First 5 raw rows (cols 0–12):</div>
            <div className="text-stone-600 font-mono text-xs space-y-1 max-h-48 overflow-auto">
              {debug.first5Rows.map((row, i) => (
                <div key={i} className="break-all">{i}: {JSON.stringify(row)}</div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
          <div className="text-amber-600 font-medium mb-1">עמודות שזוהו:</div>
          <div className="space-y-1 text-stone-600">
            <div>• שם: Index {debug.nameIdx} ({debug.nameHeader || "—"})</div>
            <div>• טלפון: Index {debug.phoneIdx} ({debug.phoneHeader || "—"})</div>
            <div>• סטטוס: Index {debug.statusIdx} ({debug.statusHeader || "—"})</div>
          </div>
        </div>

        <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
          <div className="text-amber-600 font-medium mb-1">דוגמאות שמות (5 ראשונים):</div>
          <div className="text-stone-600 font-mono text-xs space-y-0.5 max-h-32 overflow-auto">
            {debug.nameSample?.length > 0 ? debug.nameSample.map((s, i) => (
              <div key={i}>{i + 1}. {s}</div>
            )) : <div>(לא נמצאו שמות)</div>}
          </div>
        </div>

        <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
          <div className="text-amber-600 font-medium mb-1">דוגמאות טלפונים (5 ראשונים):</div>
          <div className="text-stone-600 font-mono text-xs space-y-0.5 max-h-32 overflow-auto">
            {debug.phoneSample?.length > 0 ? debug.phoneSample.map((s, i) => (
              <div key={i}>{i + 1}. {s}</div>
            )) : <div>(לא נמצאו טלפונים)</div>}
          </div>
        </div>

        <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
          <div className="text-amber-600 font-medium mb-1">דוגמאות סטטוסים (5 ראשונים):</div>
          <div className="text-stone-600 font-mono text-xs space-y-0.5 max-h-32 overflow-auto">
            {debug.statusSample?.length > 0 ? debug.statusSample.map((s, i) => (
              <div key={i}>{i + 1}. {s}</div>
            )) : <div>(לא נמצאו סטטוסים)</div>}
          </div>
        </div>

        {debug.closedRows !== undefined && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
              <span className="text-amber-600 font-medium">סטטוס "נסגר":</span>
              <span className="ml-2 text-stone-700">{debug.closedRows}</span>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
              <span className="text-amber-600 font-medium">טלפון תקין:</span>
              <span className="ml-2 text-stone-700">{debug.validPhones}</span>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-amber-100">
              <span className="text-amber-600 font-medium">אחרי dedup:</span>
              <span className="ml-2 text-stone-700">{debug.validRows}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}