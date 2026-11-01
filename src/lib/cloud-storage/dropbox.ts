import { DriveFile, BookProgress, AppConfig } from '@/types';
import { StorageProvider } from './types';
import { determineFileType } from '@/lib/drive';

const APP_DIR = '/.cloud_bookreader';
const PROGRESS_PATH = `${APP_DIR}/progress.json`;
const CONFIG_PATH = `${APP_DIR}/config.json`;

const DROPBOX_API_BASE = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_BASE = 'https://content.dropboxapi.com/2';

export class DropboxProvider implements StorageProvider {
  readonly providerId = 'dropbox' as const;
  readonly providerName = 'Dropbox';

  constructor(private accessToken: string) {}

  /**
   * DropboxのファイルIDやパスをURL安全なbase64url文字列にエンコード
   */
  private encodeId(rawIdOrPath: string): string {
    if (!rawIdOrPath || rawIdOrPath === 'root' || rawIdOrPath === '') {
      return 'root';
    }
    return Buffer.from(rawIdOrPath, 'utf-8').toString('base64url');
  }

  /**
   * base64url文字列からDropboxのファイルIDまたはパスを復元
   */
  private decodeId(encodedId: string): string {
    if (!encodedId || encodedId === 'root') {
      return '';
    }
    try {
      return Buffer.from(encodedId, 'base64url').toString('utf-8');
    } catch {
      return encodedId;
    }
  }

