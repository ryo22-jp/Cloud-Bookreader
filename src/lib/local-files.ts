import { get, set, del, keys } from 'idb-keyval';
import { DriveFile } from '@/types';
import { determineFileType } from './drive';

const LOCAL_TREE_KEY = 'local_bookshelf_tree';
const LOCAL_ROOT_NAME_KEY = 'local_bookshelf_root_name';
const LOCAL_BLOB_PREFIX = 'local_blob_';
export const LOCAL_MODE_STORAGE_KEY = 'cloud_reader_local_mode';
export const FOLDER_BOOKS_SESSION_KEY = 'cloud_reader_folder_books';

// 同一タブ内で即座にアクセスするためのオンメモリキャッシュ
const memoryBlobMap = new Map<string, Blob>();
let memoryTreeCache: DriveFile[] | null = null;

export interface AdjacentBookInfo {
  id: string;
  name: string;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub';
}

/**
 * 文字列から決定論的な短いハッシュ文字列を生成（同じファイルなら次回も同じIDになるようにする）
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * ローカルモードが有効かどうかを判定
 */
export function isLocalModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(LOCAL_MODE_STORAGE_KEY) === 'true';
}

/**
 * ローカルモードの有効・無効を切り替え
 */
export function setLocalModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    sessionStorage.setItem(LOCAL_MODE_STORAGE_KEY, 'true');
  } else {
    sessionStorage.removeItem(LOCAL_MODE_STORAGE_KEY);
  }
}

/**
 * 前回のローカルBlobキャッシュをクリア
 */
export async function clearLocalBlobs(): Promise<void> {
  memoryBlobMap.clear();
  memoryTreeCache = null;
  try {
    const allKeys = await keys();
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith(LOCAL_BLOB_PREFIX)) {
        await del(k);
      }
    }
    await del(LOCAL_TREE_KEY);
    await del(LOCAL_ROOT_NAME_KEY);
  } catch (e) {
    console.warn('Failed to clear local blobs:', e);
  }
}

/**
 * ユーザーが選択したローカルファイル群（またはフォルダ）を取り込み、仮想フォルダツリーを構築
 */
