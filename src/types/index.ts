export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  parents?: string[];
  isFolder: boolean;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub' | 'folder' | 'other';
}

export interface BookProgress {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub';
  currentPage: number;
  totalPages: number;
  epubCfi?: string;
  percentage: number;
  lastReadTime: string;
  coverUrl?: string; // 軽量WebPサムネイル（Base64データURL）
}

export interface AppConfig {
  rootFolderId?: string;
  rootFolderName?: string;
}

export interface OfflineBook {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub';
  size: number;
  downloadedAt: string;
  coverUrl?: string;
  blob: Blob;
}

export interface ViewerSettings {
  readingDirection: 'rtl' | 'ltr' | 'vertical'; // rtl: 右開き(マンガ), ltr: 左開き, vertical: 縦スクロール
  pageSpread: 'single' | 'double' | 'auto'; // single: 単ページ, double: 見開き, auto: 画面幅による自動切替
  fitMode: 'height' | 'width' | 'contain'; // 拡大表示モード
  theme: 'dark' | 'light' | 'sepia';
  doubleCoverAlone: boolean; // 見開き時に表紙を1枚だけ表示するかどうか
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  readingDirection: 'rtl',
  pageSpread: 'auto',
  fitMode: 'contain',
  theme: 'dark',
  doubleCoverAlone: true,
};
