'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Folder,
  ChevronRight,
  Home,
  ArrowUpDown,
  History,
  Loader2,
  FolderOpen,
  Pin,
  X,
  FileText,
  FolderSearch,
  HardDriveDownload,
  Trash2,
} from 'lucide-react';
import { DriveFile, BookProgress, AppConfig } from '@/types';
import { FileCard } from './FileCard';
import {
  getAllLocalProgress,
  getLocalAppConfig,
  saveLocalAppConfig,
  getAllCoverImages,
  saveCoverImage,
  deleteLocalProgress,
  saveOfflineBook,
  deleteOfflineBook,
  getAllOfflineBookMetas,
  OfflineBookMeta,
  MAX_OFFLINE_BOOKS,
} from '@/lib/storage';
import { openFolderPicker } from '@/lib/picker';
import { OneDriveFolderPickerModal } from './OneDriveFolderPickerModal';

interface FolderBreadcrumb {
  id: string;
  name: string;
}

interface BookshelfProps {
  searchQuery: string;
  refreshTrigger: number;
}

const MAX_RECENT_BOOKS = 5; // 続きから読むの最大表示件数
const LAST_FOLDER_ID_KEY = 'cloud_reader_last_folder_id';
const LAST_BREADCRUMBS_KEY = 'cloud_reader_last_breadcrumbs';

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function Bookshelf({ searchQuery, refreshTrigger }: BookshelfProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpening, setIsPickerOpening] = useState<boolean>(false);
  const [isOneDrivePickerOpen, setIsOneDrivePickerOpen] = useState<boolean>(false);

  // 進捗データ & 表紙キャッシュ
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});

  // オフラインダウンロード管理
  const [offlineMetas, setOfflineMetas] = useState<OfflineBookMeta[]>([]);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());
  const [downloadingMap, setDownloadingMap] = useState<Record<string, number>>({});
  const [showOfflineList, setShowOfflineList] = useState<boolean>(false);

  // ソート
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'progress'>('name');

  // オフライン書籍一覧の再取得
  const refreshOfflineBooks = useCallback(async () => {
    const metas = await getAllOfflineBookMetas();
    setOfflineMetas(metas);
    setDownloadedSet(new Set(metas.map((m) => m.fileId)));
  }, []);

  // 初期設定（保存されたルートフォルダ設定や直前のフォルダ階層）の読み込み
  useEffect(() => {
    async function initConfig() {
      let cfg = await getLocalAppConfig();

      try {
        const res = await fetch('/api/drive/config');
        if (res.ok) {
          const cloudCfg = await res.json();
          if (cloudCfg && cloudCfg.rootFolderId) {
            cfg = { ...cfg, ...cloudCfg };
            await saveLocalAppConfig(cfg);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch cloud config:', e);
      }

      setAppConfig(cfg);
      await refreshOfflineBooks();

      // 直前に開いていたフォルダ階層がsessionStorageにあれば復元
      const savedFolderId = sessionStorage.getItem(LAST_FOLDER_ID_KEY);
      const savedCrumbs = sessionStorage.getItem(LAST_BREADCRUMBS_KEY);

      if (savedFolderId && savedCrumbs) {
        try {
          const parsedCrumbs = JSON.parse(savedCrumbs);
          setCurrentFolderId(savedFolderId);
          setBreadcrumbs(parsedCrumbs);
          return;
        } catch (e) {}
      }

      // 固定ルートフォルダがある場合はそこを起点にする
      if (cfg.rootFolderId) {
        setCurrentFolderId(cfg.rootFolderId);
        const initialCrumbs = [
          { id: cfg.rootFolderId, name: cfg.rootFolderName || '本棚' },
        ];
        setBreadcrumbs(initialCrumbs);
        sessionStorage.setItem(LAST_FOLDER_ID_KEY, cfg.rootFolderId);
        sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(initialCrumbs));
      } else {
        setCurrentFolderId('root');
        const initialCrumbs = [{ id: 'root', name: 'Googleドライブ' }];
        setBreadcrumbs(initialCrumbs);
        sessionStorage.setItem(LAST_FOLDER_ID_KEY, 'root');
        sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(initialCrumbs));
      }
    }

    if (session) {
      initConfig();
    }
  }, [session, refreshOfflineBooks]);

  // ファイル一覧および進捗・表紙の取得
  const fetchData = useCallback(async () => {
    if (!session || !currentFolderId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. ファイル一覧取得
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set('q', searchQuery);
      } else {
        params.set('folderId', currentFolderId);
      }

      const res = await fetch(`/api/drive/files?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ファイルの取得に失敗しました');
      }
      const data = await res.json();
      const loadedFiles: DriveFile[] = data.files || [];
      setFiles(loadedFiles);

      // 2. ローカル進捗・表紙とクラウド進捗を取得
      const [localProgress, localCovers] = await Promise.all([
        getAllLocalProgress(),
        getAllCoverImages(),
      ]);

      let mergedProgress = { ...localProgress };
      const mergedCovers = { ...localCovers };

      try {
        const cloudRes = await fetch('/api/drive/progress');
        if (cloudRes.ok) {
          const cloudProgress: Record<string, BookProgress> = await cloudRes.json();
          mergedProgress = { ...mergedProgress, ...cloudProgress };

          // クラウド進捗に含まれる表紙（WebPサムネイル）をローカルキャッシュにも反映
          Object.values(cloudProgress).forEach((cp) => {
            if (cp.coverUrl && !mergedCovers[cp.fileId]) {
              mergedCovers[cp.fileId] = cp.coverUrl;
              saveCoverImage(cp.fileId, cp.coverUrl);
            }
          });
        }
      } catch (e) {
        console.warn('Cloud progress fetch failed, using local only:', e);
      }

      // 「書籍」または「電子書籍」となってしまっている古い履歴の名前を実ファイル名で自動補正
      loadedFiles.forEach((file) => {
        if (
          mergedProgress[file.id] &&
          (mergedProgress[file.id].fileName === '書籍' ||
            mergedProgress[file.id].fileName === '電子書籍' ||
            !mergedProgress[file.id].fileName)
        ) {
          mergedProgress[file.id].fileName = file.name;
        }
      });

      setProgressMap(mergedProgress);
      setCoverMap(mergedCovers);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [session, currentFolderId, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // オフラインダウンロードハンドラー
  const handleDownloadBook = async (file: DriveFile, coverUrl?: string) => {
    if (downloadingMap[file.id] !== undefined) return;

    if (offlineMetas.length >= MAX_OFFLINE_BOOKS && !downloadedSet.has(file.id)) {
      alert(
        `オフライン保存の上限（最大${MAX_OFFLINE_BOOKS}冊）に達しています。不要な本を削除してください。`
      );
      return;
    }

    setDownloadingMap((prev) => ({ ...prev, [file.id]: 0 }));

    try {
      const response = await fetch(`/api/drive/stream/${file.id}`);
      if (!response.ok) throw new Error('ダウンロードに失敗しました');

      const contentLength = +(response.headers.get('Content-Length') || 0);
      const reader = response.body?.getReader();

      if (!reader) {
        const blob = await response.blob();
        await saveOfflineBook(
          {
            fileId: file.id,
            fileName: file.name,
            fileType: file.fileType as any,
            size: file.size || blob.size,
            downloadedAt: new Date().toISOString(),
            coverUrl: coverUrl || coverMap[file.id],
          },
          blob
        );
      } else {
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (contentLength > 0) {
            const percent = Math.min(99, Math.round((receivedLength / contentLength) * 100));
            setDownloadingMap((prev) => ({ ...prev, [file.id]: percent }));
          }
        }

        const fullBlob = new Blob(chunks as any);
        const res = await saveOfflineBook(
          {
            fileId: file.id,
            fileName: file.name,
            fileType: file.fileType as any,
            size: file.size || fullBlob.size,
            downloadedAt: new Date().toISOString(),
            coverUrl: coverUrl || coverMap[file.id],
          },
          fullBlob
        );

        if (!res.success) {
          alert(res.error || '保存に失敗しました');
        }
      }

      await refreshOfflineBooks();
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'ダウンロード中にエラーが発生しました');
    } finally {
      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
    }
  };

  // オフライン書籍の削除
  const handleDeleteDownload = async (fileId: string) => {
    await deleteOfflineBook(fileId);
    await refreshOfflineBooks();
  };

  // フォルダ選択の確定処理
  const applySelectedFolder = async (folderId: string, folderName: string) => {
    const newConfig: AppConfig = {
      rootFolderId: folderId,
      rootFolderName: folderName,
    };

    setAppConfig(newConfig);
    await saveLocalAppConfig(newConfig);

    fetch('/api/drive/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    }).catch(console.error);

    setCurrentFolderId(folderId);
    const initialCrumbs = [{ id: folderId, name: folderName }];
    setBreadcrumbs(initialCrumbs);
    sessionStorage.setItem(LAST_FOLDER_ID_KEY, folderId);
    sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(initialCrumbs));
  };

  // 本棚フォルダ選択（プロバイダー別）
  const handleOpenPicker = async () => {
    if (!session?.accessToken) return;

    if (session.provider === 'azure-ad') {
      setIsOneDrivePickerOpen(true);
      return;
    }

    // Google Picker でフォルダを選択する
    setIsPickerOpening(true);
    try {
      const selected = await openFolderPicker(session.accessToken);
      if (selected) {
        await applySelectedFolder(selected.id, selected.name);
      }
    } catch (err) {
      console.error('Picker open failed:', err);
    } finally {
      setIsPickerOpening(false);
    }
  };

  // フォルダクリック
  const handleFolderClick = (folderId: string, folderName: string) => {
    const nextCrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
    setCurrentFolderId(folderId);
    setBreadcrumbs(nextCrumbs);
    sessionStorage.setItem(LAST_FOLDER_ID_KEY, folderId);
    sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(nextCrumbs));
  };

  // パンくずクリック
  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const nextCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(nextCrumbs);
    setCurrentFolderId(target.id);
    sessionStorage.setItem(LAST_FOLDER_ID_KEY, target.id);
    sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(nextCrumbs));
  };

  // このフォルダを本棚のトップ（ルート）に固定する
  const handlePinFolder = async () => {
    const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
    if (!currentCrumb || currentCrumb.id === 'root') return;

    const newConfig: AppConfig = {
      rootFolderId: currentCrumb.id,
      rootFolderName: currentCrumb.name,
    };

    setAppConfig(newConfig);
    await saveLocalAppConfig(newConfig);

    fetch('/api/drive/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    }).catch(console.error);
  };

  // 固定を解除してGoogleドライブ全体を表示する
  const handleUnpinFolder = async () => {
    const newConfig: AppConfig = {
      rootFolderId: undefined,
      rootFolderName: undefined,
    };

    setAppConfig(newConfig);
    await saveLocalAppConfig(newConfig);

    fetch('/api/drive/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    }).catch(console.error);

    const initialCrumbs = [{ id: 'root', name: 'Googleドライブ' }];
    setCurrentFolderId('root');
    setBreadcrumbs(initialCrumbs);
    sessionStorage.setItem(LAST_FOLDER_ID_KEY, 'root');
    sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(initialCrumbs));
  };

  // 履歴から削除
  const handleDeleteProgress = async (fileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await deleteLocalProgress(fileId);
    fetch(`/api/drive/progress?fileId=${fileId}`, {
      method: 'DELETE',
    }).catch(console.error);

    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  // フォルダと書籍ファイルを分離
  const folderFiles = files.filter((f) => f.isFolder);
  const bookFiles = files.filter((f) => !f.isFolder);

  // 書籍ソート
  const sortedBookFiles = [...bookFiles].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ja', { numeric: true });
    }
    if (sortBy === 'time') {
      return (b.modifiedTime || '').localeCompare(a.modifiedTime || '');
    }
    if (sortBy === 'progress') {
      const progA = progressMap[a.id]?.percentage || 0;
      const progB = progressMap[b.id]?.percentage || 0;
      return progB - progA;
    }
    return 0;
  });

  // 最近読んだ本リスト（最大5件、読了98%未満）
  const recentBooks = Object.values(progressMap)
    .filter((p) => p.percentage < 98)
    .sort((a, b) => new Date(b.lastReadTime).getTime() - new Date(a.lastReadTime).getTime())
    .slice(0, MAX_RECENT_BOOKS);

  const isCurrentFolderPinned =
    appConfig.rootFolderId && currentFolderId === appConfig.rootFolderId;

  // オフライン合計使用容量
  const totalOfflineBytes = offlineMetas.reduce((acc, cur) => acc + (cur.size || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* オフライン保存ステータスバー */}
      {offlineMetas.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <HardDriveDownload className="h-4 w-4" />
            <span>
              オフライン保存済み: {offlineMetas.length} / {MAX_OFFLINE_BOOKS}冊 ({formatBytes(totalOfflineBytes)})
            </span>
          </div>
          <button
            onClick={() => setShowOfflineList(!showOfflineList)}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80 transition"
          >
            {showOfflineList ? '保存リストを閉じる' : '保存リストを見る'}
          </button>
        </div>
      )}

      {/* オフライン保存リスト（展開時） */}
      {showOfflineList && offlineMetas.length > 0 && (
        <div className="mb-6 space-y-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] text-xs text-[var(--text-muted)] font-bold">
            <span>端末保存中の本（通信なしで読めます）</span>
            <span>{offlineMetas.length}冊</span>
          </div>
          <div className="space-y-2">
            {offlineMetas.map((meta) => {
              const pseudoFile: DriveFile = {
                id: meta.fileId,
                name: meta.fileName,
                mimeType: meta.fileType === 'pdf' ? 'application/pdf' : 'application/zip',
                size: meta.size,
                isFolder: false,
                fileType: meta.fileType,
              };
              return (
                <FileCard
                  key={meta.fileId}
                  file={pseudoFile}
                  progress={progressMap[meta.fileId]}
                  coverUrl={meta.coverUrl || coverMap[meta.fileId]}
                  isDownloaded={true}
                  onDeleteDownload={handleDeleteDownload}
                  viewMode="list"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 検索中の場合は検索ヘッダー */}
      {searchQuery ? (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            「{searchQuery}」の検索結果
          </h2>
          <span className="text-sm text-[var(--text-muted)]">
            {sortedBookFiles.length + folderFiles.length} 件見つかりました
          </span>
        </div>
      ) : (
        <>
          {/* 上部: ナビゲーション & 本棚フォルダ選択・固定コントロール */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            {/* パンくずリスト */}
            <nav className="flex items-center space-x-1.5 overflow-x-auto text-sm text-[var(--text-secondary)] no-scrollbar py-1">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id + idx}>
                    {idx > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`flex items-center space-x-1.5 rounded-xl px-2.5 py-1.5 transition ${
                        isLast
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] font-semibold shadow-sm border border-[var(--border-color)]'
                          : 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {idx === 0 && !appConfig.rootFolderId ? (
                        <Home className="h-4 w-4" />
                      ) : (
                        <Folder className="h-4 w-4 text-[var(--accent)]" />
                      )}
                      <span className="truncate max-w-[160px]">{crumb.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {/* 本棚フォルダ選択（Google Picker） & 固定コントロール */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenPicker}
                disabled={isPickerOpening}
                className="flex items-center space-x-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition shadow-sm disabled:opacity-50"
                title="Googleドライブから本棚にするフォルダを直接選択"
              >
                <FolderSearch className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>{appConfig.rootFolderId ? '本棚フォルダ変更' : '本棚フォルダ選択'}</span>
              </button>

              {appConfig.rootFolderId ? (
                <button
                  onClick={handleUnpinFolder}
                  className="flex items-center space-x-1.5 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:opacity-80 transition shadow-sm"
                  title="クリックしてGoogleドライブ全体の表示に戻す"
                >
                  <Pin className="h-3.5 w-3.5 fill-[var(--accent)]" />
                  <span>固定解除</span>
                </button>
              ) : currentFolderId !== 'root' && currentFolderId !== '' ? (
                <button
                  onClick={handlePinFolder}
                  className="flex items-center space-x-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition shadow-sm"
                  title="このフォルダを本棚のトップとして記憶する"
                >
                  <Pin className="h-3.5 w-3.5" />
                  <span>このフォルダを固定</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* ルート階層かつ最近読んだ本がある場合は表示（最大5件） */}
          {(currentFolderId === 'root' || isCurrentFolderPinned) &&
            recentBooks.length > 0 && (
              <section className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="text-xs font-bold tracking-wide uppercase text-[var(--text-muted)]">
                      続きから読む (最新{recentBooks.length}件)
                    </h2>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {recentBooks.map((p) => {
                    const targetFile = files.find((f) => f.id === p.fileId);
                    const displayName = targetFile
                      ? targetFile.name
                      : p.fileName && p.fileName !== '書籍' && p.fileName !== '電子書籍'
                      ? p.fileName
                      : '電子書籍';

                    const pseudoFile: DriveFile = {
                      id: p.fileId,
                      name: displayName,
                      mimeType: p.fileType === 'pdf' ? 'application/pdf' : 'application/zip',
                      size: targetFile?.size,
                      isFolder: false,
                      fileType: p.fileType,
                    };
                    return (
                      <div key={p.fileId} className="relative group/item">
                        <FileCard
                          file={pseudoFile}
                          progress={p}
                          coverUrl={coverMap[p.fileId] || p.coverUrl}
                          isDownloaded={downloadedSet.has(p.fileId)}
                          downloadProgress={downloadingMap[p.fileId]}
                          onDownload={handleDownloadBook}
                          onDeleteDownload={handleDeleteDownload}
                          viewMode="list"
                        />
                        {/* 履歴削除ボタン */}
                        <button
                          onClick={(e) => handleDeleteProgress(p.fileId, e)}
                          title="履歴から削除"
                          className="absolute right-12 top-3 p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-hover)] rounded-xl opacity-0 group-hover/item:opacity-100 transition z-10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
        </>
      )}

      {/* フォルダ一覧セクション */}
      {!isLoading && folderFiles.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center space-x-2">
            <Folder className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-xs font-bold tracking-wide uppercase text-[var(--text-muted)]">
              フォルダ ({folderFiles.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {folderFiles.map((folder) => (
              <FileCard
                key={folder.id}
                file={folder}
                viewMode="list"
                onFolderClick={handleFolderClick}
              />
            ))}
          </div>
        </section>
      )}

      {/* 書籍一覧セクション */}
      <div className="mb-3 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
        <div className="flex items-center space-x-2 text-xs font-bold tracking-wide uppercase text-[var(--text-muted)]">
          <FileText className="h-4 w-4 text-[var(--accent)]" />
          <span>書籍一覧 ({bookFiles.length}冊)</span>
        </div>

        {/* ソート切替 */}
        <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>並び替え:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] shadow-sm"
          >
            <option value="name">名前順</option>
            <option value="time">更新順</option>
            <option value="progress">進捗順</option>
          </select>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-500 mb-6">
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition shadow-sm"
          >
            再試行
          </button>
        </div>
      )}

      {/* ローディング */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          <p className="text-xs text-[var(--text-muted)]">本棚を読み込み中...</p>
        </div>
      ) : sortedBookFiles.length === 0 && folderFiles.length === 0 ? (
        /* 空状態（本棚フォルダ選択へのスマートな誘導） */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 py-16 px-4 text-center">
          <FolderOpen className="h-12 w-12 text-[var(--accent)] mb-3 opacity-80" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            本棚にするフォルダを選択してください
          </h3>
          <p className="mt-1.5 text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
            {session?.provider === 'azure-ad' ? 'OneDrive' : 'Googleドライブ'}内のマンガや自炊書籍が入ったフォルダを選択すると、本棚に本が並びます。
          </p>
          <button
            onClick={handleOpenPicker}
            disabled={isPickerOpening}
            className="mt-5 flex items-center space-x-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:opacity-90 transition"
          >
            <FolderSearch className="h-4 w-4" />
            <span>{session?.provider === 'azure-ad' ? 'OneDriveから本棚フォルダを選択' : 'Googleドライブから本棚フォルダを選択'}</span>
          </button>
        </div>
      ) : (
        /* 書籍一覧（リスト表示） */
        <div className="space-y-2.5">
          {sortedBookFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              progress={progressMap[file.id]}
              coverUrl={coverMap[file.id]}
              isDownloaded={downloadedSet.has(file.id)}
              downloadProgress={downloadingMap[file.id]}
              onDownload={handleDownloadBook}
              onDeleteDownload={handleDeleteDownload}
              viewMode="list"
            />
          ))}
        </div>
      )}

      {/* OneDrive用フォルダ選択モーダル */}
      <OneDriveFolderPickerModal
        isOpen={isOneDrivePickerOpen}
        onClose={() => setIsOneDrivePickerOpen(false)}
        onSelectFolder={applySelectedFolder}
      />
    </div>
  );
}
