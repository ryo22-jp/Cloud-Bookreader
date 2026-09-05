import { createClient, WebDAVClient } from 'webdav';
import { Readable } from 'stream';
import { DriveFile, BookProgress, AppConfig } from '@/types';
import { StorageProvider } from './types';
import { determineFileType } from '@/lib/drive';

export interface WebDAVConfig {
  url: string;
  username?: string;
  password?: string;
}

const APP_DIR = '/.cloud_bookreader';
const PROGRESS_PATH = `${APP_DIR}/progress.json`;
const CONFIG_PATH = `${APP_DIR}/config.json`;

export class WebDAVProvider implements StorageProvider {
  readonly providerId = 'webdav' as const;
  readonly providerName = 'WebDAV (自宅NAS)';

  private client: WebDAVClient;

  constructor(private config: WebDAVConfig) {
    this.client = createClient(config.url, {
      username: config.username || '',
      password: config.password || '',
    });
  }

  /**
   * パスから安全なBase64URL IDを生成
   */
  private pathToId(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return Buffer.from(normalized, 'utf-8').toString('base64url');
  }

  /**
   * IDから元のパスを復元
   */
  private idToPath(id: string): string {
    if (!id || id === 'root') return '/';
    try {
      const decoded = Buffer.from(id, 'base64url').toString('utf-8');
      return decoded.startsWith('/') ? decoded : `/${decoded}`;
    } catch {
      return id.startsWith('/') ? id : `/${id}`;
    }
  }

  private mapItemToDriveFile(item: any, parentId: string): DriveFile {
    const isFolder = item.type === 'directory';
    const basename = item.basename || item.filename.split('/').filter(Boolean).pop() || '';
    const mimeType = isFolder
      ? 'application/vnd.google-apps.folder'
      : item.mime || 'application/octet-stream';
    const fileType = isFolder ? 'folder' : determineFileType(basename, mimeType);

    return {
      id: this.pathToId(item.filename),
      name: basename,
      mimeType,
      size: typeof item.size === 'number' ? item.size : undefined,
      modifiedTime: item.lastmod,
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
      const folderPath = this.idToPath(folderId);
      const items = (await this.client.getDirectoryContents(folderPath, {
        deep: false,
      })) as any[];

      const currentFolderId = this.pathToId(folderPath);

      let files: DriveFile[] = (Array.isArray(items) ? items : [])
        // .cloud_bookreader などの隠しシステムディレクトリは除外
        .filter((item) => !item.basename.startsWith('.'))
        .map((item) => this.mapItemToDriveFile(item, currentFolderId))
        .filter((f) => f.isFolder || f.fileType !== 'other');

      // クエリがある場合は名前でフィルタリング
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        files = files.filter((f) => f.name.toLowerCase().includes(q));
      }

      // フォルダ優先・名前順ソート
      files.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name, 'ja');
      });

      let currentFolder: DriveFile | undefined;
      if (folderPath !== '/' && !query) {
        try {
          currentFolder = await this.getFileMetadata(folderId);
        } catch (e) {
          console.warn('Could not fetch current WebDAV folder metadata:', e);
        }
      }

      return { files, currentFolder };
    } catch (error) {
      console.error('WebDAV listFiles error:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const filePath = this.idToPath(fileId);
    const stat: any = await this.client.stat(filePath);
    const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
    return this.mapItemToDriveFile(stat, this.pathToId(parentPath));
  }

  async streamFile(fileId: string, rangeHeader: string | null): Promise<Response> {
    const filePath = this.idToPath(fileId);
    const stat: any = await this.client.stat(filePath);
    const totalSize = typeof stat.size === 'number' ? stat.size : 0;
    const mimeType = stat.mime || 'application/octet-stream';

    let rangeOption: { start: number; end: number } | undefined = undefined;
    let isPartial = false;
    let start = 0;
    let end = totalSize > 0 ? totalSize - 1 : 0;

    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace('bytes=', '').split('-');
      const requestedStart = parseInt(parts[0], 10);
      const requestedEnd = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (!isNaN(requestedStart)) {
        start = requestedStart;
        end = isNaN(requestedEnd) ? totalSize - 1 : requestedEnd;
        rangeOption = { start, end };
        isPartial = true;
      }
    }

    const nodeStream = this.client.createReadStream(
      filePath,
      rangeOption ? { range: rangeOption } : {}
    ) as Readable;

    // Node.js Readable を Web ReadableStream に変換
    const webStream = Readable.toWeb(nodeStream);

    const responseHeaders = new Headers();
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Content-Type', mimeType);

    if (isPartial && totalSize > 0) {
      const chunkLength = end - start + 1;
      responseHeaders.set('Content-Length', chunkLength.toString());
      responseHeaders.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    } else if (totalSize > 0) {
      responseHeaders.set('Content-Length', totalSize.toString());
    }

    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new Response(webStream as any, {
      status: isPartial ? 206 : 200,
      headers: responseHeaders,
    });
  }

  private async ensureAppDir(): Promise<void> {
    try {
      const exists = await this.client.exists(APP_DIR);
      if (!exists) {
        await this.client.createDirectory(APP_DIR);
      }
    } catch (e) {
      console.warn('WebDAV ensureAppDir warn:', e);
    }
  }

  async getProgress(): Promise<Record<string, BookProgress>> {
    try {
      const exists = await this.client.exists(PROGRESS_PATH);
      if (!exists) return {};

      const content = (await this.client.getFileContents(PROGRESS_PATH, {
        format: 'text',
      })) as string;
      return JSON.parse(content);
    } catch (error) {
      console.error('WebDAV getProgress error:', error);
      return {};
    }
  }

  async saveProgress(progress: BookProgress): Promise<boolean> {
    try {
      await this.ensureAppDir();
      const existing = await this.getProgress();
      existing[progress.fileId] = progress;

      await this.client.putFileContents(
        PROGRESS_PATH,
        JSON.stringify(existing, null, 2),
        { overwrite: true }
      );
      return true;
    } catch (error) {
      console.error('WebDAV saveProgress error:', error);
      return false;
    }
  }

  async deleteProgress(fileId: string): Promise<boolean> {
    try {
      const existing = await this.getProgress();
      if (!existing[fileId]) return true;
      delete existing[fileId];

      await this.client.putFileContents(
        PROGRESS_PATH,
        JSON.stringify(existing, null, 2),
        { overwrite: true }
      );
      return true;
    } catch (error) {
      console.error('WebDAV deleteProgress error:', error);
      return false;
    }
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const exists = await this.client.exists(CONFIG_PATH);
      if (!exists) return {};

      const content = (await this.client.getFileContents(CONFIG_PATH, {
        format: 'text',
      })) as string;
      return JSON.parse(content);
    } catch (error) {
      console.error('WebDAV getConfig error:', error);
      return {};
    }
  }

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    try {
      await this.ensureAppDir();
      const existing = await this.getConfig();
      const updated = { ...existing, ...config };

      await this.client.putFileContents(
        CONFIG_PATH,
        JSON.stringify(updated, null, 2),
        { overwrite: true }
      );
      return true;
    } catch (error) {
      console.error('WebDAV saveConfig error:', error);
      return false;
    }
  }
}
