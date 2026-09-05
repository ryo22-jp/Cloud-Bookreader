import { DriveFile, BookProgress, AppConfig } from '@/types';

export interface StorageProvider {
  readonly providerId: 'google' | 'onedrive' | 'webdav';
  readonly providerName: string;

  /**
   * 指定フォルダ内または検索クエリに一致するファイル一覧を取得
   */
  listFiles(
    folderId?: string,
    query?: string
  ): Promise<{ files: DriveFile[]; currentFolder?: DriveFile }>;

  /**
   * 単一ファイルのメタデータを取得
   */
  getFileMetadata(fileId: string): Promise<DriveFile>;

  /**
   * ファイルのストリーミングレスポンスを取得（Range Request 対応）
   */
  streamFile(fileId: string, rangeHeader: string | null): Promise<Response>;

  /**
   * 進捗（しおり）JSONを取得
   */
  getProgress(): Promise<Record<string, BookProgress>>;

  /**
   * 進捗（しおり）JSONを保存/更新
   */
  saveProgress(progress: BookProgress): Promise<boolean>;

  /**
   * 特定ファイルの進捗（しおり）を削除
   */
  deleteProgress(fileId: string): Promise<boolean>;

  /**
   * 本棚設定（選択フォルダ等）を取得
   */
  getConfig(): Promise<AppConfig>;

  /**
   * 本棚設定を保存
   */
  saveConfig(config: Partial<AppConfig>): Promise<boolean>;
}
