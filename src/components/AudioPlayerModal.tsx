import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  Music,
  Smartphone,
  Laptop,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { FileItem } from '../types.ts';
import { api } from '../services/api.ts';
import { formatBytes, formatDate, formatDuration } from '../utils/format.ts';

interface AudioPlayerModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ file, onClose, onDownload }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  if (!file) return null;

  const streamUrl = api.files.getStreamUrl(file.id);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || file.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const restartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div id="audio-player-modal" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 relative">
        <audio
          ref={audioRef}
          src={streamUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs tracking-wider uppercase text-pink-400">
              Audio Lesson Player
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Download Audio"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Visual Waveform Mock */}
        <div className="my-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-600 flex items-center justify-center mx-auto shadow-lg shadow-pink-950/50 mb-4">
            <Music className="w-9 h-9 text-white" />
          </div>
          <h3 className="font-bold text-base text-white truncate px-4">{file.file_name}</h3>
          <p className="text-xs text-slate-400 mt-1">{file.description || 'Educational Audio Resource'}</p>

          {/* Animated EQ Bars when playing */}
          <div className="flex items-center justify-center space-x-1 h-8 mt-4">
            {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 40].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-pink-500 rounded-full transition-all duration-150"
                style={{
                  height: isPlaying ? `${Math.max(15, (h * (0.5 + Math.random() * 0.5)))}%` : '20%',
                  opacity: isPlaying ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="space-y-1.5 mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex justify-between text-2xs font-mono text-slate-400">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={restartAudio}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white"
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
                className="w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-pink-500"
              />
            </div>
          </div>

          {/* Large Center Play */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
          </button>

          {/* Speed Selector */}
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-2xs focus:outline-none"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x Normal</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Metadata Footer */}
        <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-2xs text-slate-400">
          <span className="flex items-center">
            <HardDrive className="w-3 h-3 mr-1 text-slate-500" />
            {formatBytes(file.file_size)}
          </span>
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-1 text-slate-500" />
            {formatDate(file.uploaded_at)}
          </span>
          <span className="flex items-center text-pink-400">
            {/mobile|iphone|android/i.test(file.device) ? (
              <Smartphone className="w-3 h-3 mr-1" />
            ) : (
              <Laptop className="w-3 h-3 mr-1" />
            )}
            {file.device}
          </span>
        </div>
      </div>
    </div>
  );
};
