import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  RotateCcw,
  Smartphone,
  Laptop,
  Calendar,
  HardDrive,
  Info,
  AlertCircle,
  ExternalLink,
  Loader2,
  Film,
} from 'lucide-react';
import { FileItem } from '../types.ts';
import { api } from '../services/api.ts';
import { formatBytes, formatDate, formatDuration } from '../utils/format.ts';

interface VideoPlayerModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ file, onClose, onDownload }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);

  useEffect(() => {
    setVideoError(null);
    setLoadingMedia(true);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [file?.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!file) return null;

  const streamUrl = api.files.getStreamUrl(file.id);

  const togglePlay = () => {
    if (!videoRef.current || videoError) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || file.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div id="video-player-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        ref={containerRef}
        className="bg-slate-900 text-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
      >
        {/* Top Header */}
        <div className="p-4 bg-slate-900/90 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2 truncate mr-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-sm truncate text-slate-100">{file.file_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative bg-black flex items-center justify-center min-h-[300px] sm:min-h-[440px] aspect-video overflow-hidden">
          <video
            ref={videoRef}
            src={streamUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={() => {
              setLoadingMedia(false);
              setVideoError(null);
            }}
            onError={(e) => {
              setLoadingMedia(false);
              const mediaErr = (e.currentTarget as HTMLVideoElement).error;
              let detail = 'The video stream could not be loaded or the format is not natively decodable in this browser.';
              if (mediaErr?.code === 4) {
                detail = 'The video format or codec (e.g. WhatsApp AVC/HEVC/AAC) cannot be decoded inline in this browser.';
              }
              setVideoError(detail);
            }}
            onClick={togglePlay}
            playsInline
            className={`w-full h-full object-contain cursor-pointer ${videoError ? 'hidden' : 'block'}`}
          />

          {/* Loading spinner */}
          {loadingMedia && !videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
              <span className="text-xs text-slate-300 font-medium">Loading video stream...</span>
            </div>
          )}

          {/* Video Playback Error Overlay */}
          {videoError && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Browser Video Playback Notice</h4>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                {videoError}
              </p>
              <div className="flex items-center space-x-3">
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => onDownload(file)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download Video
                </button>
              </div>
            </div>
          )}

          {/* Large Center Play Button overlay when paused */}
          {!isPlaying && !loadingMedia && !videoError && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            >
              <Play className="w-7 h-7 ml-1" />
            </button>
          )}
        </div>

        {/* Integrated Player Controls per Requirement #7 */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
          {/* Progress Bar with timestamp */}
          <div className="flex items-center space-x-3">
            <span className="text-2xs font-mono text-slate-400 w-12 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-2xs font-mono text-slate-400 w-12">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Control Buttons Row */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              <button
                type="button"
                onClick={restartVideo}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-1 pl-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 text-slate-300 hover:text-white"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Playback Speed dropdown */}
              <div className="flex items-center space-x-1 text-slate-400">
                <span className="text-2xs">Speed:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-2xs focus:outline-none"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x (Normal)</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800"
                title="Full Screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Metadata Footer (Requirement #7) */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-2xs text-slate-400 gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <HardDrive className="w-3 h-3 mr-1 text-slate-500" />
                {formatBytes(file.file_size)}
              </span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                {formatDate(file.uploaded_at)}
              </span>
              <span className="flex items-center text-indigo-400">
                {/mobile|iphone|android/i.test(file.device) ? (
                  <Smartphone className="w-3 h-3 mr-1" />
                ) : (
                  <Laptop className="w-3 h-3 mr-1" />
                )}
                Uploaded from: {file.device}
              </span>
            </div>

            <span className="text-slate-500">Owner: {file.owner_name || 'Teacher'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
