export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${pad(remMins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'Just now';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';

    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 3600);

    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.round(diffHours * 60));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`;
    }
    if (diffHours < 48) {
      return 'Yesterday';
    }

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return 'Recently';
  }
}

export function getFileCategoryIconName(ext: string): string {
  const e = ext.toLowerCase().replace('.', '');
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(e)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(e)) return 'audio';
  if (['pdf'].includes(e)) return 'pdf';
  if (['doc', 'docx', 'odt'].includes(e)) return 'word';
  if (['xls', 'xlsx', 'csv'].includes(e)) return 'excel';
  if (['ppt', 'pptx'].includes(e)) return 'powerpoint';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(e)) return 'image';
  return 'file';
}
