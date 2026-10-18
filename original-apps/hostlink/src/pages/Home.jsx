import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import UploadZone from "../components/UploadZone";
import ReportTable from "../components/ReportTable";
import HistoryPanel from "../components/HistoryPanel";
import DebugPanel from "../components/DebugPanel";
import BlocklistPanel from "../components/BlocklistPanel";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

// ── Hard-coded column indices (0-based) ──────────────────────────────────────
const COL_NAME   = 3;  // D
const COL_PHONE  = 4;  // E
const COL_STATUS = 10; // K

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(raw) {
  if (!raw) return null;
  let phone = String(raw).replace(/[^\d+]/g, "");
  if (!phone) return null;
  if (phone.startsWith("0")) {
    phone = "+972" + phone.slice(1);
  } else if (phone.startsWith("972") && !phone.startsWith("+")) {
    phone = "+" + phone;
  }
  if (phone.length < 12) return null;
  return phone;
}

// ── Recompute real used range by scanning actual cell keys ───────────────────
function recomputeRef(ws) {
  let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
  for (const key of Object.keys(ws)) {
    if (key[0] === "!") continue;
    try {
      const cell = XLSX.utils.decode_cell(key);
      minR = Math.min(minR, cell.r);
      minC = Math.min(minC, cell.c);
      maxR = Math.max(maxR, cell.r);
      maxC = Math.max(maxC, cell.c);
    } catch (_) {}
  }
  if (maxR === -1) return null;
  return XLSX.utils.encode_range({ r: minR, c: minC }, { r: maxR, c: maxC });
}

// ── XLSX Parser ──────────────────────────────────────────────────────────────
function parseXLSX(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetNames = workbook.SheetNames;
  const allSheetsDebug = {};

  // Evaluate every sheet, recompute !ref, get rows
  const sheetData = sheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    const ref = recomputeRef(ws);
    if (ref) ws["!ref"] = ref;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
    allSheetsDebug[name] = rows.length;
    console.log(`[XLSX] Sheet "${name}" → !ref=${ref} → rows=${rows.length}`);
    return { name, rows };
  });

  // Choose sheet: largest rows.length, skip header-only (<=1) if possible
  const candidates = sheetData.filter(s => s.rows.length > 1);
  const pool = candidates.length > 0 ? candidates : sheetData;

  // Among pool, pick the one with most non-empty values in COL_STATUS (index 10)
  const chosen = pool.reduce((best, cur) => {
    const countStatus = (s) => s.rows.slice(1).filter(r => String(r[COL_STATUS] || "").trim()).length;
    if (cur.rows.length > best.rows.length) return cur;
    if (cur.rows.length === best.rows.length && countStatus(cur) > countStatus(best)) return cur;
    return best;
  });

  const { name: sheetName, rows: allRows } = chosen;
  console.log(`[XLSX] Chosen sheet: "${sheetName}" with ${allRows.length} rows`);
  console.log("[XLSX] First 5 raw rows:", JSON.stringify(allRows.slice(0, 5)));

  if (allRows.length === 0) {
    return { rows: [], debug: { sheetName, allSheetsDebug, totalRows: 0, dataRows: 0, first5Rows: [], nameSample: [], phoneSample: [], statusSample: [] } };
  }

  const dataRows = allRows.slice(1);
  const nameSample = [], phoneSample = [], statusSample = [];
  const rawRows = [];

  for (const row of dataRows) {
    const name     = String(row[COL_NAME]   || "").trim();
    const phoneRaw = String(row[COL_PHONE]  || "").trim();
    const status   = String(row[COL_STATUS] || "").trim();

    if (!name && !phoneRaw && !status) continue;

    if (name     && nameSample.length   < 5) nameSample.push(name);
    if (phoneRaw && phoneSample.length  < 5) phoneSample.push(phoneRaw);
    if (status   && statusSample.length < 5) statusSample.push(status);

    rawRows.push({ name, phone_raw: phoneRaw, status });
  }

  return {
    rows: rawRows,
    debug: {
      sheetName,
      allSheetsDebug,
      totalRows: dataRows.length,
      dataRows: rawRows.length,
      nameIdx: COL_NAME, phoneIdx: COL_PHONE, statusIdx: COL_STATUS,
      nameHeader: String(allRows[0][COL_NAME]   || ""),
      phoneHeader: String(allRows[0][COL_PHONE]  || ""),
      statusHeader: String(allRows[0][COL_STATUS] || ""),
      first5Rows: allRows.slice(0, 5).map(r => r.slice(0, 13)),
      nameSample, phoneSample, statusSample,
    }
  };
}

// ── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const cells = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      cells.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) {
    return { rows: [], debug: { sheetName: "CSV", totalRows: 0, dataRows: 0, statusSample: [], phoneSample: [], nameSample: [] } };
  }

  const header = parseCSVLine(lines[0]);
  const dataLines = lines.slice(1);
  const nameSample = [], phoneSample = [], statusSample = [];
  const rawRows = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cells = parseCSVLine(line);
    const name     = String(cells[COL_NAME]   || "").trim();
    const phoneRaw = String(cells[COL_PHONE]  || "").trim();
    const status   = String(cells[COL_STATUS] || "").trim();

    if (!name && !phoneRaw && !status) continue;

    if (name   && nameSample.length   < 5) nameSample.push(name);
    if (phoneRaw && phoneSample.length < 5) phoneSample.push(phoneRaw);
    if (status && statusSample.length < 5) statusSample.push(status);

    rawRows.push({ name, phone_raw: phoneRaw, status });
  }

  return {
    rows: rawRows,
    debug: {
      sheetName: "CSV",
      totalRows: dataLines.length,
      dataRows: rawRows.length,
      nameIdx: COL_NAME, phoneIdx: COL_PHONE, statusIdx: COL_STATUS,
      nameHeader: String(header[COL_NAME] || ""),
      phoneHeader: String(header[COL_PHONE] || ""),
      statusHeader: String(header[COL_STATUS] || ""),
      nameSample, phoneSample, statusSample,
    }
  };
}

