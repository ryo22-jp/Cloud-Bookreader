import { get, set, del, keys } from 'idb-keyval';
import { BookProgress, ViewerSettings, DEFAULT_VIEWER_SETTINGS, AppConfig } from '@/types';

const PROGRESS_PREFIX = 'progress_';
const COVER_PREFIX = 'cover_';
const SETTINGS_KEY = 'viewer_settings';
const CONFIG_KEY = 'app_config';

/**
 * 書籍の読書進捗をローカル（IndexedDB）に保存
 */
export async function saveLocalProgress(progress: BookProgress): Promise<void> {
  try {
    await set(`${PROGRESS_PREFIX}${progress.fileId}`, progress);
  } catch (err) {
    console.error('Failed to save progress to IndexedDB:', err);
  }
}

/**
 * 書籍の読書進捗をローカルから取得
 */
export async function getLocalProgress(fileId: string): Promise<BookProgress | null> {
  try {
    const progress = await get<BookProgress>(`${PROGRESS_PREFIX}${fileId}`);
    return progress || null;
  } catch (err) {
    console.error('Failed to get progress from IndexedDB:', err);
    return null;
  }
}

/**
 * 書籍の読書進捗を削除（履歴から削除）
 */
export async function deleteLocalProgress(fileId: string): Promise<void> {
  try {
    await del(`${PROGRESS_PREFIX}${fileId}`);
  } catch (err) {
    console.error('Failed to delete progress from IndexedDB:', err);
  }
}

/**
 * すべての読書履歴を取得
 */
export async function getAllLocalProgress(): Promise<Record<string, BookProgress>> {
  try {
    const allKeys = await keys();
    const progressMap: Record<string, BookProgress> = {};
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(PROGRESS_PREFIX)) {
        const item = await get<BookProgress>(key);
        if (item) {
          progressMap[item.fileId] = item;
        }
      }
    }
    return progressMap;
  } catch (err) {
    console.error('Failed to get all progress from IndexedDB:', err);
    return {};
  }
}

/**
 * 表紙サムネイル画像（WebPデータURL）をローカルにキャッシュ
 */
export async function saveCoverImage(fileId: string, dataUrl: string): Promise<void> {
  try {
    await set(`${COVER_PREFIX}${fileId}`, dataUrl);
  } catch (err) {
    console.error('Failed to save cover image:', err);
  }
}

/**
 * 表紙サムネイル画像を取得
 */
export async function getCoverImage(fileId: string): Promise<string | null> {
  try {
    const img = await get<string>(`${COVER_PREFIX}${fileId}`);
    return img || null;
  } catch (err) {
    return null;
  }
}

/**
 * すべての表紙画像キャッシュを取得
 */
export async function getAllCoverImages(): Promise<Record<string, string>> {
  try {
    const allKeys = await keys();
    const coverMap: Record<string, string> = {};
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(COVER_PREFIX)) {
        const fileId = key.replace(COVER_PREFIX, '');
        const item = await get<string>(key);
        if (item) {
          coverMap[fileId] = item;
        }
      }
    }
    return coverMap;
  } catch (err) {
    return {};
  }
}

/**
 * ビューア設定の保存
 */
export async function saveViewerSettings(settings: ViewerSettings): Promise<void> {
  try {
    await set(SETTINGS_KEY, settings);
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

/**
 * ビューア設定の取得
 */
export async function getViewerSettings(): Promise<ViewerSettings> {
  try {
    const settings = await get<ViewerSettings>(SETTINGS_KEY);
    return settings ? { ...DEFAULT_VIEWER_SETTINGS, ...settings } : DEFAULT_VIEWER_SETTINGS;
  } catch (err) {
    console.error('Failed to get settings:', err);
    return DEFAULT_VIEWER_SETTINGS;
  }
}

/**
 * アプリ設定（ルートフォルダ等）の保存
 */
export async function saveLocalAppConfig(config: AppConfig): Promise<void> {
  try {
    await set(CONFIG_KEY, config);
  } catch (err) {
    console.error('Failed to save app config:', err);
  }
}

/**
 * アプリ設定の取得
 */
export async function getLocalAppConfig(): Promise<AppConfig> {
  try {
    const config = await get<AppConfig>(CONFIG_KEY);
    return config || {};
  } catch (err) {
    console.error('Failed to get app config:', err);
    return {};
  }
}

// ----------------------------------------------------
// オフライン書籍管理 (最大5冊まで端末内キャッシュ)
// ----------------------------------------------------
export const MAX_OFFLINE_BOOKS = 5;
const OFFLINE_PREFIX = 'offline_book_';

export interface OfflineBookMeta {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub';
  size: number;
  downloadedAt: string;
  coverUrl?: string;
}

/**
 * オフライン書籍の保存（Blobデータ ＋ メタ情報）
 */
export async function saveOfflineBook(
  meta: OfflineBookMeta,
  blob: Blob
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentBooks = await getAllOfflineBookMetas();
    // 既存の同ファイルでなければ上限チェック
    const isExisting = currentBooks.some((b) => b.fileId === meta.fileId);
    if (!isExisting && currentBooks.length >= MAX_OFFLINE_BOOKS) {
      return {
        success: false,
        error: `ダウンロード上限（最大${MAX_OFFLINE_BOOKS}冊）に達しています。不要な本を削除してください。`,
      };
    }

    await set(`${OFFLINE_PREFIX}${meta.fileId}`, {
      ...meta,
      blob,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save offline book:', err);
    return { success: false, error: err.message || '保存に失敗しました' };
  }
}

/**
 * 指定ファイルのオフラインBlobデータを取得
 */
export async function getOfflineBookBlob(fileId: string): Promise<Blob | null> {
  try {
    const data = await get<{ blob: Blob }>(`${OFFLINE_PREFIX}${fileId}`);
    return data?.blob || null;
  } catch (err) {
    console.error('Failed to get offline book blob:', err);
    return null;
  }
}

/**
 * オフライン書籍の削除
 */
export async function deleteOfflineBook(fileId: string): Promise<void> {
  try {
    await del(`${OFFLINE_PREFIX}${fileId}`);
  } catch (err) {
    console.error('Failed to delete offline book:', err);
  }
}

/**
 * すべてのオフライン保存済み書籍のメタ情報を取得（一覧表示・容量計算用）
 */
export async function getAllOfflineBookMetas(): Promise<OfflineBookMeta[]> {
  try {
    const allKeys = await keys();
    const books: OfflineBookMeta[] = [];
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(OFFLINE_PREFIX)) {
        const item = await get<OfflineBookMeta & { blob?: Blob }>(key);
        if (item) {
          books.push({
            fileId: item.fileId,
            fileName: item.fileName,
            fileType: item.fileType,
            size: item.size,
            downloadedAt: item.downloadedAt,
            coverUrl: item.coverUrl,
          });
        }
      }
    }
    // ダウンロード日時の新しい順にソート
    return books.sort(
      (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  } catch (err) {
    console.error('Failed to get all offline books:', err);
    return [];
  }
}

/**
 * 指定ファイルがダウンロード済みかチェック
 */
export async function isBookDownloaded(fileId: string): Promise<boolean> {
  try {
    const data = await get(`${OFFLINE_PREFIX}${fileId}`);
    return !!data;
  } catch (err) {
    return false;
  }
}
