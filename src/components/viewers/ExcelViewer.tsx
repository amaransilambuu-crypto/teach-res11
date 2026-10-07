import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Link2,
  Copy,
  Check,
  WrapText,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowUpRight,
} from 'lucide-react';
import { FileItem } from '../../types.ts';
import { formatBytes } from '../../utils/format.ts';

interface ExcelViewerProps {
  file: FileItem;
  previewUrl: string;
  onDownload: (file: FileItem) => void;
  isParentFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export interface CellData {
  text: string;
  value: any;
  hyperlink?: string;
  tooltip?: string;
  formula?: string;
  colIndex: number;
  colLetter: string;
  rowIndex: number;
  bgColor?: string;
  textColor?: string;
  isHeader?: boolean;
}

interface MergeInfo {
  rowSpan: number;
  colSpan: number;
}

interface TextToken {
  type: 'text' | 'link';
  text: string;
  url?: string;
  isExternal?: boolean;
}

/**
 * Tokenizes text to identify web links (YouTube, Google Drive, Google Sheets, standard URLs)
 * and separates them cleanly from surrounding Tamil/English text and numbers.
 */
function tokenizeCellText(rawText: string, cellHyperlink?: string): TextToken[] {
  const text = rawText || '';

  if (!text.trim() && cellHyperlink) {
    const cleanUrl = cellHyperlink.startsWith('http://') || cellHyperlink.startsWith('https://')
      ? cellHyperlink
      : `https://${cellHyperlink}`;
    return [{ type: 'link', text: cellHyperlink, url: cleanUrl, isExternal: true }];
  }

  if (!text) return [];

  // Match URLs starting with http, https, www, or specific educational/video domains
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+|(?:(?:drive|docs|meet)\.google\.com|youtu\.be|youtube\.com|forms\.gle)\/[^\s<>"'{}|\\^`]+)/gi;

  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        text: text.substring(lastIndex, match.index),
      });
    }

    let rawUrl = match[0];
    let trailing = '';

    // Strip trailing punctuation like .,;:)]} that are part of sentence formatting
    while (/[.,;:)]$/.test(rawUrl)) {
      trailing = rawUrl.slice(-1) + trailing;
      rawUrl = rawUrl.slice(0, -1);
    }

    const cleanHref = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`;

    tokens.push({
      type: 'link',
      text: rawUrl,
      url: cleanHref,
      isExternal: true,
    });

    if (trailing) {
      tokens.push({
        type: 'text',
        text: trailing,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      text: text.substring(lastIndex),
    });
  }

  // Fallback for native Excel hyperlink metadata if no plain-text URL was detected
  const foundAnyLink = tokens.some((t) => t.type === 'link');
  if (!foundAnyLink && cellHyperlink) {
    const cleanUrl = cellHyperlink.startsWith('http://') || cellHyperlink.startsWith('https://')
      ? cellHyperlink
      : `https://${cellHyperlink}`;

    return [
      {
        type: 'link',
        text: text,
        url: cleanUrl,
        isExternal: true,
      },
    ];
  }

  return tokens;
}

/**
 * Intelligent color-theming replicating the authentic Microsoft Excel palette
 * seen in the teaching timetable screenshot.
 */
