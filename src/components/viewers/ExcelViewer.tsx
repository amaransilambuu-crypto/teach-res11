import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  Search,
  Download,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { FileItem } from '../../types.ts';
import { formatBytes } from '../../utils/format.ts';

interface ExcelViewerProps {
  file: FileItem;
  previewUrl: string;
  onDownload: (file: FileItem) => void;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ file, previewUrl, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 50;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadSpreadsheet = async () => {
      try {
        const token = localStorage.getItem('trh_token') || sessionStorage.getItem('trh_token');
        const res = await fetch(previewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(`Failed to load spreadsheet file (HTTP ${res.status})`);
        }

        const arrayBuffer = await res.arrayBuffer();
        if (!isMounted) return;

        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('No worksheets found in this spreadsheet file.');
        }

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setActiveSheetName(wb.SheetNames[0]);
        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          console.error('Excel parse error:', err);
          setError(err?.message || 'Could not parse Excel workbook data.');
          setLoading(false);
        }
      }
    };

    loadSpreadsheet();

    return () => {
      isMounted = false;
    };
  }, [previewUrl]);

  // Convert active sheet to 2D array
  const rawSheetData = useMemo(() => {
    if (!workbook || !activeSheetName) return [];
    const worksheet = workbook.Sheets[activeSheetName];
    if (!worksheet) return [];

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    return data;
  }, [workbook, activeSheetName]);

  // Filter sheet rows based on search
  const filteredRows = useMemo(() => {
    if (!rawSheetData || rawSheetData.length === 0) return [];
    if (!searchTerm.trim()) return rawSheetData;

    const term = searchTerm.toLowerCase();
    return rawSheetData.filter((row, idx) => {
      if (idx === 0) return true; // keep header row
      return row.some((cell) => cell !== null && String(cell).toLowerCase().includes(term));
    });
  }, [rawSheetData, searchTerm]);

  // Pagination for large spreadsheets
  const totalRows = Math.max(0, filteredRows.length - 1);
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const displayedHeader = filteredRows[0] || [];
  const displayedBody = useMemo(() => {
    if (filteredRows.length <= 1) return [];
    const start = (currentPage - 1) * ROWS_PER_PAGE + 1;
    const end = start + ROWS_PER_PAGE;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage]);

  const maxCols = Math.max(
    displayedHeader.length,
    ...displayedBody.map((r) => r.length),
    1
  );

  const getColLabel = (index: number) => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode((num % 26) + 65) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white space-y-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-xs text-slate-300 font-medium">Parsing Excel sheets and cell formulas...</span>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md bg-slate-800/80 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Spreadsheet Preview</h4>
            <p className="text-xs text-slate-300 mb-2">{file.file_name} ({formatBytes(file.file_size)})</p>
            <p className="text-2xs text-slate-400">{error || 'This spreadsheet format is best viewed in Microsoft Excel or Google Sheets.'}</p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(file)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download Excel Spreadsheet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-text">
      {/* Top Header & Search Bar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-xs">{file.file_name}</h3>
            <span className="text-2xs text-slate-400">
              {rawSheetData.length} row{rawSheetData.length !== 1 ? 's' : ''} • {maxCols} columns • {sheetNames.length} sheet{sheetNames.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* In-Sheet Search */}
        <div className="flex items-center space-x-2 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in sheet..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Download Button */}
        <button
          type="button"
          onClick={() => onDownload(file)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center shadow-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download (.xlsx)
        </button>
      </div>

      {/* Sheet Tabs Bar (Excel Bottom/Top Tab Style) */}
      {sheetNames.length > 1 && (
        <div className="bg-slate-950/80 px-3 py-1 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto flex-shrink-0">
          <span className="text-2xs font-semibold text-slate-400 mr-2 uppercase tracking-wider">Sheets:</span>
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setActiveSheetName(name);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeSheetName === name
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Spreadsheet Table Grid */}
      <div className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-4">
        <div className="inline-block min-w-full align-middle bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <table className="min-w-full divide-y divide-slate-800 border-collapse text-xs">
            {/* Column Alphabet Header */}
            <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="w-12 px-2 py-2 text-center text-2xs font-mono font-bold text-slate-500 border-r border-slate-800 bg-slate-950">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, colIdx) => (
                  <th
                    key={colIdx}
                    className="px-3 py-2 text-left text-2xs font-mono font-semibold tracking-wider text-slate-400 border-r border-slate-800/80 bg-slate-950 min-w-[120px]"
                  >
                    {getColLabel(colIdx)}
                  </th>
                ))}
              </tr>

              {/* Data Header (Row 1) */}
              {displayedHeader.length > 0 && (
                <tr className="bg-slate-900/90 text-emerald-300 font-bold border-b border-slate-700">
                  <td className="px-2 py-2.5 text-center text-2xs font-mono font-bold text-slate-500 border-r border-slate-800 bg-slate-950">
                    1
                  </td>
                  {Array.from({ length: maxCols }).map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-3 py-2.5 text-left border-r border-slate-800 truncate max-w-[250px]"
                      title={String(displayedHeader[colIdx] ?? '')}
                    >
                      {String(displayedHeader[colIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              )}
            </thead>

            {/* Data Rows */}
            <tbody className="divide-y divide-slate-800/60 bg-slate-900 text-slate-200 font-mono">
              {displayedBody.length > 0 ? (
                displayedBody.map((row, rowIdx) => {
                  const absoluteRowNumber = (currentPage - 1) * ROWS_PER_PAGE + rowIdx + 2;
                  return (
                    <tr
                      key={rowIdx}
                      className="hover:bg-slate-800/50 transition-colors odd:bg-slate-900 even:bg-slate-900/50"
                    >
                      <td className="px-2 py-2 text-center text-2xs font-mono text-slate-500 border-r border-slate-800 bg-slate-950/40 select-none">
                        {absoluteRowNumber}
                      </td>
                      {Array.from({ length: maxCols }).map((_, colIdx) => {
                        const cellVal = row[colIdx];
                        const cellText = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
                        const isNum = typeof cellVal === 'number' || (!isNaN(Number(cellText)) && cellText.trim() !== '');

                        return (
                          <td
                            key={colIdx}
                            className={`px-3 py-2 border-r border-slate-800/60 truncate max-w-[280px] ${
                              isNum ? 'text-right text-emerald-200' : 'text-left text-slate-200'
                            }`}
                            title={cellText}
                          >
                            {cellText}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={maxCols + 1} className="p-8 text-center text-slate-400 font-sans">
                    No matching records found in this worksheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-slate-400 font-medium">
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * ROWS_PER_PAGE, totalRows)} of {totalRows} rows
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-medium inline-flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-medium inline-flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
