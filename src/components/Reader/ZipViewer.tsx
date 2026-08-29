'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ViewerSettings, BookProgress } from '@/types';
import { ReaderControls } from './ReaderControls';
import { saveLocalProgress, saveViewerSettings, saveCoverImage, getCoverImage } from '@/lib/storage';
import { Loader2 } from 'lucide-react';
import { unzip, ZipEntry } from 'unzipit';

interface ZipViewerProps {
  fileId: string;
  fileName: string;
  fileType: 'zip' | 'cbz';
  initialPage?: number;
  initialSettings: ViewerSettings;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp'];

function isImageFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
    !lower.includes('__macosx') &&
    !lower.startsWith('.')
  );
}

export function ZipViewer({
  fileId,
  fileName,
  fileType,
  initialPage = 1,
  initialSettings,
}: ZipViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [settings, setSettings] = useState<ViewerSettings>(initialSettings);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  // 画像Blob URLキャッシュ
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const blobUrlCacheRef = useRef<Record<number, string>>({});

  // 画面サイズ監視
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth >= 768 && window.innerWidth > window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ZIP/CBZ の Central Directory を Range Request で高速取得
  useEffect(() => {
    let isMounted = true;

    async function loadZip() {
      setIsLoading(true);
      try {
        const streamUrl = `/api/drive/stream/${fileId}`;
        // unzipit は HTTP Range Request で Central Directory のみを取得
        const { entries } = await unzip(streamUrl);

        // 画像ファイルのみ抽出してファイル名順に自然ソート
        const imageEntries = Object.values(entries)
          .filter((entry) => isImageFile(entry.name))
          .sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }));

        if (!isMounted) return;

        setEntries(imageEntries);
        setTotalPages(imageEntries.length);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading ZIP/CBZ:', err);
        setIsLoading(false);
      }
    }

    loadZip();

    return () => {
      isMounted = false;
      // キャッシュされたBlob URLの解放
      Object.values(blobUrlCacheRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fileId]);

  // 見開きモード判定
  const isDoublePage =
    settings.readingDirection !== 'vertical' &&
    (settings.pageSpread === 'double' ||
      (settings.pageSpread === 'auto' && isLandscape));

  // 表示対象ページの決定
  const getVisiblePages = useCallback(
    (page: number): number[] => {
      if (totalPages === 0) return [page];
      if (!isDoublePage) return [page];

      if (settings.doubleCoverAlone && page === 1) {
        return [1];
      }

      let leftPage = page;
      if (settings.doubleCoverAlone) {
        if (page % 2 === 1) leftPage = page - 1;
      } else {
        if (page % 2 === 0) leftPage = page - 1;
      }

      const secondPage = leftPage + 1;
      if (secondPage <= totalPages) {
        return [leftPage, secondPage];
      }
      return [leftPage];
    },
    [isDoublePage, settings.doubleCoverAlone, totalPages]
  );

  // 特定ページの画像を取得（Blob URL化 & プリフェッチ）
  const fetchPageImage = useCallback(
    async (pageNum: number): Promise<string | null> => {
      if (pageNum < 1 || pageNum > entries.length) return null;
      if (blobUrlCacheRef.current[pageNum]) {
        return blobUrlCacheRef.current[pageNum];
      }

      try {
        const entry = entries[pageNum - 1];
        const blob = await entry.blob();
        const url = URL.createObjectURL(blob);
        blobUrlCacheRef.current[pageNum] = url;
        setImageUrls((prev) => ({ ...prev, [pageNum]: url }));

        // 1ページ目の画像取得時に軽量サムネイルをIndexedDBにキャッシュ
        if (pageNum === 1) {
          try {
            const img = new Image();
            img.src = url;
            img.onload = () => {
              const thumbCanvas = document.createElement('canvas');
              const thumbWidth = 160;
              const thumbHeight = Math.round((img.height / img.width) * thumbWidth);
              thumbCanvas.width = thumbWidth;
              thumbCanvas.height = thumbHeight;
              const thumbCtx = thumbCanvas.getContext('2d');
              if (thumbCtx) {
                thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
                const dataUrl = thumbCanvas.toDataURL('image/webp', 0.7);
                saveCoverImage(fileId, dataUrl);
              }
            };
          } catch (e) {
            console.warn('Failed to generate zip cover thumbnail:', e);
          }
        }

        return url;
      } catch (e) {
        console.error(`Failed to load image for page ${pageNum}:`, e);
        return null;
      }
    },
    [entries]
  );

  // 現在の表示ページおよび前後ページのロード
  useEffect(() => {
    if (entries.length === 0 || isLoading) return;

    const visible = getVisiblePages(currentPage);
    // 現在ページをロード
    visible.forEach((p) => fetchPageImage(p));

    // 前後2ページをプリフェッチ
    for (let i = 1; i <= 2; i++) {
      fetchPageImage(currentPage + i);
      fetchPageImage(currentPage - i);
    }

    // 進捗保存
    const saveProgressAsync = async () => {
      const coverUrl = (await getCoverImage(fileId)) || undefined;
      const progress: BookProgress = {
        fileId,
        fileName,
        fileType,
        currentPage,
        totalPages,
        percentage: (currentPage / totalPages) * 100,
        lastReadTime: new Date().toISOString(),
        coverUrl,
      };

      saveLocalProgress(progress);
      fetch('/api/drive/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      }).catch(() => {});
    };

    saveProgressAsync();
  }, [currentPage, entries, getVisiblePages, fetchPageImage, fileId, fileName, fileType, totalPages, isLoading]);

  // ページ変更ハンドラー
  const handlePageChange = (newPage: number) => {
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    setCurrentPage(newPage);
  };

  const goToNextPage = () => {
    const visible = getVisiblePages(currentPage);
    handlePageChange(currentPage + visible.length);
  };

  const goToPrevPage = () => {
    const visible = getVisiblePages(currentPage);
    handlePageChange(currentPage - visible.length);
  };

  // 画面タップ操作
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // ボタンや入力欄、コントロールメニューのクリックは無視
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, [role="dialog"]')) {
      return;
    }

    const width = window.innerWidth;
    const clickX = e.clientX;
    const leftThreshold = width * 0.35;
    const rightThreshold = width * 0.65;

    if (clickX > leftThreshold && clickX < rightThreshold) {
      setIsControlsVisible(!isControlsVisible);
    } else {
      const isRtl = settings.readingDirection === 'rtl';
      if (clickX <= leftThreshold) {
        isRtl ? goToNextPage() : goToPrevPage();
      } else if (clickX >= rightThreshold) {
        isRtl ? goToPrevPage() : goToNextPage();
      }
    }
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isRtl = settings.readingDirection === 'rtl';
      if (e.key === 'ArrowRight') {
        isRtl ? goToPrevPage() : goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        isRtl ? goToNextPage() : goToPrevPage();
      } else if (e.key === ' ' || e.key === 'PageDown') {
        goToNextPage();
      } else if (e.key === 'PageUp') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const visiblePages = getVisiblePages(currentPage);
  const isRtl = settings.readingDirection === 'rtl';

  return (
    <div
      onClick={handleContainerClick}
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300"
    >
      <ReaderControls
        fileName={fileName}
        currentPage={currentPage}
        totalPages={totalPages}
        isVisible={isControlsVisible}
        settings={settings}
        fileType={fileType}
        onPageChange={handlePageChange}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          saveViewerSettings(newSettings);
        }}
        onToggleControls={() => setIsControlsVisible(!isControlsVisible)}
      />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">{fileType.toUpperCase()}をストリーミング準備中...</p>
        </div>
      )}

      {/* 画像レンダリングエリア */}
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        {visiblePages.length === 2 ? (
          /* 見開き表示 */
          <div className="flex h-full w-full items-center justify-center">
            {/* 右開きの場合、左にpage2, 右にpage1 */}
            {isRtl ? (
              <>
                <div className="flex h-full w-1/2 items-center justify-center">
                  {imageUrls[visiblePages[1]] ? (
                    <img
                      src={imageUrls[visiblePages[1]]}
                      alt={`Page ${visiblePages[1]}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  )}
                </div>
                <div className="flex h-full w-1/2 items-center justify-center">
                  {imageUrls[visiblePages[0]] ? (
                    <img
                      src={imageUrls[visiblePages[0]]}
                      alt={`Page ${visiblePages[0]}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex h-full w-1/2 items-center justify-center">
                  {imageUrls[visiblePages[0]] ? (
                    <img
                      src={imageUrls[visiblePages[0]]}
                      alt={`Page ${visiblePages[0]}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  )}
                </div>
                <div className="flex h-full w-1/2 items-center justify-center">
                  {imageUrls[visiblePages[1]] ? (
                    <img
                      src={imageUrls[visiblePages[1]]}
                      alt={`Page ${visiblePages[1]}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* 単一ページ表示 */
          <div className="flex h-full w-full items-center justify-center">
            {imageUrls[currentPage] ? (
              <img
                src={imageUrls[currentPage]}
                alt={`Page ${currentPage}`}
                className="max-h-full max-w-full object-contain shadow-2xl"
              />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            )}
          </div>
        )}
      </div>

      {!isControlsVisible && totalPages > 0 && (
        <div className="fixed bottom-3 right-4 z-40 rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-medium text-slate-400 backdrop-blur-sm pointer-events-none">
          {visiblePages.length === 2
            ? `${visiblePages[0]}-${visiblePages[1]} / ${totalPages}`
            : `${currentPage} / ${totalPages}`}
        </div>
      )}
    </div>
  );
}