// ── Main parse entry ─────────────────────────────────────────────────────────
function parseTabitFile(file, blocked = []) {
  return new Promise((resolve, reject) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const { rows: rawRows, debug } = isCSV
          ? parseCSV(e.target.result)
          : parseXLSX(e.target.result);

        const totalScanned = rawRows.length;
        let closedRows = 0;
        let validPhones = 0;
        const seen = new Map();

        for (const row of rawRows) {
          const s = row.status;
          const isMatch = s.includes("נסגר") || s.includes("נסגרה") || s.includes("סגורה") || s.includes("שולם") || s.includes("סיום");
          if (!isMatch) continue;
          closedRows++;
          const phone = normalizePhone(row.phone_raw);
          if (!phone) continue;
          validPhones++;
          if (!seen.has(phone)) {
            seen.set(phone, { ...row, phone_e164: phone });
          }
        }

        const result = Array.from(seen.values());
        const duplicatesRemoved = Math.max(0, validPhones - result.length);
        // Remove blocked numbers — never send to service numbers
        const blockedSet = new Set(blocked.map(b => b.phone_e164));
        const filteredResult = blockedSet.size > 0
          ? result.filter(r => !blockedSet.has(r.phone_e164))
          : result;
        const blockedRemoved = result.length - filteredResult.length;

        console.log("[PARSE] totalScanned:", totalScanned, "closedRows:", closedRows, "validPhones:", validPhones, "result:", result.length);

        resolve({
          rows: filteredResult,
          debug: {
            ...debug,
            totalScanned,
            closedRows,
            validPhones,
            validRows: filteredResult.length,
            duplicatesRemoved,
            blockedRemoved,
          }
        });
      } catch (err) {
        console.error("[PARSE ERROR]", err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("READ_ERROR"));
    isCSV ? reader.readAsText(file, "utf-8") : reader.readAsArrayBuffer(file);
  });
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeReportName, setActiveReportName] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);
  const [sentStatus, setSentStatus] = useState({});
  const [messageTemplate, setMessageTemplate] = useState(null);
  const [stats, setStats] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const sentDebounceRef = useRef(null);
  const activeReportIdRef = useRef(null);

  // Keep ref in sync so debounced callback always has latest id
  useEffect(() => { activeReportIdRef.current = activeReportId; }, [activeReportId]);

  // Load blocklist once on mount
  useEffect(() => {
    base44.entities.BlockedPhone.list().then(setBlocked).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.DailyReport.list("-upload_timestamp", 20).then(setHistory).catch(() => {});
  }, []);

  const handleFile = async (file) => {
    setError(null);
    setDebugInfo(null);
    setLoading(true);
    setRows(null);
    setStats(null);
    setActiveReportName(null);

    let result;
    try {
      result = await parseTabitFile(file, blocked);
    } catch {
      setError("Could not read the file. Please check the format and try again.");
      setLoading(false);
      return;
    }

    const { rows: parsed, debug } = result;
    setDebugInfo(debug);

    if (parsed.length === 0) {
      const noData = debug.totalRows <= 0;
      setError(noData
        ? `XLSX contains no data rows. Check export format or sheet used range.`
        : `נטענו ${debug.totalRows} שורות מגיליון "${debug.sheetName}", אך 0 עברו סינון (סטטוס/טלפון). ראה Debug.`
      );
      setLoading(false);
      return;
    }

    setRows(parsed);
    setActiveReportName(file.name);
    setSentStatus({});
    setMessageTemplate(null);
    setStats({ totalScanned: debug.totalScanned, closedRows: debug.closedRows, validRows: debug.validRows, duplicatesRemoved: debug.duplicatesRemoved, blockedRemoved: debug.blockedRemoved });

    try {
      // Strip phone_raw before saving — it's only used during parsing, never read back
      const dataToStore = parsed.map(({ phone_raw: _, ...r }) => r);
      const saved = await base44.entities.DailyReport.create({
        filename: file.name,
        upload_timestamp: new Date().toISOString(),
        rows_processed: parsed.length,
        report_data: dataToStore,
        sent_status: {},
        message_template: null,
      });
      setActiveReportId(saved.id);
      setHistory(prev => [saved, ...prev]);
    } catch {}

    setLoading(false);
  };

  const handleReopen = (report) => {
    setRows(report.report_data || []);
    setActiveReportName(report.filename);
    setActiveReportId(report.id);
    setSentStatus(report.sent_status || {});
    setMessageTemplate(report.message_template || null);
    setError(null);
    setDebugInfo(null);
    setStats({ totalScanned: "—", closedRows: "—", validRows: report.rows_processed, duplicatesRemoved: "—" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTemplateChange = async (newTemplate) => {
    setMessageTemplate(newTemplate);
    if (activeReportId) {
      base44.entities.DailyReport.update(activeReportId, { message_template: newTemplate }).catch(() => {});
    }
  };

  const flushSentStatus = useCallback((updated) => {
    const id = activeReportIdRef.current;
    if (!id) return;
    if (sentDebounceRef.current) clearTimeout(sentDebounceRef.current);
    sentDebounceRef.current = setTimeout(() => {
      base44.entities.DailyReport.update(id, { sent_status: updated }).catch(() => {});
    }, 1500);
  }, []);

  const handleAddBlocked = async (phone, label) => {
    try {
      const created = await base44.entities.BlockedPhone.create({ phone_e164: phone, label });
      setBlocked(prev => [...prev, created]);
    } catch {}
  };

  const handleRemoveBlocked = async (id) => {
    setBlocked(prev => prev.filter(b => b.id !== id));
    try { await base44.entities.BlockedPhone.delete(id); } catch {}
  };

  const handleSentChange = (phone, checked) => {
    const updated = { ...sentStatus, [phone]: checked };
    setSentStatus(updated);
    // Optimistic history update (local only)
    if (activeReportId) {
      setHistory(prev => prev.map(r => r.id === activeReportId ? { ...r, sent_status: updated } : r));
    }
    // Debounced DB write — batches rapid ticks into one write after 1.5s idle
    flushSentStatus(updated);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] px-4 pb-16">
      <header className="max-w-3xl mx-auto pt-10 pb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Kimuraya</p>
          <h1 className="text-2xl font-bold text-stone-800 leading-tight">Host Send List</h1>
          <p className="text-stone-400 text-sm mt-1">Upload a Tabit daily report to generate your SMS send list.</p>
        </div>
        <div className="text-3xl select-none">🍣</div>
      </header>

      <main className="max-w-3xl mx-auto space-y-6">
        <UploadZone onFile={handleFile} loading={loading} />
        <BlocklistPanel blocked={blocked} onAdd={handleAddBlocked} onRemove={handleRemoveBlocked} />

        {/* Error */}
        {error && (
          <div>
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button onClick={() => { setError(null); setDebugInfo(null); }} className="text-red-300 hover:text-red-500 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            {debugInfo && <DebugPanel debug={debugInfo} />}
          </div>
        )}

        {/* Stats + Table */}
        {rows && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-stone-700 font-medium text-sm truncate">
                {activeReportName}
              </span>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {stats && (
                  <>
                    <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-3 py-1">
                      {stats.totalScanned} scanned
                    </span>
                    <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-3 py-1">
                      {stats.closedRows} closed
                    </span>
                    {stats.duplicatesRemoved > 0 && (
                      <span className="text-xs text-orange-500 bg-orange-50 rounded-full px-3 py-1">
                        {stats.duplicatesRemoved} dupes removed
                      </span>
                    )}
                    {stats.blockedRemoved > 0 && (
                      <span className="text-xs text-red-500 bg-red-50 rounded-full px-3 py-1 border border-red-100">
                        {stats.blockedRemoved} חסומים הוסרו
                      </span>
                    )}
                  </>
                )}
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 border border-emerald-100">
                  {rows.length} valid
                </span>
                <button
                  onClick={() => { if (sentDebounceRef.current) clearTimeout(sentDebounceRef.current); setRows(null); setActiveReportName(null); setActiveReportId(null); setSentStatus({}); setStats(null); setDebugInfo(null); setError(null); }}
                  className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-500 bg-stone-100 hover:bg-red-50 rounded-full px-3 py-1 transition border border-transparent hover:border-red-100"
                  title="סגור דוח"
                >
                  <X className="h-3.5 w-3.5" />
                  סגור דוח
                </button>
              </div>
            </div>
            <ReportTable rows={rows} sentStatus={sentStatus} onSentChange={handleSentChange} template={messageTemplate} onTemplateChange={handleTemplateChange} />
          </div>
        )}

        <HistoryPanel reports={history} onReopen={handleReopen} activeReportId={activeReportId} />
      </main>
    </div>
  );
}