  /**
   * Dropbox API-Arg ヘッダー用に非ASCII文字をUnicodeエスケープするヘルパー
   */
  private toDropboxApiArg(obj: Record<string, any>): string {
    return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (c) => {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  private mapEntryToDriveFile(entry: any, parentId: string = 'root'): DriveFile {
    const isFolder = entry['.tag'] === 'folder';
    const name = entry.name || '';
    const mimeType = isFolder
      ? 'application/vnd.google-apps.folder'
      : 'application/octet-stream';
    const fileType = isFolder ? 'folder' : determineFileType(name, mimeType);

    // Dropboxのid（例: "id:a4ayc_..."）またはパスをエンコードしてID化
    const rawIdentifier = entry.id || entry.path_lower || entry.path_display || name;

    return {
      id: this.encodeId(rawIdentifier),
      name,
      mimeType,
      size: typeof entry.size === 'number' ? entry.size : undefined,
      modifiedTime: entry.server_modified || entry.client_modified,
      parents: [parentId],
      isFolder,
      fileType,
    };
  }

  async listFiles(
    folderId: string = 'root',
    query?: string
  ): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }> {
    try {
      let rawEntries: any[] = [];
      const decodedPath = this.decodeId(folderId);

      if (query && query.trim()) {
        // キーワード検索
        const searchRes = await fetch(`${DROPBOX_API_BASE}/files/search_v2`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query.trim(),
            options: {
              max_results: 200,
              file_status: 'active',
            },
          }),
        });

        if (!searchRes.ok) {
          const errText = await searchRes.text();
          console.error('Dropbox search_v2 error:', searchRes.status, errText);
          throw new Error(`Dropbox API error (${searchRes.status}): ${searchRes.statusText}`);
        }

        const searchData = await searchRes.json();
        rawEntries = (searchData.matches || [])
          .map((m: any) => m?.metadata?.metadata)
          .filter(Boolean);
      } else {
        // フォルダ内一覧取得
        const listRes = await fetch(`${DROPBOX_API_BASE}/files/list_folder`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: decodedPath,
            recursive: false,
            include_deleted: false,
            limit: 500,
          }),
        });

        if (!listRes.ok) {
          const errText = await listRes.text();
          console.error('Dropbox list_folder error:', listRes.status, errText);
          throw new Error(`Dropbox API error (${listRes.status}): ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        rawEntries = listData.entries || [];
      }

      const files: DriveFile[] = rawEntries
        // 隠しシステムフォルダ（.cloud_bookreader 等）を除外
        .filter((entry) => entry.name && !entry.name.startsWith('.'))
        .map((entry) => this.mapEntryToDriveFile(entry, folderId))
        .filter((f) => f.isFolder || f.fileType !== 'other')
        .sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name, 'ja', { numeric: true });
        });

      let currentFolder: DriveFile | undefined;
      if (folderId !== 'root' && !query) {
        try {
          currentFolder = await this.getFileMetadata(folderId);
        } catch (e) {
          console.warn('Could not fetch current Dropbox folder metadata:', e);
        }
      }

      return { files, currentFolder };
    } catch (error) {
      console.error('Dropbox listFiles exception:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const decodedPath = this.decodeId(fileId);
    const res = await fetch(`${DROPBOX_API_BASE}/files/get_metadata`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: decodedPath,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Dropbox metadata (${res.status}): ${res.statusText}`);
    }

    const entry = await res.json();
    // 親フォルダパスから親IDを推定
    let parentId = 'root';
    if (entry.path_lower) {
      const lastSlash = entry.path_lower.lastIndexOf('/');
      if (lastSlash > 0) {
        const parentPath = entry.path_lower.substring(0, lastSlash);
        parentId = this.encodeId(parentPath);
      }
    }
    return this.mapEntryToDriveFile(entry, parentId);
  }

  async streamFile(fileId: string, rangeHeader: string | null): Promise<Response> {
    const decodedPath = this.decodeId(fileId);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Dropbox-API-Arg': this.toDropboxApiArg({ path: decodedPath }),
    };

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const streamRes = await fetch(`${DROPBOX_CONTENT_BASE}/files/download`, {
      method: 'POST',
      headers,
    });

    if (!streamRes.ok && streamRes.status !== 206) {
      const errText = await streamRes.text().catch(() => '');
      console.error('Dropbox stream error:', streamRes.status, errText);
      throw new Error(`Dropbox stream error (${streamRes.status}): ${streamRes.statusText}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Accept-Ranges', 'bytes');

    // Dropbox-API-Result ヘッダーからファイル名等を取得して適切な Content-Type を設定
    let mimeType = 'application/octet-stream';
    const apiResult = streamRes.headers.get('dropbox-api-result');
    if (apiResult) {
      try {
        const meta = JSON.parse(apiResult);
        if (meta.name) {
          const ft = determineFileType(meta.name, '');
          if (ft === 'pdf') mimeType = 'application/pdf';
          else if (ft === 'epub') mimeType = 'application/epub+zip';
          else if (ft === 'zip' || ft === 'cbz') mimeType = 'application/zip';
        }
      } catch {}
    }
    responseHeaders.set('Content-Type', mimeType);

    const contentLength = streamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const contentRange = streamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new Response(streamRes.body, {
      status: streamRes.status,
      headers: responseHeaders,
    });
  }

  private async readJsonFile<T>(path: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(`${DROPBOX_CONTENT_BASE}/files/download`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': this.toDropboxApiArg({ path }),
        },
      });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch (error) {
      return fallback;
    }
  }

  private async writeJsonFile(path: string, data: any): Promise<boolean> {
    try {
      const res = await fetch(`${DROPBOX_CONTENT_BASE}/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': this.toDropboxApiArg({
            path,
            mode: 'overwrite',
            autorename: false,
            mute: true,
          }),
        },
        body: JSON.stringify(data, null, 2),
      });
      return res.ok;
    } catch (error) {
      console.error('Dropbox writeJsonFile error:', error);
      return false;
    }
  }

  async getProgress(): Promise<Record<string, BookProgress>> {
    return this.readJsonFile<Record<string, BookProgress>>(PROGRESS_PATH, {});
  }

  async saveProgress(progress: BookProgress): Promise<boolean> {
    const existing = await this.getProgress();
    existing[progress.fileId] = progress;
    return this.writeJsonFile(PROGRESS_PATH, existing);
  }

  async deleteProgress(fileId: string): Promise<boolean> {
    const existing = await this.getProgress();
    if (!existing[fileId]) return true;
    delete existing[fileId];
    return this.writeJsonFile(PROGRESS_PATH, existing);
  }

  async getConfig(): Promise<AppConfig> {
    return this.readJsonFile<AppConfig>(CONFIG_PATH, {});
  }

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    const existing = await this.getConfig();
    const updated = { ...existing, ...config };
    return this.writeJsonFile(CONFIG_PATH, updated);
  }
}
