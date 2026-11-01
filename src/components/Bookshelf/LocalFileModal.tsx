'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  FileUp,
  HardDrive,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { importLocalFiles } from '@/lib/local-files';

interface LocalFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesImported?: () => void;
  appendMode?: boolean;
}

export function LocalFileModal({
  isOpen,
  onClose,
  onFilesImported,
  appendMode = false,
}: LocalFileModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const processFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await importLocalFiles(fileList, appendMode);

      // もし単一ファイルのみを選択した場合は直接リーダーで開く、複数またはフォルダなら本棚を表示
      if (!appendMode && result.firstBook && result.files.length === 1) {
        onClose();
        if (onFilesImported) onFilesImported();
        router.push(
          `/read/${result.firstBook.id}?name=${encodeURIComponent(result.firstBook.name)}`
        );
        return;
      }

      if (onFilesImported) {
        onFilesImported();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'ファイルの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                ローカル閲覧（端末内の本を開く）
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                ログイン不要・通信量ゼロで端末内の書籍をすぐ読めます
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

        {/* 本体 */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 非表示の file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.zip,.cbz,.epub,application/pdf,application/zip,application/x-cbz,application/epub+zip"
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard in modern browsers
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={(e) => processFiles(e.target.files)}
          />

          {/* ドラッグ＆ドロップ対応エリア ＆ 選択ボタン */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-[var(--border-color)] bg-[var(--bg-primary)]/50'
            }`}
          >
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2.5">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  書籍ファイルを読み込んでいます...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  対応形式: <b className="text-[var(--text-primary)]">PDF / ZIP / CBZ / EPUB</b>
                </p>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* ファイルを選択ボタン */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
                  >
                    <FileUp className="h-4 w-4" />
                    <span>書籍ファイルを選択（1冊〜複数冊）</span>
                  </button>

                  {/* フォルダごと選択ボタン */}
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold transition active:scale-[0.98]"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>フォルダごと本棚に読み込む（全巻まとめ読み）</span>
                  </button>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] pt-1">
                  ※PCではここにファイルを直接ドラッグ＆ドロップしても開けます
                </p>
              </div>
            )}
          </div>

          {/* 特徴案内 */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-3.5 text-[11px] text-[var(--text-muted)] space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-[var(--text-primary)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>しおり・連続読書に完全対応</span>
            </div>
            <p className="leading-relaxed">
              フォルダや複数ファイルを読み込むと「次の巻を読む」ボタンで連続読書が可能です。しおり（読書進捗）もブラウザ内に自動保存されます。
            </p>
            <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>ファイルは外部サーバーへ一切送信されず、端末内で直接処理されます。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
