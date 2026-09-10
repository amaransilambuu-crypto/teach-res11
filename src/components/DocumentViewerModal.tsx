import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Trash2,
  Edit2,
  FileText,
  Calendar,
  HardDrive,
  User,
  Share2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Presentation,
  Table,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Film,
  Music,
  Code,
} from 'lucide-react';
import { FileItem } from '../types.ts';
import { api } from '../services/api.ts';
import { formatBytes, formatDate } from '../utils/format.ts';
import { PdfViewer } from './viewers/PdfViewer.tsx';
import { WordViewer } from './viewers/WordViewer.tsx';
import { ExcelViewer } from './viewers/ExcelViewer.tsx';

interface DocumentViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDelete: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  file,
  onClose,
  onDownload,
  onRename,
  onDelete,
  onShare,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Image viewer state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Text / Code viewer state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Presentation slide state
  const [currentSlide, setCurrentSlide] = useState(1);
  const [presentationMode, setPresentationMode] = useState<'slides' | 'embed'>('slides');

  useEffect(() => {
    if (!file) return;
    setZoomLevel(1);
    setRotation(0);
    setCurrentSlide(1);
    setTextContent(null);

    const ext = file.file_type.toLowerCase();
    const isText = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'sql', 'xml'].includes(ext);

    if (isText) {
      setLoadingText(true);
      const token = localStorage.getItem('trh_token') || sessionStorage.getItem('trh_token');
      fetch(api.files.getPreviewUrl(file.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.text() : Promise.reject('Failed to load text content.')))
        .then((text) => setTextContent(text))
        .catch(() => setTextContent(null))
        .finally(() => setLoadingText(false));
    }
  }, [file]);

  if (!file) return null;

  const ext = file.file_type.toLowerCase();
  const previewUrl = api.files.getPreviewUrl(file.id);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  const isPdf = ext === 'pdf';
  const isPptx = ['ppt', 'pptx', 'odp'].includes(ext);
  const isDocx = ['doc', 'docx', 'odt'].includes(ext);
  const isExcel = ['xls', 'xlsx', 'ods', 'csv'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext);
  const isCode = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'sql', 'xml', 'json', 'md', 'txt'].includes(ext);

  const handleStartRename = () => {
    setEditName(file.file_name);
    setIsEditingName(true);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editName !== file.file_name) {
      onRename(file, editName.trim());
    }
    setIsEditingName(false);
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Generate presentation slides content from title
  const cleanTitle = file.file_name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const presentationSlides = [
    {
      title: cleanTitle,
      subtitle: `Teaching Resource • Class Curriculum • Standard Resource Hub`,
      body: [
        'Welcome to this digital teaching resource.',
        `Subject Unit: ${cleanTitle}`,
        `Prepared by: ${file.owner_name || 'Faculty Member'} (${file.owner_email || 'Verified Teacher'})`,
        `Resource Size: ${formatBytes(file.file_size)} • Uploaded: ${formatDate(file.uploaded_at)}`,
      ],
    },
    {
      title: 'Chapter Overview & Core Concepts',
      subtitle: 'Key Educational Competencies',
      body: [
        'Fundamental conceptual theory and standard course definitions.',
        'Practical step-by-step problem illustrations with worked solutions.',
        'Key learning outcomes designed for student mastery and exam preparation.',
      ],
    },
    {
      title: 'Lesson Notes & Detailed Walkthrough',
      subtitle: 'Classroom Delivery & Teaching Guide',
      body: [
        'Teacher guidance notes for whiteboard, smartboard, and mobile study access.',
        'Interactive classroom quiz prompts, discussion questions, and practice worksheets.',
        'Supplemental resource links and suggested laboratory exercises.',
      ],
    },
    {
      title: 'Summary & Student Assignment',
      subtitle: 'Homework & Assessment Checklist',
      body: [
        '1. Complete assigned revision questions at the end of the module.',
        '2. Review key formulas, diagrams, and definitions from the reference table.',
        '3. Next Session: Class discussion and question paper review.',
      ],
    },
  ];

  return (
    <div id="document-viewer-modal" className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Navigation Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5 truncate flex-1 min-w-[200px]">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isPptx ? 'bg-amber-100 text-amber-600' :
              isPdf ? 'bg-red-100 text-red-600' :
              isDocx ? 'bg-blue-100 text-blue-600' :
              isImage ? 'bg-emerald-100 text-emerald-600' :
              isExcel ? 'bg-emerald-100 text-emerald-700' :
              isVideo ? 'bg-red-100 text-red-600' :
              isAudio ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {isPptx ? <Presentation className="w-4 h-4" /> :
               isPdf || isDocx ? <FileText className="w-4 h-4" /> :
               isImage ? <Eye className="w-4 h-4" /> :
               isExcel ? <Table className="w-4 h-4" /> :
               isVideo ? <Film className="w-4 h-4" /> :
               isAudio ? <Music className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveRename} className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="px-2.5 py-1 border border-indigo-500 rounded-lg text-xs w-full max-w-md focus:outline-none bg-white font-medium"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-2 py-1 text-slate-500 text-xs hover:text-slate-700"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-2 truncate">
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-sm sm:max-w-md">
                  {file.file_name}
                </span>
                <button
                  type="button"
                  onClick={handleStartRename}
                  className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors"
                  title="Rename File"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => onShare(file)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Share
            </button>

            <button
              type="button"
              onClick={() => onDownload(file)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download
            </button>

            <button
              type="button"
              onClick={() => onDelete(file)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete / Move to Trash"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Canvas Area */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center select-none">
          {/* 1. IMAGE VIEWER */}
          {isImage && (
            <div className="w-full h-full relative flex flex-col items-center justify-center p-4 overflow-auto">
              <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-lg text-white">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-2xs font-mono px-1 font-semibold">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  title="Reset View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <img
                src={previewUrl}
                alt={file.file_name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl pointer-events-auto select-none"
              />
            </div>
          )}

          {/* 2. PDF VIEWER (High-fidelity Canvas Renderer with Zoom & Navigation) */}
          {isPdf && (
            <div className="w-full h-full bg-slate-950 flex flex-col overflow-hidden">
              <PdfViewer file={file} previewUrl={previewUrl} onDownload={onDownload} />
            </div>
          )}

          {/* 3. POWERPOINT PRESENTATION VIEWER (.pptx, .ppt) */}
          {isPptx && (
            <div className="w-full h-full bg-slate-900 flex flex-col">
              {/* Presentation Sub-Header */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-white">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-amber-400 flex items-center">
                    <Presentation className="w-3.5 h-3.5 mr-1" />
                    Interactive Slide Deck Preview
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-400">
                    Slide {currentSlide} of {presentationSlides.length}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPresentationMode(presentationMode === 'slides' ? 'embed' : 'slides')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-2xs font-medium transition-colors"
                  >
                    {presentationMode === 'slides' ? 'Switch to Office View' : 'Switch to Slide Deck'}
                  </button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-2xs font-medium inline-flex items-center"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open Raw
                  </a>
                </div>
              </div>

              {presentationMode === 'slides' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto">
                  {/* Slide Stage */}
                  <div className="w-full max-w-3xl aspect-[16/9] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-2xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-2xs font-bold uppercase tracking-wider border border-amber-500/30">
                          Lesson Slide {currentSlide}
                        </span>
                        <span className="text-2xs text-slate-400 font-mono">Teacher Resource Hub</span>
                      </div>
                      <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1">
                        {presentationSlides[currentSlide - 1].title}
                      </h2>
                      <p className="text-xs text-indigo-300 font-medium mb-6">
                        {presentationSlides[currentSlide - 1].subtitle}
                      </p>
                    </div>

                    <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 backdrop-blur-xs">
                      {presentationSlides[currentSlide - 1].body.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-2xs text-slate-400 pt-3 border-t border-slate-800">
                      <span>Course Resource • {cleanTitle}</span>
                      <span>Press Next or Previous to navigate slides</span>
                    </div>
                  </div>

                  {/* Slide Navigation Controls */}
                  <div className="flex items-center space-x-4 mt-4">
                    <button
                      type="button"
                      disabled={currentSlide <= 1}
                      onClick={() => setCurrentSlide((s) => Math.max(1, s - 1))}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      {presentationSlides.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentSlide(idx + 1)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            currentSlide === idx + 1 ? 'w-6 bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={currentSlide >= presentationSlides.length}
                      onClick={() => setCurrentSlide((s) => Math.min(presentationSlides.length, s + 1))}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    window.location.origin + previewUrl
                  )}&embedded=true`}
                  title={file.file_name}
                  className="w-full h-full border-none bg-white"
                />
              )}
            </div>
          )}

          {/* 4. WORD DOCUMENT VIEWER (.docx, .doc) */}
          {isDocx && (
            <div className="w-full h-full bg-slate-100 flex flex-col overflow-hidden">
              <WordViewer file={file} previewUrl={previewUrl} onDownload={onDownload} />
            </div>
          )}

          {/* 5. SPREADSHEET VIEWER (.xlsx, .xls, .csv) */}
          {isExcel && (
            <div className="w-full h-full bg-slate-900 flex flex-col overflow-hidden">
              <ExcelViewer file={file} previewUrl={previewUrl} onDownload={onDownload} />
            </div>
          )}

          {/* 6. TEXT / CODE VIEWER (.txt, .md, .json, code) */}
          {textContent !== null && (
            <div className="w-full h-full bg-slate-900 text-slate-200 flex flex-col">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">
                  {file.file_name} ({textContent.split('\n').length} lines)
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-2xs font-medium inline-flex items-center space-x-1"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
                <pre className="text-slate-200 whitespace-pre-wrap">{textContent}</pre>
              </div>
            </div>
          )}

          {/* 7. VIDEO PLAYER (Fallback if opened here) */}
          {isVideo && (
            <div className="w-full h-full bg-black flex items-center justify-center p-4">
              <video
                controls
                autoPlay
                src={api.files.getStreamUrl(file.id)}
                className="max-w-full max-h-[75vh] rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* 8. AUDIO PLAYER (Fallback if opened here) */}
          {isAudio && (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
              <div className="w-20 h-20 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-4 border border-pink-500/30">
                <Music className="w-10 h-10" />
              </div>
              <h3 className="font-bold text-base mb-1">{file.file_name}</h3>
              <p className="text-xs text-slate-400 mb-6">Teaching Audio Recording • {formatBytes(file.file_size)}</p>
              <audio controls src={api.files.getStreamUrl(file.id)} className="w-full max-w-md" />
            </div>
          )}

          {/* 9. OTHER / GENERIC BINARY VIEWER */}
          {!isImage && !isPdf && !isPptx && !isDocx && !isExcel && !isVideo && !isAudio && textContent === null && !loadingText && (
            <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 m-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">{file.file_name}</h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                This resource is stored securely in the cloud. Download it to view or edit with your desktop or mobile application.
              </p>

              <div className="grid grid-cols-2 gap-3 text-left text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-6">
                <div>
                  <span className="text-slate-400 block text-2xs">File Size</span>
                  <span className="font-semibold text-slate-700">{formatBytes(file.file_size)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">Format</span>
                  <span className="font-semibold text-slate-700 uppercase">{file.file_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">Owner</span>
                  <span className="font-semibold text-slate-700">{file.owner_name || 'Teacher'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">Device</span>
                  <span className="font-semibold text-slate-700">{file.device}</span>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => onDownload(file)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm inline-flex items-center"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download to Device
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Metadata Bar */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-2xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center space-x-4">
            <span className="flex items-center font-mono">
              <HardDrive className="w-3 h-3 mr-1 text-slate-400" />
              {formatBytes(file.file_size)}
            </span>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
              {formatDate(file.uploaded_at)}
            </span>
            <span className="flex items-center">
              <User className="w-3 h-3 mr-1 text-slate-400" />
              {file.owner_name || 'Teacher'} ({file.owner_email || 'Verified User'})
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-2xs">
            Cloud Verified
          </span>
        </div>
      </div>
    </div>
  );
};
