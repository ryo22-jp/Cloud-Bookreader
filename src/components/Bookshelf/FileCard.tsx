'use client';

import React from 'react';
import Link from 'next/link';
import {
  Folder,
  FileText,
  Archive,
  BookOpen,
  CheckCircle2,
  Bookmark,
  Download,
  Trash2,
  Loader2,
  HardDriveDownload,
} from 'lucide-react';
import { DriveFile, BookProgress } from '@/types';

interface FileCardProps {
  file: DriveFile;
  progress?: BookProgress;
  coverUrl?: string;
  viewMode?: 'grid' | 'list';
  isDownloaded?: boolean;
  downloadProgress?: number | null; // null: なし, 0-100: 進捗率
  onDownload?: (file: DriveFile, coverUrl?: string) => void;
  onDeleteDownload?: (fileId: string) => void;
  onFolderClick?: (folderId: string, folderName: string) => void;
}

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ファイル名から巻数（01, 02, 第1巻など）を抽出して背表紙風に表示するヘルパー
function extractVolNumber(name: string): string | null {
  const match = name.match(/(?:[第巻\s_-])?(\d{1,3})(?:[巻話\s_.-]|$)/);
  if (match && match[1]) {
    return match[1].padStart(2, '0');
  }
  return null;
}

export function FileCard({
  file,
  progress,
  coverUrl,
  viewMode = 'list',
  isDownloaded = false,
  downloadProgress = null,
  onDownload,
  onDeleteDownload,
  onFolderClick,
}: FileCardProps) {
  const isCompleted = progress && progress.percentage >= 98;
  const isReading = progress && progress.percentage > 0 && !isCompleted;
  const volNum = extractVolNumber(file.name);
  const isDownloading = downloadProgress !== null;

  // ファイル種別に応じたバッジ
  const renderBadge = () => {
    switch (file.fileType) {
      case 'pdf':
        return (
          <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/20">
            PDF
          </span>
        );
      case 'zip':
      case 'cbz':
        return (
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {file.fileType.toUpperCase()}
          </span>
        );
      case 'epub':
        return (
          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            EPUB
          </span>
        );
      default:
        return null;
    }
  };

  // ミニ表紙（サムネイルまたはCSS背表紙）
  const renderCover = (size: 'sm' | 'md' = 'sm') => {
    if (coverUrl) {
      return (
        <div
          className={`relative shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm ${
            size === 'md' ? 'h-20 w-14' : 'h-16 w-11 sm:w-12'
          }`}
        >
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      );
    }

    // 表紙がない場合の軽量CSSグラデーション背表紙（落ち着いた本革・装丁風）
    return (
      <div
        className={`relative shrink-0 flex flex-col items-center justify-between overflow-hidden rounded-lg border border-[var(--border-color)] p-1 shadow-sm bg-gradient-to-b ${
          file.fileType === 'pdf'
            ? 'from-rose-950/40 via-[var(--bg-secondary)] to-[var(--bg-card)]'
            : file.fileType === 'epub'
            ? 'from-emerald-950/40 via-[var(--bg-secondary)] to-[var(--bg-card)]'
            : 'from-amber-950/40 via-[var(--bg-secondary)] to-[var(--bg-card)]'
        } ${size === 'md' ? 'h-20 w-14' : 'h-16 w-11 sm:w-12'}`}
      >
        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] opacity-60">
          {file.fileType}
        </span>
        {volNum ? (
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-[var(--text-muted)] leading-none">VOL</span>
            <span className="text-xs font-extrabold text-[var(--accent)] font-mono leading-tight">
              {volNum}
            </span>
          </div>
        ) : (
          <BookOpen className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-50" />
        )}
        <div className="h-1 w-4 rounded-full bg-[var(--border-color)]" />
      </div>
    );
  };

  // フォルダの場合
  if (file.isFolder) {
    return (
      <button
        onClick={() => onFolderClick && onFolderClick(file.id, file.name)}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 text-left hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group shadow-sm"
      >
        <div className="flex items-center space-x-3 truncate">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-[var(--accent)] group-hover:scale-105 transition-transform">
            <Folder className="h-5 w-5 fill-current" />
          </div>
          <span className="truncate text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
            {file.name}
          </span>
        </div>
      </button>
    );
  }

  // 読書ページへのURL
  const readUrl = `/read/${file.id}?name=${encodeURIComponent(file.name)}`;

  // オフラインダウンロードボタン操作
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloaded) {
      if (onDeleteDownload) onDeleteDownload(file.id);
    } else {
      if (onDownload) onDownload(file, coverUrl);
    }
  };

  // リスト表示（デフォルト）
  if (viewMode === 'list') {
    return (
      <div className="group relative flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5 sm:p-3 hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all shadow-sm">
        {/* クリック全体リンク */}
        <Link href={readUrl} className="flex items-center space-x-3.5 truncate flex-1 mr-2">
          {renderCover('sm')}
          <div className="truncate min-w-0">
            <div className="flex items-center space-x-2">
              <span className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                {file.name}
              </span>
              {renderBadge()}
              {isDownloaded && (
                <span className="inline-flex items-center space-x-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <HardDriveDownload className="h-3 w-3" />
                  <span>保存済</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-xs text-[var(--text-muted)] mt-1">
              {file.size && <span>{formatBytes(file.size)}</span>}
              {progress && (
                <span className="flex items-center space-x-1 text-[var(--accent)] font-medium">
                  <Bookmark className="h-3 w-3" />
                  <span>
                    {progress.currentPage} / {progress.totalPages}P ({Math.round(progress.percentage)}%)
                  </span>
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* 右側: 進捗バー ＋ オフラインダウンロードボタン */}
        <div className="flex items-center space-x-2 shrink-0">
          {isCompleted ? (
            <div className="flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">読了</span>
            </div>
          ) : isReading ? (
            <div className="flex flex-col items-end space-y-1 mr-1">
              <span className="text-xs font-bold text-[var(--accent)]">
                {Math.round(progress!.percentage)}%
              </span>
              <div className="h-1.5 w-12 sm:w-20 overflow-hidden rounded-full bg-[var(--border-color)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, progress!.percentage)}%` }}
                />
              </div>
            </div>
          ) : null}

          {/* オフライン保存 / 削除ボタン */}
          {onDownload && (
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              title={
                isDownloading
                  ? `ダウンロード中 (${downloadProgress}%)`
                  : isDownloaded
                  ? 'オフライン保存済み（クリックで削除）'
                  : '端末にオフライン保存（Wi-Fi推奨・最大5冊）'
              }
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                isDownloading
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : isDownloaded
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-rose-500/10 hover:text-rose-500 border border-emerald-500/20'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] border border-transparent hover:border-[var(--border-color)]'
              }`}
            >
              {isDownloading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              ) : isDownloaded ? (
                <HardDriveDownload className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // グリッド表示
  return (
    <Link
      href={readUrl}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3.5 hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all shadow-sm hover:shadow-md"
    >
      <div className="flex space-x-3">
        {renderCover('md')}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1.5">
              {renderBadge()}
              {isDownloaded && (
                <span className="rounded-md bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-500">
                  保存済
                </span>
              )}
            </div>
            {isCompleted && (
              <span className="flex items-center space-x-0.5 text-[10px] font-bold text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                <span>読了</span>
              </span>
            )}
          </div>
          <h3
            title={file.name}
            className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent)] transition leading-snug"
          >
            {file.name}
          </h3>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
          <span>{formatBytes(file.size)}</span>
          {progress && progress.percentage > 0 && (
            <span className="font-bold text-[var(--accent)]">
              {progress.currentPage}/{progress.totalPages}P ({Math.round(progress.percentage)}%)
            </span>
          )}
        </div>
        {isReading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-color)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.min(100, progress!.percentage)}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
