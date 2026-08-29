import { DriveFile, BookProgress, AppConfig } from '@/types';

const PROGRESS_FILE_NAME = 'gdrive_reader_progress.json';
const CONFIG_FILE_NAME = 'gdrive_reader_config.json';

/**
 * ファイル名とMIMEタイプからファイル種別を判定
 */
export function determineFileType(name: string, mimeType: string): DriveFile['fileType'] {
  if (mimeType === 'application/vnd.google-apps.folder') {
    return 'folder';
  }
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (lower.endsWith('.cbz')) {
    return 'cbz';
  }
  if (
    lower.endsWith('.zip') ||
    mimeType === 'application/zip' ||
    mimeType === 'application/x-zip-compressed' ||
    mimeType === 'application/x-zip'
  ) {
    return 'zip';
  }
  if (lower.endsWith('.epub') || mimeType === 'application/epub+zip') {
    return 'epub';
  }
  return 'other';
}

/**
 * Google Drive 内のファイル・フォルダ一覧を取得
 */
export async function listDriveFiles(
  accessToken: string,
  folderId: string = 'root',
  searchQuery?: string
): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }> {
  try {
    let q = `'${folderId}' in parents and trashed = false`;
    if (searchQuery && searchQuery.trim()) {
      const escaped = searchQuery.trim().replace(/'/g, "\\'");
      q = `trashed = false and name contains '${escaped}'`;
    }

    const fields = 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, iconLink, modifiedTime, parents)';
    const orderBy = 'folder, name asc';

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('fields', fields);
    url.searchParams.set('orderBy', orderBy);
    url.searchParams.set('pageSize', '200');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Google Drive API list error:', res.status, errorText);
      let errorMsg = `Google Drive API error (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg += `: ${errorJson.error.message}`;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const rawFiles: any[] = data.files || [];

    const filteredFiles: DriveFile[] = rawFiles
      .map((f) => {
        const fileType = determineFileType(f.name, f.mimeType);
        return {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size ? parseInt(f.size, 10) : undefined,
          thumbnailLink: f.thumbnailLink,
          iconLink: f.iconLink,
          modifiedTime: f.modifiedTime,
          parents: f.parents,
          isFolder: f.mimeType === 'application/vnd.google-apps.folder',
          fileType,
        };
      })
      .filter((f) => f.isFolder || f.fileType !== 'other');

    return { files: filteredFiles };
  } catch (error) {
    console.error('listDriveFiles error:', error);
    throw error;
  }
}

/**
 * 単一ファイルのメタデータを取得
 */
export async function getFileMetadata(accessToken: string, fileId: string): Promise<DriveFile> {
  const fields = 'id, name, mimeType, size, thumbnailLink, iconLink, modifiedTime, parents';
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch file metadata: ${res.statusText}`);
  }

  const f = await res.json();
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size, 10) : undefined,
    thumbnailLink: f.thumbnailLink,
    iconLink: f.iconLink,
    modifiedTime: f.modifiedTime,
    parents: f.parents,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    fileType: determineFileType(f.name, f.mimeType),
  };
}

/**
 * appDataFolder から進捗データJSONを取得
 */
export async function getCloudProgress(accessToken: string): Promise<Record<string, BookProgress>> {
  try {
    const q = `'appDataFolder' in parents and name = '${PROGRESS_FILE_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) return {};

    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) {
      return {};
    }

    const fileId = searchData.files[0].id;
    const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const contentRes = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!contentRes.ok) return {};
    return await contentRes.json();
  } catch (error) {
    console.error('getCloudProgress error:', error);
    return {};
  }
}

/**
 * appDataFolder に進捗データJSONを保存/更新
 */
export async function saveCloudProgress(
  accessToken: string,
  progress: BookProgress
): Promise<boolean> {
  try {
    const existing = await getCloudProgress(accessToken);
    existing[progress.fileId] = progress;

    const bodyString = JSON.stringify(existing, null, 2);

    const q = `'appDataFolder' in parents and name = '${PROGRESS_FILE_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (existingFile) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: bodyString,
      });
      return updateRes.ok;
    } else {
      const metadata = {
        name: PROGRESS_FILE_NAME,
        parents: ['appDataFolder'],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        bodyString +
        closeDelimiter;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
      return createRes.ok;
    }
  } catch (error) {
    console.error('saveCloudProgress error:', error);
    return false;
  }
}

/**
 * appDataFolder から特定の進捗データを削除
 */
export async function deleteCloudProgress(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  try {
    const existing = await getCloudProgress(accessToken);
    if (!existing[fileId]) return true;

    delete existing[fileId];
    const bodyString = JSON.stringify(existing, null, 2);

    const q = `'appDataFolder' in parents and name = '${PROGRESS_FILE_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (existingFile) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: bodyString,
      });
      return updateRes.ok;
    }
    return true;
  } catch (error) {
    console.error('deleteCloudProgress error:', error);
    return false;
  }
}

/**
 * appDataFolder からアプリ設定（ルートフォルダ等）を取得
 */
export async function getCloudAppConfig(accessToken: string): Promise<AppConfig> {
  try {
    const q = `'appDataFolder' in parents and name = '${CONFIG_FILE_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) return {};

    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) {
      return {};
    }

    const fileId = searchData.files[0].id;
    const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const contentRes = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!contentRes.ok) return {};
    return await contentRes.json();
  } catch (error) {
    console.error('getCloudAppConfig error:', error);
    return {};
  }
}

/**
 * appDataFolder にアプリ設定（ルートフォルダ等）を保存/更新
 */
export async function saveCloudAppConfig(
  accessToken: string,
  config: AppConfig
): Promise<boolean> {
  try {
    const bodyString = JSON.stringify(config, null, 2);

    const q = `'appDataFolder' in parents and name = '${CONFIG_FILE_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (existingFile) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: bodyString,
      });
      return updateRes.ok;
    } else {
      const metadata = {
        name: CONFIG_FILE_NAME,
        parents: ['appDataFolder'],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        bodyString +
        closeDelimiter;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
      return createRes.ok;
    }
  } catch (error) {
    console.error('saveCloudAppConfig error:', error);
    return false;
  }
}
