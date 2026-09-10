import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from './db.ts';

export function ensureSampleFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // 1. Sample PDF: Class_12_CS_Lesson_1_Overview.pdf
  const pdfPath = path.join(UPLOADS_DIR, 'sample_cs_lesson_1.pdf');
  if (!fs.existsSync(pdfPath)) {
    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 218 >> stream
BT
/F1 24 Tf
50 720 Td
(Teacher Resource Hub - Class 12 CS) Tj
/F1 14 Tf
0 -36 Td
(Lesson 1: Introduction to Object Oriented Programming) Tj
0 -24 Td
(Topics Covered: Classes, Objects, Inheritance, Polymorphism) Tj
0 -24 Td
(Teacher: teacher@school.edu | Cloud Sync: Verified Active) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000535 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
606
%%EOF`;
    fs.writeFileSync(pdfPath, pdfContent, 'utf-8');
  }

  // 2. Sample Image: sample_network_topologies.png (1x1 transparent or standard PNG)
  const imgPath = path.join(UPLOADS_DIR, 'sample_network_topologies.png');
  if (!fs.existsSync(imgPath)) {
    // 8x8 blue-indigo test PNG base64
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAElEQVQYV2NkgALGE3/vMzAw/EcxBqGBkQEiA5Nkxik45FmwKsCmAKsWzBhkWwFh3e/9n0kxhkFkYmRi5uA8+fcvXlMwhQAA8zAVy8k0B8MAAAAASUVORK5CYII=';
    fs.writeFileSync(imgPath, Buffer.from(pngBase64, 'base64'));
  }

  // 3. Sample Audio: sample_audio_podcast.mp3 (Small valid MP3 frame)
  const audioPath = path.join(UPLOADS_DIR, 'sample_audio_podcast.mp3');
  if (!fs.existsSync(audioPath)) {
    // Write minimal MP3 frame header with silent bytes
    const mp3Buffer = Buffer.alloc(1024 * 32);
    mp3Buffer[0] = 0xff;
    mp3Buffer[1] = 0xfb; // MPEG1 Layer 3
    mp3Buffer[2] = 0x90; // 128 kbps, 44.1kHz
    mp3Buffer[3] = 0x00;
    fs.writeFileSync(audioPath, mp3Buffer);
  }

  // 4. Sample Video: sample_video_lesson5.mp4
  const videoPath = path.join(UPLOADS_DIR, 'sample_video_lesson5.mp4');
  if (!fs.existsSync(videoPath)) {
    // Minimal MP4 container box header (ftyp + moov + mdat)
    const ftyp = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
      0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    const mdat = Buffer.alloc(1024 * 64);
    mdat.writeUInt32BE(mdat.length, 0);
    mdat.write('mdat', 4);
    fs.writeFileSync(videoPath, Buffer.concat([ftyp, mdat]));
  }
}
