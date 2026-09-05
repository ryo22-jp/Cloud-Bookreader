import { DriveFile, BookProgress, AppConfig } from '@/types';
import { StorageProvider } from './types';
import { determineFileType } from '@/lib/drive';

const PROGRESS_FILE_NAME = 'gdrive_reader_progress.json';
const CONFIG_FILE_NAME = 'gdrive_reader_config.json';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class OneDriveProvider implements StorageProvider {
  readonly providerId = 'onedrive' as const;
  readonly providerName = 'Microsoft OneDrive';

  constructor(private accessToken: string) {}

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
    };
  }

  private mapItemToDriveFile(item: any): DriveFile {
    const isFolder = !!item.folder;
    const mimeType = item.file
      ? item.file.mimeType || 'application/octet-stream'
      : isFolder
      ? 'application/vnd.google-apps.folder'
      : 'application/octet-stream';

    const fileType = isFolder ? 'folder' : determineFileType(item.name, mimeType);
    const thumbnailLink =
      item.thumbnails?.[0]?.large?.url || item.thumbnails?.[0]?.medium?.url;

    return {
      id: item.id,
      name: item.name,
      mimeType,
      size: typeof item.size === 'number' ? item.size : undefined,
      thumbnailLink,
      modifiedTime: item.lastModifiedDateTime,
      parents: item.parentReference?.id ? [item.parentReference.id] : [],
      isFolder,
      fileType,
    };
  }

  async listFiles(
    folderId: string = 'root',
    query?: string
  ): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }> {
    try {
      let url: string;
      if (query && query.trim()) {
        const escaped = encodeURIComponent(query.trim());
        url = `${GRAPH_BASE}/me/drive/root/search(q='${escaped}')?$top=200&$expand=thumbnails`;
      } else if (folderId === 'root') {
        url = `${GRAPH_BASE}/me/drive/root/children?$top=200&$expand=thumbnails`;
      } else {
        url = `${GRAPH_BASE}/me/drive/items/${folderId}/children?$top=200&$expand=thumbnails`;
      }

      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        const errText = await res.text();
        console.error('OneDrive listFiles error:', res.status, errText);
        throw new Error(`OneDrive API error (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      const rawItems: any[] = data.value || [];

      const files: DriveFile[] = rawItems
        .map((item) => this.mapItemToDriveFile(item))
        .filter((f) => f.isFolder || f.fileType !== 'other')
        .sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name, 'ja');
        });

      let currentFolder: DriveFile | undefined;
      if (folderId !== 'root' && !query) {
        try {
          currentFolder = await this.getFileMetadata(folderId);
        } catch (e) {
          console.warn('Could not fetch current OneDrive folder metadata:', e);
        }
      }

      return { files, currentFolder };
    } catch (error) {
      console.error('OneDrive listFiles exception:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const url = `${GRAPH_BASE}/me/drive/items/${fileId}?$expand=thumbnails`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch OneDrive item: ${res.statusText}`);
    }
    const item = await res.json();
    return this.mapItemToDriveFile(item);
  }

  async streamFile(fileId: string, rangeHeader: string | null): Promise<Response> {
    const contentUrl = `${GRAPH_BASE}/me/drive/items/${fileId}/content`;

    // 1. Graph API からダウンロードURL（302リダイレクト先）を取得
    const initialRes = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      redirect: 'manual',
    });

    let downloadUrl = contentUrl;
    let streamHeaders: HeadersInit = { Authorization: `Bearer ${this.accessToken}` };

    if (initialRes.status === 302 || initialRes.status === 301) {
      const location = initialRes.headers.get('location');
      if (location) {
        downloadUrl = location;
        streamHeaders = {}; // Azure Blob Storage の事前署名URLには Authorization 不要
      }
    }

    if (rangeHeader) {
      streamHeaders['Range'] = rangeHeader;
    }

    const streamRes = await fetch(downloadUrl, { headers: streamHeaders });

    if (!streamRes.ok && streamRes.status !== 206) {
      throw new Error(`OneDrive stream error: ${streamRes.status} ${streamRes.statusText}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Accept-Ranges', 'bytes');
    const contentType = streamRes.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    const contentLength = streamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const contentRange = streamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    const contentDisposition = streamRes.headers.get('content-disposition');
    if (contentDisposition) responseHeaders.set('Content-Disposition', contentDisposition);
    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new Response(streamRes.body, {
      status: streamRes.status,
      headers: responseHeaders,
    });
  }

  async getProgress(): Promise<Record<string, BookProgress>> {
    try {
      const url = `${GRAPH_BASE}/me/drive/special/approot:/${PROGRESS_FILE_NAME}:/content`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (res.status === 404) return {};
      if (!res.ok) return {};
      return await res.json();
    } catch (error) {
      console.error('OneDrive getProgress error:', error);
      return {};
    }
  }

  async saveProgress(progress: BookProgress): Promise<boolean> {
    try {
      const existing = await this.getProgress();
      existing[progress.fileId] = progress;

      const url = `${GRAPH_BASE}/me/drive/special/approot:/${PROGRESS_FILE_NAME}:/content`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(existing, null, 2),
      });

      return res.ok;
    } catch (error) {
      console.error('OneDrive saveProgress error:', error);
      return false;
    }
  }

  async deleteProgress(fileId: string): Promise<boolean> {
    try {
      const existing = await this.getProgress();
      if (!existing[fileId]) return true;
      delete existing[fileId];

      const url = `${GRAPH_BASE}/me/drive/special/approot:/${PROGRESS_FILE_NAME}:/content`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(existing, null, 2),
      });

      return res.ok;
    } catch (error) {
      console.error('OneDrive deleteProgress error:', error);
      return false;
    }
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const url = `${GRAPH_BASE}/me/drive/special/approot:/${CONFIG_FILE_NAME}:/content`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (res.status === 404) return {};
      if (!res.ok) return {};
      return await res.json();
    } catch (error) {
      console.error('OneDrive getConfig error:', error);
      return {};
    }
  }

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    try {
      const existing = await this.getConfig();
      const updated = { ...existing, ...config };

      const url = `${GRAPH_BASE}/me/drive/special/approot:/${CONFIG_FILE_NAME}:/content`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated, null, 2),
      });

      return res.ok;
    } catch (error) {
      console.error('OneDrive saveConfig error:', error);
      return false;
    }
  }
}
