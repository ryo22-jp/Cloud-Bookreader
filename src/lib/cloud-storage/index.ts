import { StorageProvider } from './types';
import { GoogleDriveProvider } from './google';
import { OneDriveProvider } from './onedrive';

export * from './types';
export * from './google';
export * from './onedrive';

export function getStorageProvider(session: {
  accessToken?: string;
  provider?: 'google' | 'azure-ad';
}): StorageProvider {
  if (!session.accessToken) {
    throw new Error('No access token available in session');
  }

  if (session.provider === 'azure-ad') {
    return new OneDriveProvider(session.accessToken);
  }

  // デフォルトは Google Drive
  return new GoogleDriveProvider(session.accessToken);
}