export async function importLocalFiles(
  fileList: FileList | File[],
  append: boolean = false
): Promise<{ files: DriveFile[]; rootName: string; firstBook?: DriveFile }> {
  const rawFiles = Array.from(fileList);
  const validFiles: { file: File; fileType: 'pdf' | 'zip' | 'cbz' | 'epub'; relPath: string }[] = [];

  for (const file of rawFiles) {
    if (file.name.startsWith('.')) continue;
    const ft = determineFileType(file.name, file.type || '');
    if (ft === 'pdf' || ft === 'zip' || ft === 'cbz' || ft === 'epub') {
      const relPath = (file as any).webkitRelativePath || file.name;
      validFiles.push({ file, fileType: ft, relPath });
    }
  }

  if (validFiles.length === 0) {
    throw new Error('対応している書籍ファイル（PDF / ZIP / CBZ / EPUB）が見つかりませんでした。');
  }

  if (!append) {
    await clearLocalBlobs();
  }

  const existingTree: DriveFile[] = append ? await getLocalTree() : [];
  const itemMap = new Map<string, DriveFile>();
  for (const item of existingTree) {
    itemMap.set(item.id, item);
  }

  // ルートフォルダ名の検出（webkitRelativePath の先頭セグメント）
  let detectedRootName = 'ローカル本棚';
  const firstRel = validFiles[0].relPath;
  if (firstRel.includes('/')) {
    detectedRootName = firstRel.split('/')[0] || 'ローカル本棚';
  }

  for (const { file, fileType, relPath } of validFiles) {
    const segments = relPath.split('/').filter(Boolean);
    let parentId = 'root';

    // 先頭が選択ルートフォルダの場合は2階層目以降をサブフォルダとして構築
    const startIdx = segments.length > 1 ? 1 : 0;
    if (segments.length > 2) {
      let currentPath = segments[0];
      for (let i = 1; i < segments.length - 1; i++) {
        const folderName = segments[i];
        currentPath += '/' + folderName;
        const folderId = `local_folder_${simpleHash(currentPath)}`;
        if (!itemMap.has(folderId)) {
          itemMap.set(folderId, {
            id: folderId,
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            isFolder: true,
            fileType: 'folder',
            parents: [parentId],
          });
        }
        parentId = folderId;
      }
    }

    // ファイル固有の決定論的ID（ファイル名とサイズに基づくため、次回同じファイルを開いても進捗を引き継げる）
    const fileId = `local_${simpleHash(`${file.name}_${file.size}`)}`;
    const driveFile: DriveFile = {
      id: fileId,
      name: file.name,
      mimeType:
        fileType === 'pdf'
          ? 'application/pdf'
          : fileType === 'epub'
          ? 'application/epub+zip'
          : 'application/zip',
      size: file.size,
      modifiedTime: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
      parents: [parentId],
      isFolder: false,
      fileType,
    };

    itemMap.set(fileId, driveFile);
    memoryBlobMap.set(fileId, file);

    // IndexedDBにもBlobを保存（リロード耐性のため）
    try {
      await set(`${LOCAL_BLOB_PREFIX}${fileId}`, file);
    } catch (e) {
      console.warn('IndexedDB blob save skipped (using in-memory):', e);
    }
  }

  const fullTree = Array.from(itemMap.values());
  memoryTreeCache = fullTree;

  try {
    await set(LOCAL_TREE_KEY, fullTree);
    await set(LOCAL_ROOT_NAME_KEY, detectedRootName);
  } catch (e) {
    console.warn('Failed to persist local tree:', e);
  }

  setLocalModeActive(true);

  const booksOnly = fullTree
    .filter((f) => !f.isFolder)
    .sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }));

  return {
    files: fullTree,
    rootName: detectedRootName,
    firstBook: booksOnly.length === 1 ? booksOnly[0] : undefined,
  };
}

/**
 * 保存されているローカルツリー全体を取得
 */
export async function getLocalTree(): Promise<DriveFile[]> {
  if (memoryTreeCache) return memoryTreeCache;
  try {
    const tree = await get<DriveFile[]>(LOCAL_TREE_KEY);
    if (tree) {
      memoryTreeCache = tree;
      return tree;
    }
  } catch (e) {
    console.warn('Failed to load local tree from IndexedDB:', e);
  }
  return [];
}

/**
 * ローカル本棚のルート名を取得
 */
export async function getLocalRootName(): Promise<string> {
  try {
    const name = await get<string>(LOCAL_ROOT_NAME_KEY);
    return name || 'ローカル本棚';
  } catch {
    return 'ローカル本棚';
  }
}

/**
 * 指定フォルダ内のローカルファイル・サブフォルダ一覧を取得
 */
export async function listLocalFiles(
  folderId: string = 'root',
  query?: string
): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }> {
  const tree = await getLocalTree();

  let filtered: DriveFile[];
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = tree.filter((f) => f.name.toLowerCase().includes(q));
  } else {
    const targetParent = !folderId || folderId === 'root' ? 'root' : folderId;
    filtered = tree.filter((f) => (f.parents?.[0] || 'root') === targetParent);
  }

  filtered.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name, 'ja', { numeric: true });
  });

  const currentFolder =
    folderId !== 'root' ? tree.find((f) => f.id === folderId) : undefined;

  return { files: filtered, currentFolder };
}

/**
 * 単一ローカルファイルのメタデータを取得
 */
export async function getLocalFileMetadata(fileId: string): Promise<DriveFile | null> {
  const tree = await getLocalTree();
  return tree.find((f) => f.id === fileId) || null;
}

/**
 * 単一ローカルファイルのBlobを取得
 */
export async function getLocalFileBlob(fileId: string): Promise<Blob | null> {
  if (memoryBlobMap.has(fileId)) {
    return memoryBlobMap.get(fileId)!;
  }
  try {
    const blob = await get<Blob>(`${LOCAL_BLOB_PREFIX}${fileId}`);
    if (blob) {
      memoryBlobMap.set(fileId, blob);
      return blob;
    }
  } catch (e) {
    console.error('Failed to get local file blob:', e);
  }
  return null;
}

