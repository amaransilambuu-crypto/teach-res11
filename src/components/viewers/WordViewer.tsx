import React, { useState, useEffect, useMemo } from 'react';
import mammoth from 'mammoth';
import {
  FileText,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import { FileItem } from '../../types.ts';
import { formatBytes } from '../../utils/format.ts';

interface WordViewerProps {
  file: FileItem;
  previewUrl: string;
  onDownload: (file: FileItem) => void;
}

export const WordViewer: React.FC<WordViewerProps> = ({ file, previewUrl, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadDocx = async () => {
      try {
        const token = localStorage.getItem('trh_token') || sessionStorage.getItem('trh_token');
        const res = await fetch(previewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch document file (HTTP ${res.status})`);
        }

        const arrayBuffer = await res.arrayBuffer();
        if (!isMounted) return;

        // Use mammoth to convert docx arrayBuffer to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const textResult = await mammoth.extractRawText({ arrayBuffer });

        if (!isMounted) return;

        if (result && result.value && result.value.trim().length > 0) {
          setHtmlContent(result.value);
          setRawText(textResult.value || '');
        } else {
          // If HTML output is empty, check raw text
          if (textResult && textResult.value && textResult.value.trim().length > 0) {
            setHtmlContent(
              textResult.value
                .split('\n')
                .map((p) => `<p>${p || '&nbsp;'}</p>`)
                .join('')
            );
            setRawText(textResult.value);
          } else {
            // Text fallback from decoder or seed file
            const decoder = new TextDecoder('utf-8');
            const fallbackStr = decoder.decode(arrayBuffer);
            if (fallbackStr && fallbackStr.length > 20 && !fallbackStr.includes('\u0000')) {
              setHtmlContent(`<pre class="whitespace-pre-wrap font-sans text-sm">${fallbackStr}</pre>`);
              setRawText(fallbackStr);
            } else {
              setHtmlContent(
                `<div class="p-6 text-center text-slate-500">Document contents parsed. The document contains media or tables best viewed in Microsoft Word.</div>`
              );
            }
          }
        }
        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          console.error('Word document conversion error:', err);
          setError(err?.message || 'Failed to parse Microsoft Word document.');
          setLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [previewUrl]);

  const wordCount = useMemo(() => {
    if (!rawText) return 0;
    return rawText.trim().split(/\s+/).filter(Boolean).length;
  }, [rawText]);

  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleCopy = () => {
    if (rawText) {
      navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoom(1);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white space-y-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-xs text-slate-300 font-medium">Extracting Word document layout and styles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Word Document</h4>
            <p className="text-xs text-slate-300 mb-2">{file.file_name} ({formatBytes(file.file_size)})</p>
            <p className="text-2xs text-slate-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => onDownload(file)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download Word Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-text">
      {/* Top Toolbar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 flex-shrink-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-xs">{file.file_name}</h3>
            <div className="flex items-center space-x-2 text-2xs text-slate-400">
              <span className="flex items-center">
                <BookOpen className="w-3 h-3 mr-1 text-slate-500" />
                {wordCount} words
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1 text-slate-500" />
                ~{readTime} min read
              </span>
            </div>
          </div>
        </div>

        {/* Zoom & Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-1 py-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="text-2xs font-mono font-semibold px-2 text-slate-300 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!rawText}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-2xs font-medium inline-flex items-center transition-colors disabled:opacity-40"
            title="Copy all document text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy Text
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onDownload(file)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold inline-flex items-center shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download (.docx)
          </button>
        </div>
      </div>

      {/* Document Page Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex justify-center items-start">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          className="bg-white text-slate-800 w-full max-w-3xl min-h-[700px] p-8 sm:p-14 rounded-lg shadow-2xl transition-transform duration-150 border border-slate-200/50"
        >
          {/* Rendered HTML from Mammoth with typography */}
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:p-2 prose-th:bg-slate-100 prose-th:border prose-th:border-slate-300 prose-th:p-2 text-slate-800 font-sans"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};
