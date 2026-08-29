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
} from 'lucide-react';
import { DriveFile, BookProgress } from '@/types';

interface FileCardProps {
  file: DriveFile;
  progress?: BookProgress;
  coverUrl?: string;
  viewMode?: 'grid' | 'list';
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
  onFolderClick,
}: FileCardProps) {
  const isCompleted = progress && progress.percentage >= 98;
  const isReading = progress && progress.percentage > 0 && !isCompleted;
  const volNum = extractVolNumber(file.name);

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
        <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--bg-primary)]/60 mt-0.5">
          {file.fileType === 'pdf' ? (
            <FileText className="h-3.5 w-3.5 text-rose-500" />
          ) : file.fileType === 'epub' ? (
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Archive className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
        {volNum ? (
          <span className="text-[11px] font-black text-[var(--text-secondary)] tracking-tight">
            #{volNum}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
            {file.fileType}
          </span>
        )}
      </div>
    );
  };

  // フォルダの場合（温かみのある木製フォルダ風）
  if (file.isFolder) {
    return (
      <div
        onClick={() => onFolderClick?.(file.id, file.name)}
        className="flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group shadow-sm"
      >
        <div className="flex items-center space-x-3 truncate">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-[var(--accent)] group-hover:scale-105 transition shadow-inner">
            <Folder className="h-6 w-6 fill-[var(--accent)]/20 text-[var(--accent)]" />
          </div>
          <div className="truncate">
            <span className="truncate block text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
              {file.name}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">フォルダ</span>
          </div>
        </div>
      </div>
    );
  }

  // 書籍ファイルの場合
  const readUrl = `/read/${file.id}?name=${encodeURIComponent(file.name)}`;

  // リスト表示（デフォルト）
  if (viewMode === 'list') {
    return (
      <Link
        href={readUrl}
        className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5 sm:p-3 hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group shadow-sm"
      >
        {/* 左側: ミニ表紙 ＋ タイトル ＋ 詳細情報 */}
        <div className="flex items-center space-x-3.5 truncate mr-3">
          {renderCover('sm')}
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                {file.name}
              </span>
              {renderBadge()}
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
        </div>

        {/* 右側: 進捗バーまたは読了バッジ */}
        <div className="flex items-center space-x-3 shrink-0">
          {isCompleted ? (
            <div className="flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>読了</span>
            </div>
          ) : isReading ? (
            <div className="flex flex-col items-end space-y-1">
              <span className="text-xs font-bold text-[var(--accent)]">
                {Math.round(progress!.percentage)}%
              </span>
              <div className="h-1.5 w-16 sm:w-24 overflow-hidden rounded-full bg-[var(--border-color)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, progress!.percentage)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </Link>
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
            {renderBadge()}
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
