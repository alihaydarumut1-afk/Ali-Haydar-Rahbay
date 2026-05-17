import { FileText, FileDown } from 'lucide-react';
import { handleExportPDF, handleExportWord } from '../utils/exportUtils.js';

export default function ExportButtons({ elementId, fileName }) {
  return (
    <div className="flex items-center gap-2 no-print">
      <button
        onClick={(e) => { e.stopPropagation(); handleExportPDF(elementId, fileName); }}
        className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 eye-care:border-rose-200/50 eye-care:bg-rose-50/50"
        title="Export to PDF"
      >
        <FileText size={16} />
        PDF
      </button>
      
      <button
        onClick={(e) => { e.stopPropagation(); handleExportWord(elementId, fileName); }}
        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 eye-care:border-blue-200/50 eye-care:bg-blue-50/50"
        title="Export to Word"
      >
        <FileDown size={16} />
        Word
      </button>
    </div>
  );
}