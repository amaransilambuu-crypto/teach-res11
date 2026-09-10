import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { FileItem } from '../../types.ts';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface PdfViewerProps {
  file: FileItem;
  previewUrl: string;
  onDownload: (file: FileItem) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, previewUrl, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderTask, setRenderTask] = useState<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        // Ensure PDF.js engine is available
        let engine: any = (pdfjsLib && typeof (pdfjsLib as any).getDocument === 'function') ? pdfjsLib : null;
        if (!engine && !window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PDF preview engine.'));
            document.head.appendChild(script);
          });
        }
        if (!engine) {
          engine = window.pdfjsLib;
        }

        if (engine && engine.GlobalWorkerOptions && !engine.GlobalWorkerOptions.workerSrc) {
          engine.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // Fetch PDF binary with auth
        const token = localStorage.getItem('trh_token') || sessionStorage.getItem('trh_token');
        const response = await fetch(previewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF file from cloud (HTTP ${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = engine.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;

        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('PDF.js loading error:', err);
          setError(err?.message || 'Failed to render PDF document.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [previewUrl]);

  // Render Current Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let active = true;

    if (renderTask) {
      try {
        renderTask.cancel();
      } catch {
        // ignore cancellation
      }
    }

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const task = page.render({
          canvasContext: context,
          transform: transform || undefined,
          viewport,
        });

        setRenderTask(task);
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, currentPage, scale]);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(numPages, p + 1));
  const handleZoomIn = () => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(1))));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      // standard letter width is ~612pt
      const newScale = Math.max(0.8, containerWidth / 650);
      setScale(Number(newScale.toFixed(2)));
    }
  };

  const handleOpenRaw = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-white select-none">
      {/* Top Toolbar */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Pagination */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={handlePrevPage}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono px-2 py-1 bg-slate-900 rounded-md border border-slate-800 text-slate-200">
            Page <strong className="text-white">{currentPage}</strong> of{' '}
            <strong className="text-slate-400">{numPages || 1}</strong>
          </span>

          <button
            type="button"
            disabled={currentPage >= numPages || loading}
            onClick={handleNextPage}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-2xs font-mono font-semibold px-1.5 text-slate-300">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleFitWidth}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-2xs font-medium inline-flex items-center space-x-1"
            title="Fit Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenRaw}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-2xs font-medium inline-flex items-center"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            New Tab
          </button>

          <button
            type="button"
            onClick={() => onDownload(file)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-2xs font-medium inline-flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4 relative"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs font-medium">Rendering PDF pages with high resolution...</span>
          </div>
        )}

        {error && (
          <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">PDF Preview Unavailable</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={handleOpenRaw}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg inline-flex items-center"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open In Tab
              </button>
              <button
                type="button"
                onClick={() => onDownload(file)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </button>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-sm transition-opacity duration-200 bg-white ${
            loading || error ? 'hidden' : 'block'
          }`}
        />
      </div>
    </div>
  );
};
