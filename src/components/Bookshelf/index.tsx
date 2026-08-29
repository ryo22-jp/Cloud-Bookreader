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
  PlusCircle,
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
} from '@/lib/storage';
import { openFolderPicker } from '@/lib/picker';

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

export function Bookshelf({ searchQuery, refreshTrigger }: BookshelfProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpening, setIsPickerOpening] = useState<boolean>(false);

  // 進捗データ & 表紙キャッシュ
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});

  // ソート
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'progress'>('name');

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
  }, [session]);

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

  // Google Picker でフォルダを選択する
  const handleOpenPicker = async () => {
    if (!session?.accessToken) return;
    setIsPickerOpening(true);

    try {
      const selected = await openFolderPicker(session.accessToken);
      if (selected) {
        const newConfig: AppConfig = {
          rootFolderId: selected.id,
          rootFolderName: selected.name,
        };

        setAppConfig(newConfig);
        await saveLocalAppConfig(newConfig);

        fetch('/api/drive/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        }).catch(console.error);

        setCurrentFolderId(selected.id);
        const initialCrumbs = [{ id: selected.id, name: selected.name }];
        setBreadcrumbs(initialCrumbs);
        sessionStorage.setItem(LAST_FOLDER_ID_KEY, selected.id);
        sessionStorage.setItem(LAST_BREADCRUMBS_KEY, JSON.stringify(initialCrumbs));
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
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
              {/* Google公式のフォルダ選択ダイアログを開くボタン */}
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
                          viewMode="list"
                        />
                        {/* 履歴削除ボタン */}
                        <button
                          onClick={(e) => handleDeleteProgress(p.fileId, e)}
                          title="履歴から削除"
                          className="absolute right-3 top-3 p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-hover)] rounded-xl opacity-0 group-hover/item:opacity-100 transition z-10"
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
            Googleドライブ内のマンガや自炊書籍が入ったフォルダを選択すると、本棚に本が並びます。
          </p>
          <button
            onClick={handleOpenPicker}
            disabled={isPickerOpening}
            className="mt-5 flex items-center space-x-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--accent)]/20 hover:opacity-90 transition"
          >
            <FolderSearch className="h-4 w-4" />
            <span>Googleドライブから本棚フォルダを選択</span>
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
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