/**
 * 連続読書用: 現在のフォルダ内の書籍リストを sessionStorage に保存
 */
export function saveCurrentFolderBooks(files: DriveFile[]): void {
  if (typeof window === 'undefined') return;
  const books: AdjacentBookInfo[] = files
    .filter(
      (f): f is DriveFile & { fileType: 'pdf' | 'zip' | 'cbz' | 'epub' } =>
        !f.isFolder &&
        (f.fileType === 'pdf' ||
          f.fileType === 'zip' ||
          f.fileType === 'cbz' ||
          f.fileType === 'epub')
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
    .map((f) => ({
      id: f.id,
      name: f.name,
      fileType: f.fileType,
    }));

  try {
    sessionStorage.setItem(FOLDER_BOOKS_SESSION_KEY, JSON.stringify(books));
  } catch (e) {
    console.warn('Failed to save folder books to sessionStorage:', e);
  }
}

/**
 * 連続読書用: 指定した fileId の前後の巻（prevBook / nextBook）を取得
 */
export async function resolveAdjacentBooks(
  currentFileId: string,
  parentFolderId?: string
): Promise<{ prevBook: AdjacentBookInfo | null; nextBook: AdjacentBookInfo | null }> {
  if (typeof window === 'undefined') {
    return { prevBook: null, nextBook: null };
  }

  let bookList: AdjacentBookInfo[] = [];

  // 1. まず sessionStorage に保存されている直近フォルダの書籍リストを確認
  try {
    const raw = sessionStorage.getItem(FOLDER_BOOKS_SESSION_KEY);
    if (raw) {
      const parsed: AdjacentBookInfo[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((b) => b.id === currentFileId)) {
        bookList = parsed;
      }
    }
  } catch {}

  // 2. sessionStorage にない場合、ローカルファイルならローカルツリーから同一フォルダの書籍を検索
  if (bookList.length === 0 && currentFileId.startsWith('local_')) {
    const tree = await getLocalTree();
    const currentItem = tree.find((f) => f.id === currentFileId);
    const folderId = currentItem?.parents?.[0] || parentFolderId || 'root';
    const siblings = tree
      .filter(
        (f): f is DriveFile & { fileType: 'pdf' | 'zip' | 'cbz' | 'epub' } =>
          !f.isFolder &&
          (f.parents?.[0] || 'root') === folderId &&
          (f.fileType === 'pdf' ||
            f.fileType === 'zip' ||
            f.fileType === 'cbz' ||
            f.fileType === 'epub')
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
      .map((f) => ({ id: f.id, name: f.name, fileType: f.fileType }));
    if (siblings.length > 0) {
      bookList = siblings;
      saveCurrentFolderBooks(siblings as any);
    }
  }

  // 3. クラウドファイルで sessionStorage にない場合、親フォルダから取得を試みる
  if (bookList.length === 0 && !currentFileId.startsWith('local_')) {
    const targetFolderId =
      parentFolderId || sessionStorage.getItem('cloud_reader_last_folder_id') || 'root';
    try {
      const res = await fetch(`/api/drive/files?folderId=${encodeURIComponent(targetFolderId)}`);
      if (res.ok) {
        const data = await res.json();
        const files: DriveFile[] = data.files || [];
        saveCurrentFolderBooks(files);
        const raw = sessionStorage.getItem(FOLDER_BOOKS_SESSION_KEY);
        if (raw) {
          bookList = JSON.parse(raw);
        }
      }
    } catch {}
  }

  const idx = bookList.findIndex((b) => b.id === currentFileId);
  if (idx === -1) {
    return { prevBook: null, nextBook: null };
  }

  return {
    prevBook: idx > 0 ? bookList[idx - 1] : null,
    nextBook: idx < bookList.length - 1 ? bookList[idx + 1] : null,
  };
}
