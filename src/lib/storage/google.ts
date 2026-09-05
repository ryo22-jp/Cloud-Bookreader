import { DriveFile, BookProgress, AppConfig } from '@/types';
import { StorageProvider } from './types';
import {
  listDriveFiles,
  getFileMetadata,
  getCloudProgress,
  saveCloudProgress,
  deleteCloudProgress,
  getCloudConfig,
  saveCloudConfig,
} from '@/lib/drive';

export class GoogleDriveProvider implements StorageProvider {
  readonly providerId = 'google' as const;
  readonly providerName = 'Google Drive';

  constructor(private accessToken: string) {}

  async listFiles(
    folderId: string = 'root',
    query?: string
  ): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }> {
    const result = await listDriveFiles(this.accessToken, folderId, query);
    let currentFolder = undefined;
    if (folderId !== 'root' && !query) {
      try {
        currentFolder = await getFileMetadata(this.accessToken, folderId);
      } catch (e) {
        console.warn('Could not fetch current folder metadata:', e);
      }
    }
    return {
      files: result.files,
      currentFolder,
    };
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    return getFileMetadata(this.accessToken, fileId);
  }

  async streamFile(fileId: string, rangeHeader: string | null): Promise<Response> {
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const driveRes = await fetch(driveUrl, { headers });
    if (!driveRes.ok && driveRes.status !== 206) {
      throw new Error(`Google Drive stream error: ${driveRes.status} ${driveRes.statusText}`);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Accept-Ranges', 'bytes');
    const contentType = driveRes.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    const contentLength = driveRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    const contentRange = driveRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    const contentDisposition = driveRes.headers.get('content-disposition');
    if (contentDisposition) responseHeaders.set('Content-Disposition', contentDisposition);
    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  }

  async getProgress(): Promise<Record<string, BookProgress>> {
    return getCloudProgress(this.accessToken);
  }

  async saveProgress(progress: BookProgress): Promise<boolean> {
    return saveCloudProgress(this.accessToken, progress);
  }

  async deleteProgress(fileId: string): Promise<boolean> {
    return deleteCloudProgress(this.accessToken, fileId);
  }

  async getConfig(): Promise<AppConfig> {
    return getCloudConfig(this.accessToken);
  }

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    return saveCloudConfig(this.accessToken, config);
  }
}
