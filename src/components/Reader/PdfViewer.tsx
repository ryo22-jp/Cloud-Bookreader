'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ViewerSettings, BookProgress } from '@/types';
import { ReaderControls } from './ReaderControls';
import { saveLocalProgress, saveViewerSettings, saveCoverImage, getCoverImage } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

interface PdfViewerProps {
  fileId: string;
  fileName: string;
  initialPage?: number;
  initialSettings: ViewerSettings;
}

export function PdfViewer({
  fileId,
  fileName,
  initialPage = 1,
  initialSettings,
}: PdfViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [settings, setSettings] = useState<ViewerSettings>(initialSettings);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageRendering, setPageRendering] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef1 = useRef<any>(null);
  const renderTaskRef2 = useRef<any>(null);

  // 画面サイズの監視（見開き判定用）
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth >= 768 && window.innerWidth > window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // PDF.jsドキュメントの読み込み（Range Requestストリーミング）
  useEffect(() => {
    let isMounted = true;

    async function loadPdf() {
      setIsLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Worker設定
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument({
          url: `/api/drive/stream/${fileId}`,
          disableAutoFetch: true, // 全体ダウンロードを無効化（Rangeリクエストでオンデマンド取得）
          disableStream: false,
          rangeChunkSize: 131072, // 128KB チャンク
        });

        const pdfDoc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdfDoc;
        setTotalPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
      }
    };
  }, [fileId]);

  // 見開きモードかどうかの判定
  const isDoublePage =
    settings.readingDirection !== 'vertical' &&
    (settings.pageSpread === 'double' ||
      (settings.pageSpread === 'auto' && isLandscape));

  // 表示対象ページの決定
  const getVisiblePages = useCallback(
    (page: number): number[] => {
      if (!pdfDocRef.current || totalPages === 0) return [page];

      if (!isDoublePage) {
        return [page];
      }

      // 表紙を単独表示する場合
      if (settings.doubleCoverAlone && page === 1) {
        return [1];
      }

      // 見開きペアリング
      let leftPage = page;
      if (settings.doubleCoverAlone) {
        // 2,3 / 4,5 ...
        if (page % 2 === 1) {
          leftPage = page - 1;
        }
      } else {
        // 1,2 / 3,4 ...
        if (page % 2 === 0) {
          leftPage = page - 1;
        }
      }

      const secondPage = leftPage + 1;
      if (secondPage <= totalPages) {
        return [leftPage, secondPage];
      }
      return [leftPage];
    },
    [isDoublePage, settings.doubleCoverAlone, totalPages]
  );

  // 単一ページの描画処理
  const renderSinglePage = async (
    pageNum: number,
    canvas: HTMLCanvasElement,
    renderTaskRef: React.MutableRefObject<any>
  ) => {
    if (!pdfDocRef.current || pageNum < 1 || pageNum > totalPages) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      // デバイス解像度（DPI）に合わせた拡大
      const pixelRatio = window.devicePixelRatio || 1;
      const containerHeight = window.innerHeight;
      const containerWidth = isDoublePage ? window.innerWidth / 2 : window.innerWidth;

      let scale = 1.0;
      if (settings.fitMode === 'height') {
        scale = containerHeight / viewport.height;
      } else if (settings.fitMode === 'width') {
        scale = containerWidth / viewport.width;
      } else {
        // contain
        scale = Math.min(containerWidth / viewport.width, containerHeight / viewport.height);
      }

      const scaledViewport = page.getViewport({ scale: scale * pixelRatio });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width / pixelRatio}px`;
      canvas.style.height = `${scaledViewport.height / pixelRatio}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        viewport: scaledViewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;

      // 1ページ目の描画完了時に超軽量サムネイルをIndexedDBにキャッシュ
      if (pageNum === 1) {
        try {
          // 幅160px程度の縮小Canvasを作成
          const thumbCanvas = document.createElement('canvas');
          const thumbWidth = 160;
          const thumbHeight = Math.round((scaledViewport.height / scaledViewport.width) * thumbWidth);
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
            const dataUrl = thumbCanvas.toDataURL('image/webp', 0.7);
            saveCoverImage(fileId, dataUrl);
          }
        } catch (e) {
          console.warn('Failed to generate cover thumbnail:', e);
        }
      }
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Page ${pageNum} render error:`, err);
      }
    }
  };

  // ページの描画実行
  useEffect(() => {
    if (!pdfDocRef.current || totalPages === 0 || isLoading) return;

    let isMounted = true;
    setPageRendering(true);

    const visiblePages = getVisiblePages(currentPage);

    const doRender = async () => {
      if (visiblePages.length === 1) {
        if (canvasRef1.current) {
          await renderSinglePage(visiblePages[0], canvasRef1.current, renderTaskRef1);
        }
      } else if (visiblePages.length === 2) {
        // 右開き（マンガ）の場合: 右側が先に読むページ（visiblePages[0]）、左側が次のページ（visiblePages[1]）
        const isRtl = settings.readingDirection === 'rtl';
        const rightPage = isRtl ? visiblePages[0] : visiblePages[1];
        const leftPage = isRtl ? visiblePages[1] : visiblePages[0];

        if (canvasRef1.current && canvasRef2.current) {
          await Promise.all([
            renderSinglePage(leftPage, canvasRef1.current, renderTaskRef1),
            renderSinglePage(rightPage, canvasRef2.current, renderTaskRef2),
          ]);
        }
      }

      if (isMounted) setPageRendering(false);
    };

    doRender();

    // 進捗保存
    const saveProgressAsync = async () => {
      const coverUrl = (await getCoverImage(fileId)) || undefined;
      const progress: BookProgress = {
        fileId,
        fileName,
        fileType: 'pdf',
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

    return () => {
      isMounted = false;
    };
  }, [currentPage, totalPages, settings, isDoublePage, isLoading, getVisiblePages, fileId, fileName]);

  // ページ変更ハンドラー
  const handlePageChange = (newPage: number) => {
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    setCurrentPage(newPage);
  };

  // 次ページへ（見開き対応）
  const goToNextPage = () => {
    const visible = getVisiblePages(currentPage);
    const step = visible.length;
    handlePageChange(currentPage + step);
  };

  // 前ページへ（見開き対応）
  const goToPrevPage = () => {
    const visible = getVisiblePages(currentPage);
    const step = visible.length;
    handlePageChange(currentPage - step);
  };

  // 画面タップ処理（マンガ右開きと左開きに対応）
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
      // 中央タップ: コントローラー表示切替
      setIsControlsVisible(!isControlsVisible);
    } else {
      const isRtl = settings.readingDirection === 'rtl';
      if (clickX <= leftThreshold) {
        // 左側タップ
        if (isRtl) {
          goToNextPage(); // 右開きマンガでは左タップが「次ページ」
        } else {
          goToPrevPage();
        }
      } else if (clickX >= rightThreshold) {
        // 右側タップ
        if (isRtl) {
          goToPrevPage(); // 右開きマンガでは右タップが「前ページ」
        } else {
          goToNextPage();
        }
      }
    }
  };

  // キーボードショートカット
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
      } else if (e.key === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const visiblePages = getVisiblePages(currentPage);

  return (
    <div
      onClick={handleContainerClick}
      className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300"
    >
      {/* リーダーコントローラー */}
      <ReaderControls
        fileName={fileName}
        currentPage={currentPage}
        totalPages={totalPages}
        isVisible={isControlsVisible}
        settings={settings}
        fileType="pdf"
        onPageChange={handlePageChange}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          saveViewerSettings(newSettings);
        }}
        onToggleControls={() => setIsControlsVisible(!isControlsVisible)}
      />

      {/* ローディングスピナー */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">PDFをストリーミング準備中...</p>
        </div>
      )}

      {/* キャンバス描画領域 */}
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        {visiblePages.length === 2 ? (
          /* 見開き2ページ表示 */
          <div className="flex h-full w-full items-center justify-center">
            <canvas ref={canvasRef1} className="max-h-full object-contain shadow-2xl" />
            <canvas ref={canvasRef2} className="max-h-full object-contain shadow-2xl" />
          </div>
        ) : (
          /* 単一ページ表示 */
          <div className="flex h-full w-full items-center justify-center">
            <canvas ref={canvasRef1} className="max-h-full max-w-full object-contain shadow-2xl" />
          </div>
        )}
      </div>

      {/* 読書中のページ番号（控えめなインジケーター） */}
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
