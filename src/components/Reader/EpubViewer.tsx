'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ViewerSettings, BookProgress } from '@/types';
import { ReaderControls } from './ReaderControls';
import { saveLocalProgress, saveViewerSettings } from '@/lib/storage';
import { Loader2 } from 'lucide-react';
import ePub, { Book, Rendition, Location } from 'epubjs';

interface EpubViewerProps {
  fileId: string;
  fileName: string;
  initialCfi?: string;
  initialSettings: ViewerSettings;
}

export function EpubViewer({
  fileId,
  fileName,
  initialCfi,
  initialSettings,
}: EpubViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(100);
  const [currentCfi, setCurrentCfi] = useState<string | undefined>(initialCfi);
  const [settings, setSettings] = useState<ViewerSettings>(initialSettings);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEpub() {
      if (!viewerRef.current) return;
      setIsLoading(true);

      try {
        const streamUrl = `/api/drive/stream/${fileId}`;
        const response = await fetch(streamUrl);
        const arrayBuffer = await response.arrayBuffer();

        const book = ePub(arrayBuffer);
        bookRef.current = book;

        await book.ready;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'auto',
          flow: 'paginated',
        });

        renditionRef.current = rendition;

        // テーマの適用
        rendition.themes.register('dark', {
          body: { background: '#090d16', color: '#e2e8f0' },
        });
        rendition.themes.register('light', {
          body: { background: '#ffffff', color: '#1e293b' },
        });
        rendition.themes.register('sepia', {
          body: { background: '#fbf0d9', color: '#5f4b32' },
        });
        rendition.themes.select(settings.theme || 'dark');

        // ロケーション生成
        await book.locations.generate(1000);

        // 初期表示位置
        if (initialCfi) {
          await rendition.display(initialCfi);
        } else {
          await rendition.display();
        }

        // 位置変更リスナー
        rendition.on('relocated', (location: Location) => {
          if (!isMounted) return;
          const cfi = location.start.cfi;
          setCurrentCfi(cfi);

          const percent = book.locations.percentageFromCfi(cfi);
          const pageNum = Math.round(percent * 100);
          setCurrentPage(Math.max(1, pageNum));
          setTotalPages(100);

          const progress: BookProgress = {
            fileId,
            fileName,
            fileType: 'epub',
            currentPage: pageNum,
            totalPages: 100,
            epubCfi: cfi,
            percentage: percent * 100,
            lastReadTime: new Date().toISOString(),
          };

          saveLocalProgress(progress);
          fetch('/api/drive/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progress),
          }).catch(() => {});
        });

        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error('Error loading EPUB:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadEpub();

    return () => {
      isMounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [fileId]);

  const goToNextPage = () => {
    renditionRef.current?.next();
  };

  const goToPrevPage = () => {
    renditionRef.current?.prev();
  };

  const handlePageChange = (percent: number) => {
    if (bookRef.current && renditionRef.current) {
      const cfi = bookRef.current.locations.cfiFromPercentage(percent / 100);
      renditionRef.current.display(cfi);
    }
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="relative flex h-screen w-screen select-none items-center justify-center overflow-hidden bg-slate-950 text-slate-100">
      <ReaderControls
        fileName={fileName}
        currentPage={currentPage}
        totalPages={totalPages}
        isVisible={isControlsVisible}
        settings={settings}
        fileType="epub"
        onPageChange={handlePageChange}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          saveViewerSettings(newSettings);
          if (renditionRef.current) {
            renditionRef.current.themes.select(newSettings.theme);
          }
        }}
        onToggleControls={() => setIsControlsVisible(!isControlsVisible)}
      />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400">EPUBを読み込み中...</p>
        </div>
      )}

      <div
        onClick={() => setIsControlsVisible(!isControlsVisible)}
        className="flex h-full w-full max-w-4xl items-center justify-center p-4 sm:p-8"
      >
        <div ref={viewerRef} className="h-full w-full" />
      </div>

      {/* 左右クリックナビゲーションエリア */}
      <div
        onClick={goToPrevPage}
        className="absolute left-0 top-16 bottom-16 w-1/5 cursor-pointer z-10 opacity-0 hover:opacity-10 bg-white/5 transition"
      />
      <div
        onClick={goToNextPage}
        className="absolute right-0 top-16 bottom-16 w-1/5 cursor-pointer z-10 opacity-0 hover:opacity-10 bg-white/5 transition"
      />
    </div>
  );
}