function getCellPalette(r: number, c: number, colLetter: string, cellText: string) {
  // Row 1 (Header row): Soft olive green
  if (r === 0) {
    return { bg: '#b8d994', text: '#1e3a1e', isHeader: true };
  }

  // Column A (Month grouping, e.g. "August Month"): Warm pastel yellow
  if (c === 0 || colLetter === 'A') {
    return { bg: '#ffe599', text: '#5c3800' };
  }

  // Row grouping based on standards in the timetable:
  // 9th Std rows (Rows 2-4): Soft pastel sky blue
  if (r >= 1 && r <= 3) {
    return { bg: '#bdd7ee', text: '#1e293b' };
  }
  // 10th Std rows (Rows 5-6): Light stone/gray
  if (r >= 4 && r <= 5) {
    return { bg: '#d9d9d9', text: '#1e293b' };
  }
  // 11th Std rows (Rows 7-12): Soft pastel blue
  if (r >= 6 && r <= 11) {
    return { bg: '#b4c6e7', text: '#1e293b' };
  }
  // 12th Std rows: Soft stone/gray
  if (r >= 12 && r <= 16) {
    return { bg: '#d9d9d9', text: '#1e293b' };
  }

  // Default clean white
  return { bg: '#ffffff', text: '#1e293b' };
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  file,
  previewUrl,
  onDownload,
  isParentFullscreen,
  onToggleFullscreen,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isWrapText, setIsWrapText] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showLinksDrawer, setShowLinksDrawer] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeCellAddress, setActiveCellAddress] = useState('A1');
  const [formulaValue, setFormulaValue] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  // Sync with parent DocumentViewerModal fullscreen state if provided
  const isFullscreen = isParentFullscreen !== undefined ? isParentFullscreen : internalFullscreen;

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen((f) => !f);
    }
  };

  // Viewport table container reference
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

        const wb = XLSX.read(arrayBuffer, {
          type: 'array',
          cellFormula: true,
          cellHTML: true,
          cellStyles: true,
          cellDates: true,
        });

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

  // Convert active sheet to CellData[][] grid and compute merges
  const { sheetRows, mergeStartMap, mergeCoveredSet, maxCols, columnLetters } = useMemo(() => {
    if (!workbook || !activeSheetName) {
      return { sheetRows: [], mergeStartMap: new Map<string, MergeInfo>(), mergeCoveredSet: new Set<string>(), maxCols: 0, columnLetters: [] };
    }
    const worksheet = workbook.Sheets[activeSheetName];
    if (!worksheet || !worksheet['!ref']) {
      return { sheetRows: [], mergeStartMap: new Map<string, MergeInfo>(), mergeCoveredSet: new Set<string>(), maxCols: 0, columnLetters: [] };
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const merges = worksheet['!merges'] || [];

    // Map out merge blocks
    const startMap = new Map<string, MergeInfo>();
    const coveredSet = new Set<string>();

    for (const m of merges) {
      const startKey = `${m.s.r}:${m.s.c}`;
      const rowSpan = m.e.r - m.s.r + 1;
      const colSpan = m.e.c - m.s.c + 1;
      startMap.set(startKey, { rowSpan, colSpan });

      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r !== m.s.r || c !== m.s.c) {
            coveredSet.add(`${r}:${c}`);
          }
        }
      }
    }

    const rows: CellData[][] = [];
    const totalCols = Math.max(1, range.e.c - range.s.c + 1);
    const colLettersList: string[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      colLettersList.push(XLSX.utils.encode_col(c));
    }

    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: CellData[] = [];

      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[addr];
        const colLetter = XLSX.utils.encode_col(c);

        if (!cell) {
          const palette = getCellPalette(r, c, colLetter, '');
          row.push({
            text: '',
            value: null,
            colIndex: c,
            colLetter,
            rowIndex: r,
            bgColor: palette.bg,
            textColor: palette.text,
            isHeader: r === 0,
          });
          continue;
        }

        const val = cell.v !== undefined ? cell.v : null;
        let text = cell.w !== undefined ? String(cell.w) : (cell.v !== undefined ? String(cell.v) : '');
        let hyperlink: string | undefined = cell.l?.Target || (cell.l as any)?.target;
        const tooltip: string | undefined = cell.l?.Tooltip;

        // Parse =HYPERLINK("https://...", "Label") formula or unquoted / single quoted formulas
        if (!hyperlink && cell.f) {
          const match = cell.f.match(/HYPERLINK\(\s*["']?([^"',)]+)["']?(?:\s*,\s*["']?([^"')]*)["']?)?\s*\)/i);
          if (match) {
            hyperlink = match[1].replace(/["']/g, '').trim();
            if (match[2] && (!text || text.startsWith('='))) {
              text = match[2].replace(/["']/g, '').trim();
            }
          }
        }

        // Parse HTML link if generated by SheetJS (cell.h)
        if (!hyperlink && (cell as any).h) {
          const hMatch = String((cell as any).h).match(/href=["']([^"']+)["']/i);
          if (hMatch) {
            hyperlink = hMatch[1];
          }
        }

        const palette = getCellPalette(r, c, colLetter, text);

        row.push({
          text,
          value: val,
          hyperlink,
          tooltip,
          formula: cell.f,
          colIndex: c,
          colLetter,
          rowIndex: r,
          bgColor: palette.bg,
          textColor: palette.text,
          isHeader: r === 0,
        });
      }

      rows.push(row);
    }

    // Trim trailing blank rows
    while (rows.length > 0 && rows[rows.length - 1].every((c) => !c.text.trim() && !c.hyperlink)) {
      rows.pop();
    }

    return {
      sheetRows: rows,
      mergeStartMap: startMap,
      mergeCoveredSet: coveredSet,
      maxCols: totalCols,
      columnLetters: colLettersList,
    };
  }, [workbook, activeSheetName]);

  // Extract all hyperlinks across worksheet for quick exploration
  const sheetLinks = useMemo(() => {
    const links: Array<{
      url: string;
      text: string;
      cellAddress: string;
      rowNumber: number;
      colLetter: string;
      context: string;
    }> = [];

    sheetRows.forEach((row, rIdx) => {
      // Find row context (e.g. topic name, standard, or date)
      const contextCandidate =
        row.find(
          (c) =>
            c.text.trim().length > 0 &&
            !c.text.startsWith('http') &&
            !c.text.startsWith('www') &&
            !c.text.startsWith('1.http')
        )?.text.trim() || `Row ${rIdx + 1}`;

      row.forEach((cell) => {
        const tokens = tokenizeCellText(cell.text, cell.hyperlink);
        const linkTokens = tokens.filter((t) => t.type === 'link' && t.url);

        linkTokens.forEach((lt) => {
          links.push({
            url: lt.url!,
            text: lt.text,
            cellAddress: `${cell.colLetter}${cell.rowIndex + 1}`,
            rowNumber: cell.rowIndex + 1,
            colLetter: cell.colLetter,
            context: contextCandidate,
          });
        });
      });
    });

    return links;
  }, [sheetRows]);

  // Initial active cell formula sync
  useEffect(() => {
    if (sheetRows.length > 0) {
      const firstCell = sheetRows[0]?.[0];
      if (firstCell) {
        setFormulaValue(firstCell.formula ? `=${firstCell.formula}` : firstCell.text);
      }
    }
  }, [sheetRows]);

  // Filtered links for side drawer
  const filteredSheetLinks = useMemo(() => {
    if (!linkSearchTerm.trim()) return sheetLinks;
    const term = linkSearchTerm.toLowerCase();
    return sheetLinks.filter(
      (item) =>
        item.url.toLowerCase().includes(term) ||
        item.text.toLowerCase().includes(term) ||
        item.context.toLowerCase().includes(term) ||
        item.cellAddress.toLowerCase().includes(term)
    );
  }, [sheetLinks, linkSearchTerm]);

  // Filter rows if in-sheet search term is active
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return sheetRows;
    const term = searchTerm.toLowerCase();
    return sheetRows.filter((row, idx) => {
      if (idx === 0) return true; // keep header
      return row.some((cell) => {
        const textMatch = cell.text.toLowerCase().includes(term);
        const linkMatch = cell.hyperlink ? cell.hyperlink.toLowerCase().includes(term) : false;
        return textMatch || linkMatch;
      });
    });
  }, [sheetRows, searchTerm]);

  // Cell selection handler
  const handleCellClick = (cell: CellData) => {
    const addr = `${cell.colLetter}${cell.rowIndex + 1}`;
    setActiveCellAddress(addr);
    setFormulaValue(cell.formula ? `=${cell.formula}` : cell.text);
  };

  const handleCopyLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleOpenLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyFormula = () => {
    if (!formulaValue) return;
    navigator.clipboard.writeText(formulaValue);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white space-y-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-xs text-slate-300 font-medium">Opening Microsoft Excel Spreadsheet & Hyperlinks...</span>
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
            <p className="text-xs text-slate-300 mb-2">
              {file.file_name} ({formatBytes(file.file_size)})
            </p>
            <p className="text-2xs text-slate-400">
              {error || 'This spreadsheet format is best viewed in Microsoft Excel or Google Sheets.'}
            </p>
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
    <div
      className={`w-full h-full flex flex-col bg-[#f3f4f6] text-slate-800 overflow-hidden select-text relative font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950' : ''
      }`}
    >
      {/* 3. MAIN SPREADSHEET GRID (Single Clean Scrollbar for Vertical and Horizontal) */}
      <div className="flex-1 flex overflow-hidden relative bg-[#f3f4f6] min-h-0 min-w-0">
        {/* Scrollable Viewport */}
        <div
          ref={tableContainerRef}
          className="flex-1 overflow-auto bg-[#e5e7eb] relative excel-viewport-custom w-full h-full"
        >
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: zoomLevel < 100 ? `${(100 / zoomLevel) * 100}%` : 'max-content',
            }}
            className="inline-block min-w-full align-top bg-white shadow-md border-r border-b border-slate-300"
          >
              <table className="border-collapse text-xs select-text w-full">
                {/* Column Headers (A, B, C, D, E, F, G...) */}
                <thead className="sticky top-0 z-20 bg-[#f2f4f7] shadow-2xs">
                  <tr>
                    {/* Corner Select-All cell (◢) */}
                    <th className="w-12 min-w-[48px] px-2 py-1.5 text-center font-mono font-bold text-slate-400 bg-[#e5e7eb] border-r border-b border-slate-300 select-none sticky left-0 top-0 z-30">
                      <span className="text-3xs">◢</span>
                    </th>
                    {columnLetters.map((colLetter) => {
                      const isActiveCol = activeCellAddress.startsWith(colLetter);
                      return (
                        <th
                          key={colLetter}
                          className={`px-3 py-1.5 text-center font-sans font-bold tracking-wider text-xs border-r border-b border-slate-300 select-none min-w-[130px] transition-colors ${
                            isActiveCol
                              ? 'bg-[#c6e0b4] text-[#1e3a1e] border-b-2 border-b-[#107c41]'
                              : 'bg-[#f2f4f7] text-slate-600'
                          }`}
                        >
                          {colLetter}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Spreadsheet Body */}
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((row, rIdx) => {
                    const rowNumber = rIdx + 1;
                    const isActiveRow = activeCellAddress.endsWith(String(rowNumber));

                    return (
                      <tr key={rIdx} className="hover:brightness-95 transition-colors">
                        {/* Row Index (#) */}
                        <td
                          className={`w-12 min-w-[48px] px-2 py-2 text-center font-mono font-semibold text-xs border-r border-b border-slate-300 select-none sticky left-0 z-10 ${
                            isActiveRow
                              ? 'bg-[#c6e0b4] text-[#1e3a1e] border-r-2 border-r-[#107c41]'
                              : 'bg-[#f2f4f7] text-slate-600'
                          }`}
                        >
                          {rowNumber}
                        </td>

                        {/* Cell Columns */}
                        {row.map((cell, cIdx) => {
                          const cellKey = `${cell.rowIndex}:${cell.colIndex}`;

                          // If this cell is covered by another merged cell, skip rendering <td>
                          if (mergeCoveredSet.has(cellKey)) {
                            return null;
                          }

                          const merge = mergeStartMap.get(cellKey);
                          const addr = `${cell.colLetter}${cell.rowIndex + 1}`;
                          const isSelected = activeCellAddress === addr;
                          const tokens = tokenizeCellText(cell.text, cell.hyperlink);
                          const hasLinks = tokens.some((t) => t.type === 'link');

                          return (
                            <td
                              key={cIdx}
                              rowSpan={merge ? merge.rowSpan : 1}
                              colSpan={merge ? merge.colSpan : 1}
                              onClick={() => handleCellClick(cell)}
                              style={{
                                backgroundColor: cell.bgColor || '#ffffff',
                                color: cell.textColor || '#1e293b',
                              }}
                              className={`px-3 py-2 border-r border-b border-slate-300 align-top cursor-cell relative group ${
                                isWrapText
                                  ? 'min-w-[130px] max-w-[480px] whitespace-pre-wrap break-words leading-relaxed'
                                  : 'max-w-[280px] truncate whitespace-nowrap'
                              } ${cell.isHeader ? 'font-bold text-center' : ''} ${
                                isSelected ? 'ring-2 ring-[#107c41] ring-inset z-10' : ''
                              }`}
                              title={cell.tooltip || cell.text}
                            >
                              {hasLinks ? (
                                <CellLinkTokens
                                  tokens={tokens}
                                  onOpen={handleOpenLink}
                                  onCopy={handleCopyLink}
                                  copiedLink={copiedLink}
                                />
                              ) : (
                                <span className={cIdx === 0 && rIdx > 0 ? 'font-bold text-center block' : ''}>
                                  {cell.text}
                                </span>
                              )}

                              {/* Active Cell Fill Handle (Excel signature green square) */}
                              {isSelected && (
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#107c41] border border-white z-20 pointer-events-none" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        {/* Links Directory Side Drawer */}
        {showLinksDrawer && (
          <div className="w-80 sm:w-96 bg-white border-l border-slate-300 flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-200">
            <div className="px-4 py-3 bg-[#107c41] text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4" />
                <h4 className="text-xs font-bold">Worksheet Links ({sheetLinks.length})</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowLinksDrawer(false)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter links by name or URL..."
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#107c41]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-100">
              {filteredSheetLinks.length > 0 ? (
                filteredSheetLinks.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-mono px-2 py-0.5 rounded bg-emerald-50 text-[#107c41] font-bold border border-emerald-200">
                        {item.cellAddress} (Row {item.rowNumber})
                      </span>
                      <span className="truncate max-w-[160px] text-slate-600 font-medium">{item.context}</span>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleOpenLink(e, item.url)}
                      className="block text-xs font-mono text-blue-600 hover:text-blue-800 underline break-all leading-snug font-medium"
                      title={item.url}
                    >
                      {item.url}
                    </a>

                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, item.url)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-medium inline-flex items-center space-x-1 transition-colors"
                      >
                        {copiedLink === item.url ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleOpenLink(e, item.url)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-2xs font-semibold inline-flex items-center space-x-1 shadow-xs transition-colors"
                      >
                        <span>Open Video / Link</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No links match your search filter.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM SHEET TAB BAR & STATUS BAR */}
      <div className="bg-[#f2f4f7] border-t border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-600 flex-shrink-0 gap-2 select-none shadow-2xs">
        {/* Left: Sheet Navigation & Tabs */}
        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-0.5 border-r border-slate-300 pr-2 mr-2">
            <button
              type="button"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
              title="Previous Sheet"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
              title="Next Sheet"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Sheet Tab(s) */}
          <div className="flex items-center space-x-1 overflow-x-auto">
            {sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheetName(name)}
                className={`px-3 py-1 rounded-t border-t border-x text-xs font-semibold transition-all whitespace-nowrap ${
                  activeSheetName === name
                    ? 'bg-white text-[#107c41] border-slate-300 border-b-2 border-b-[#107c41] shadow-2xs'
                    : 'bg-[#e5e7eb] text-slate-600 border-transparent hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 ml-1"
            title="Add sheet"
          >
            +
          </button>
        </div>

        {/* Right: Search, Zoom, Active Cell, Total Rows & Clickable Video Links Pill */}
        <div className="flex items-center space-x-2.5 text-2xs font-medium">
          {/* Quick Search in Sheet */}
          <div className="relative w-28 sm:w-36 flex-shrink-0">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find in sheet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-6 pr-5 py-0.5 bg-white border border-slate-300 rounded text-3xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Quick Zoom Controls */}
          <div className="flex items-center bg-white rounded border border-slate-300 px-1 py-0.5 text-3xs text-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom out"
            >
              <ZoomOut className="w-2.5 h-2.5" />
            </button>
            <span
              onClick={() => setZoomLevel(100)}
              className="px-1 text-3xs font-mono font-bold cursor-pointer hover:underline"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-0.5 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom in"
            >
              <ZoomIn className="w-2.5 h-2.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsWrapText((w) => !w)}
            className={`px-2 py-0.5 rounded border text-3xs font-semibold inline-flex items-center space-x-1 transition-colors ${
              isWrapText
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-500 border-slate-300 hover:text-slate-800'
            }`}
            title="Toggle text wrapping"
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap</span>
          </button>

          <span className="text-slate-500 hidden sm:inline">
            Active: <strong className="text-[#107c41] font-mono">{activeCellAddress}</strong>
          </span>

          <span className="text-slate-500 hidden md:inline">
            Rows: <strong className="text-slate-700">{sheetRows.length}</strong>
          </span>

          {sheetLinks.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLinksDrawer((prev) => !prev)}
              className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-bold inline-flex items-center space-x-1.5 shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-blue-600" />
              <span>{sheetLinks.length} Clickable Video Links</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Copied Toast Alert */}
      {copiedLink && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-xl flex items-center space-x-1.5 animate-in fade-in zoom-in-95">
          <Check className="w-3.5 h-3.5" />
          <span>Link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
};

/**
 * Tokenized Cell Links component
 * Renders individual links inside table cells with distinct clickable blue links,
 * external link icons, and quick-copy buttons.
 */
interface CellLinkTokensProps {
  tokens: TextToken[];
  onOpen: (e: React.MouseEvent, url: string) => void;
  onCopy: (e: React.MouseEvent, url: string) => void;
  copiedLink: string | null;
}

const CellLinkTokens: React.FC<CellLinkTokensProps> = ({ tokens, onOpen, onCopy, copiedLink }) => {
  return (
    <span className="inline">
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <span key={idx}>{token.text}</span>;
        }

        const isCopied = copiedLink === token.url;

        return (
          <span key={idx} className="inline-block my-0.5 group/link">
            <a
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => onOpen(e, token.url!)}
              onTouchEnd={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 hover:bg-blue-100/70 active:bg-blue-200 px-1 py-0.5 rounded transition-all break-all cursor-pointer mr-1 touch-manipulation"
              title={`Open resource link: ${token.url}`}
            >
              <span>{token.text}</span>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 group-hover/link:text-blue-800 inline" />
            </a>

            <button
              type="button"
              onClick={(e) => onCopy(e, token.url!)}
              onTouchEnd={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center p-1 sm:p-0.5 min-w-[22px] min-h-[22px] rounded hover:bg-slate-200 active:bg-slate-300 text-slate-400 hover:text-slate-700 transition-colors align-middle touch-manipulation"
              title={isCopied ? 'Copied to clipboard' : 'Copy link'}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              )}
            </button>
          </span>
        );
      })}
    </span>
  );
};
