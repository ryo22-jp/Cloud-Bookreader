'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Server,
} from 'lucide-react';
import { DriveFile } from '@/types';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface WebDAVFolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string, folderName: string) => void;
}

export function WebDAVFolderPickerModal({
  isOpen,
  onClose,
  onSelectFolder,
}: WebDAVFolderPickerModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'NAS (ルート)' },
  ]);
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // フォルダ階層の取得
  const fetchFolders = async (folderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/drive/files?folderId=${encodeURIComponent(folderId)}`);
      if (!res.ok) {
        throw new Error('フォルダ一覧の取得に失敗しました');
      }
      const data = await res.json();
      const folderOnly = (data.files || []).filter((f: DriveFile) => f.isFolder);
      setFolders(folderOnly);
    } catch (err: any) {
      console.error('Fetch folders error:', err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentFolderId('root');
      setBreadcrumbs([{ id: 'root', name: 'NAS (ルート)' }]);
      fetchFolders('root');
    }
  }, [isOpen]);

  const handleOpenFolder = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    fetchFolders(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setCurrentFolderId(target.id);
    setBreadcrumbs(newBreadcrumbs);
    fetchFolders(target.id);
  };

  const handleGoUp = () => {
    if (breadcrumbs.length <= 1) return;
    handleBreadcrumbClick(breadcrumbs.length - 2);
  };

  const handleConfirm = () => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    onSelectFolder(current.id, current.name);
    onClose();
  };

  if (!isOpen) return null;

  const currentFolderName = breadcrumbs[breadcrumbs.length - 1].name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                自宅NAS 本棚フォルダの選択
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                自炊マンガや書籍が入っているフォルダを選択してください
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* パンくずリスト */}
        <div className="px-6 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 flex items-center space-x-1.5 overflow-x-auto text-xs text-[var(--text-muted)] scrollbar-thin">
          {breadcrumbs.length > 1 && (
            <button
              onClick={handleGoUp}
              className="mr-1 p-1 rounded hover:bg-[var(--border-color)] text-[var(--text-primary)] transition"
              title="1つ上のフォルダへ"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={bc.id}>
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`truncate max-w-[150px] hover:text-[var(--accent)] transition ${
                  idx === breadcrumbs.length - 1
                    ? 'font-bold text-[var(--text-primary)]'
                    : ''
                }`}
              >
                {bc.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* フォルダ一覧エリア */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[250px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <p className="text-xs text-[var(--text-muted)]">フォルダを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={() => fetchFolders(currentFolderId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] transition"
              >
                再試行
              </button>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-[var(--text-muted)]">
              <Folder className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm">このフォルダ内にサブフォルダはありません</p>
              <p className="text-xs opacity-70 mt-1">
                このフォルダを本棚として設定する場合は、下の「このフォルダを選択」を押してください
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleOpenFolder(folder)}
                  className="flex items-center space-x-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-left transition group shadow-sm"
                >
                  <Folder className="h-5 w-5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {folder.name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between">
          <div className="truncate text-xs text-[var(--text-muted)] mr-3">
            選択中: <span className="font-bold text-[var(--text-primary)]">{currentFolderName}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-primary)] transition"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 transition shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>このフォルダを選択</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
