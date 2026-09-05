import { StorageProvider } from './types';
import { GoogleDriveProvider } from './google';
import { OneDriveProvider } from './onedrive';
import { WebDAVProvider, WebDAVConfig } from './webdav';

export * from './types';
export * from './google';
export * from './onedrive';
export * from './webdav';

export function getStorageProvider(session: {
  accessToken?: string;
  provider?: 'google' | 'azure-ad' | 'webdav';
  webdavConfig?: WebDAVConfig;
}): StorageProvider {
  if (session.provider === 'webdav') {
    if (!session.webdavConfig || !session.webdavConfig.url) {
      throw new Error('No WebDAV configuration available in session');
    }
    return new WebDAVProvider(session.webdavConfig);
  }

  if (!session.accessToken) {
    throw new Error('No access token available in session');
  }

  if (session.provider === 'azure-ad') {
    return new OneDriveProvider(session.accessToken);
  }

  // デフォルトは Google Drive
  return new GoogleDriveProvider(session.accessToken);
}
