import { useState, useRef } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";

export default function UploadZone({ onFile, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div
      onClick={() => !loading && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-10
        flex flex-col items-center justify-center gap-4 select-none
        ${dragging ? "border-amber-400 bg-amber-50 scale-[1.01]" : "border-stone-200 bg-stone-50 hover:border-amber-300 hover:bg-amber-50/40"}
        ${loading ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleChange}
        disabled={loading}
      />
      <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center">
        <FileSpreadsheet className="h-7 w-7 text-amber-500" />
      </div>
      <div className="text-center">
        <p className="text-stone-700 font-medium text-base">
          {loading ? "Processing file…" : "Drop your Tabit report here"}
        </p>
        <p className="text-stone-400 text-sm mt-1">
          {loading ? "Please wait" : "XLSX or CSV · Click to browse"}
        </p>
      </div>
      {!loading && (
        <div className="mt-1 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 transition text-white text-sm font-semibold shadow-sm">
          <Upload className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Upload File
        </div>
      )}
    </div>
  );
}