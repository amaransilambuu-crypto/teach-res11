import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';
import { FileItem, Folder, User } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the database ID specified in config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operation types for error handling as prescribed in Firebase skill guidelines
export enum OperationType {
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  DELETE = 'delete',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp: string;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    timestamp: new Date().toISOString(),
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// Test connection on boot per SKILL.md
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test_conn', 'ping'));
    console.log('[Firestore] Connected successfully to cloud database:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline, cached data will be used.');
    } else {
      console.warn('[Firestore] Connection test notice:', error);
    }
    return false;
  }
}

// Automatically trigger connection test
testFirestoreConnection();

// Chunk size for Firestore document size limits (~600KB base64 safe chunking)
const FIRESTORE_CHUNK_SIZE = 600 * 1024;

// ==========================================
// USER OPERATIONS
// ==========================================

export async function firestoreSaveUser(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function firestoreGetUserByEmail(email: string): Promise<User | null> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

export async function firestoreGetUsers(): Promise<User[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as User);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// ==========================================
// FOLDER OPERATIONS (Real-time Cloud Synced)
// ==========================================

export async function firestoreGetFolders(): Promise<Folder[]> {
  const path = 'folders';
  try {
    const snap = await getDocs(collection(db, 'folders'));
    return snap.docs.map((d) => d.data() as Folder);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function firestoreSaveFolder(folder: Folder): Promise<void> {
  const path = `folders/${folder.id}`;
  try {
    await setDoc(doc(db, 'folders', folder.id), folder, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function firestoreDeleteFolder(folderId: string): Promise<void> {
  const path = `folders/${folderId}`;
  try {
    await deleteDoc(doc(db, 'folders', folderId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function firestoreSubscribeFolders(callback: (folders: Folder[]) => void): Unsubscribe {
  const path = 'folders';
  return onSnapshot(
    collection(db, 'folders'),
    (snapshot) => {
      const folders = snapshot.docs.map((d) => d.data() as Folder);
      callback(folders);
    },
    (err) => {
      console.warn('[Firestore] Folders subscription notice:', err.message);
    }
  );
}

// ==========================================
// FILE OPERATIONS (Multi-device Upload & Sync)
// ==========================================

export interface FirestoreFileDoc extends FileItem {
  isChunked?: boolean;
  totalChunks?: number;
  dataUrl?: string;
}

/**
 * Save an uploaded file to Firestore so it is immediately accessible
 * from both mobile phone browsers and desktop computers!
 */
export async function firestoreSaveFile(fileItem: FileItem, dataUrl?: string): Promise<void> {
  const path = `files/${fileItem.id}`;
  try {
    const fileRef = doc(db, 'files', fileItem.id);

    if (dataUrl && dataUrl.length > FIRESTORE_CHUNK_SIZE) {
      // Large file: chunk into subcollection 'chunks'
      const totalChunks = Math.ceil(dataUrl.length / FIRESTORE_CHUNK_SIZE);
      const metadata: FirestoreFileDoc = {
        ...fileItem,
        isChunked: true,
        totalChunks,
      };
      // Do not store the giant dataUrl on the main document
      delete metadata.dataUrl;

      await setDoc(fileRef, metadata, { merge: true });

      // Save chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * FIRESTORE_CHUNK_SIZE;
        const end = Math.min(dataUrl.length, start + FIRESTORE_CHUNK_SIZE);
        const chunkData = dataUrl.substring(start, end);
        const chunkRef = doc(db, 'files', fileItem.id, 'chunks', `chunk_${i}`);
        await setDoc(chunkRef, { index: i, chunkData });
      }
    } else {
      // Standard file (under 600KB base64): store directly on doc
      const fileData: FirestoreFileDoc = {
        ...fileItem,
        isChunked: false,
        totalChunks: 1,
        ...(dataUrl ? { dataUrl } : {}),
      };
      await setDoc(fileRef, fileData, { merge: true });
    }
    console.log('[Firestore] File uploaded & synced to cloud:', fileItem.file_name, fileItem.id);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Retrieve all files from Firestore cloud collection.
 */
export async function firestoreGetFiles(): Promise<FileItem[]> {
  const path = 'files';
  try {
    const snap = await getDocs(collection(db, 'files'));
    return snap.docs.map((d) => {
      const data = d.data() as FirestoreFileDoc;
      return data as FileItem;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Retrieve full file content (including chunked dataUrl) for viewing/downloading.
 */
export async function firestoreGetFileData(fileId: string): Promise<(FileItem & { dataUrl?: string }) | null> {
  const path = `files/${fileId}`;
  try {
    const fileRef = doc(db, 'files', fileId);
    const snap = await getDoc(fileRef);
    if (!snap.exists()) return null;

    const data = snap.data() as FirestoreFileDoc;

    if (data.isChunked && data.totalChunks && data.totalChunks > 1) {
      // Reconstruct from chunks
      const chunksColl = collection(db, 'files', fileId, 'chunks');
      const chunksSnap = await getDocs(chunksColl);
      const chunkDocs = chunksSnap.docs.map((d) => d.data() as { index: number; chunkData: string });
      chunkDocs.sort((a, b) => a.index - b.index);
      const fullDataUrl = chunkDocs.map((c) => c.chunkData).join('');
      return { ...data, dataUrl: fullDataUrl };
    }

    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

/**
 * Update file metadata (favorite, folder move, rename, trash, etc.)
 */
export async function firestoreUpdateFile(fileId: string, updates: Partial<FileItem>): Promise<void> {
  const path = `files/${fileId}`;
  try {
    const fileRef = doc(db, 'files', fileId);
    await updateDoc(fileRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Delete file from Firestore (metadata & chunks).
 */
export async function firestoreDeleteFile(fileId: string, permanent = false): Promise<void> {
  const path = `files/${fileId}`;
  try {
    const fileRef = doc(db, 'files', fileId);
    if (!permanent) {
      await updateDoc(fileRef, {
        is_trash: true,
        trashed_at: new Date().toISOString(),
      });
    } else {
      // Permanently remove chunks then doc
      try {
        const chunksColl = collection(db, 'files', fileId, 'chunks');
        const chunksSnap = await getDocs(chunksColl);
        const batch = writeBatch(db);
        chunksSnap.docs.forEach((c) => batch.delete(c.ref));
        await batch.commit();
      } catch (e) {
        // Continue even if no chunks
      }
      await deleteDoc(fileRef);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener: triggers whenever any file is uploaded or changed on ANY device!
 */
export function firestoreSubscribeFiles(callback: (files: FileItem[]) => void): Unsubscribe {
  const path = 'files';
  return onSnapshot(
    collection(db, 'files'),
    (snapshot) => {
      const files = snapshot.docs.map((d) => d.data() as FileItem);
      callback(files);
    },
    (err) => {
      console.warn('[Firestore] Files subscription notice:', err.message);
    }
  );
}

// Helper to seed initial cloud folders and default users if Firestore is blank
export async function seedFirestoreIfEmpty(
  defaultUsers: User[],
  defaultFolders: Folder[],
  defaultFiles: Array<FileItem & { dataUrl?: string }>
): Promise<void> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('[Firestore] Seeding default users to cloud database...');
      for (const u of defaultUsers) {
        await setDoc(doc(db, 'users', u.id), u);
      }
    }

    const foldersSnap = await getDocs(collection(db, 'folders'));
    if (foldersSnap.empty) {
      console.log('[Firestore] Seeding default folders to cloud database...');
      for (const f of defaultFolders) {
        await setDoc(doc(db, 'folders', f.id), f);
      }
    }

    const filesSnap = await getDocs(collection(db, 'files'));
    if (filesSnap.empty) {
      console.log('[Firestore] Seeding initial educational files to cloud database...');
      for (const file of defaultFiles) {
        await firestoreSaveFile(file, file.dataUrl);
      }
    }
  } catch (err) {
    console.warn('[Firestore] Seeding notice:', err);
  }
}
