'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ViewerSettings } from '@/types';

interface ReaderControlsProps {
  fileName: string;
  currentPage: number;
  totalPages: number;
  isVisible: boolean;
  settings: ViewerSettings;
  onPageChange: (page: number) => void;
  onSettingsChange: (settings: ViewerSettings) => void;
  onToggleControls: () => void;
  fileType: 'pdf' | 'zip' | 'cbz' | 'epub';
}

export function ReaderControls({
  fileName,
  currentPage,
  totalPages,
  isVisible,
  settings,
  onPageChange,
  onSettingsChange,
  onToggleControls,
  fileType,
}: ReaderControlsProps) {
  const router = useRouter();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 直前の画面（フォルダ）に戻る
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // 全画面切り替え
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const isRTL = settings.readingDirection === 'rtl';

  return (
    <>
      {/* 上部ヘッダーバー */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[var(--bg-secondary)]/95 px-4 py-3 text-[var(--text-primary)] border-b border-[var(--border-color)] backdrop-blur-md transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center space-x-3 truncate">
          <button
            onClick={handleGoBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer shadow-sm"
            title="直前のフォルダに戻る"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-sm font-semibold sm:text-base">{fileName}</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* 設定ボタン */}
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition shadow-sm ${
              showSettingsModal ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : ''
            }`}
            title="リーダー設定"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* 全画面ボタン */}
          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition shadow-sm"
            title={isFullscreen ? '全画面解除' : '全画面表示'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 設定ドロップダウン / モーダル */}
      {showSettingsModal && isVisible && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed top-16 right-4 z-50 w-80 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl backdrop-blur-lg"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <Settings className="h-4 w-4 text-[var(--accent)]" />
              <span>リーダー設定</span>
            </h3>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              閉じる
            </button>
          </div>

          <div className="mt-4 space-y-4 text-xs text-[var(--text-secondary)]">
            {/* ページ送り方向 */}
            {fileType !== 'epub' && (
              <div>
                <label className="mb-2 block font-medium text-[var(--text-muted)]">ページめくり方向</label>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    onClick={() =>
                      onSettingsChange({ ...settings, readingDirection: 'rtl' })
                    }
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.readingDirection === 'rtl'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    右開き(マンガ)
                  </button>
                  <button
                    onClick={() =>
                      onSettingsChange({ ...settings, readingDirection: 'ltr' })
                    }
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.readingDirection === 'ltr'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    左開き
                  </button>
                  <button
                    onClick={() =>
                      onSettingsChange({ ...settings, readingDirection: 'vertical' })
                    }
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.readingDirection === 'vertical'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    縦スクロール
                  </button>
                </div>
              </div>
            )}

            {/* 見開き表示設定 */}
            {fileType !== 'epub' && (
              <div>
                <label className="mb-2 block font-medium text-[var(--text-muted)]">見開き表示</label>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    onClick={() => onSettingsChange({ ...settings, pageSpread: 'auto' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.pageSpread === 'auto'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    自動
                  </button>
                  <button
                    onClick={() => onSettingsChange({ ...settings, pageSpread: 'single' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.pageSpread === 'single'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    単ページ
                  </button>
                  <button
                    onClick={() => onSettingsChange({ ...settings, pageSpread: 'double' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.pageSpread === 'double'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    見開き(2P)
                  </button>
                </div>
              </div>
            )}

            {/* 表紙単独表示 */}
            {fileType !== 'epub' && (
              <div className="flex items-center justify-between py-1">
                <label htmlFor="doubleCoverAlone" className="text-xs text-[var(--text-secondary)]">
                  表紙(1P)を単独表示
                </label>
                <input
                  id="doubleCoverAlone"
                  type="checkbox"
                  checked={settings.doubleCoverAlone}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      doubleCoverAlone: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] accent-[var(--accent)]"
                />
              </div>
            )}

            {/* フィットモード */}
            {fileType !== 'epub' && (
              <div>
                <label className="mb-2 block font-medium text-[var(--text-muted)]">画像フィット</label>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    onClick={() => onSettingsChange({ ...settings, fitMode: 'contain' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.fitMode === 'contain'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    画面に合わせる
                  </button>
                  <button
                    onClick={() => onSettingsChange({ ...settings, fitMode: 'height' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.fitMode === 'height'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    高さ優先
                  </button>
                  <button
                    onClick={() => onSettingsChange({ ...settings, fitMode: 'width' })}
                    className={`rounded-lg py-1.5 font-medium transition ${
                      settings.fitMode === 'width'
                        ? 'bg-[var(--accent)] text-white shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    幅優先
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 下部フッターバー（シークバー・ページ送り） */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/95 px-4 py-3 text-[var(--text-primary)] border-t border-[var(--border-color)] backdrop-blur-md transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto flex max-w-2xl flex-col space-y-2">
          {/* シークバー */}
          {totalPages > 0 && (
            <div className="flex items-center space-x-3">
              <span className="w-12 text-center text-xs font-semibold text-[var(--text-primary)]">
                {currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => onPageChange(parseInt(e.target.value, 10))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-[var(--border-color)] accent-[var(--accent)]"
                style={{ direction: isRTL ? 'rtl' : 'ltr' }}
              />
              <span className="w-12 text-center text-xs text-[var(--text-muted)]">
                {totalPages}P
              </span>
            </div>
          )}

          {/* ページ送りボタン */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => onPageChange(isRTL ? currentPage + 1 : currentPage - 1)}
              disabled={isRTL ? currentPage >= totalPages : currentPage <= 1}
              className="flex items-center space-x-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition disabled:opacity-30 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{isRTL ? '次ページ' : '前ページ'}</span>
            </button>

            <span className="text-xs text-[var(--text-muted)] font-medium">
              {totalPages > 0 ? `${Math.round((currentPage / totalPages) * 100)}%` : ''}
            </span>

            <button
              onClick={() => onPageChange(isRTL ? currentPage - 1 : currentPage + 1)}
              disabled={isRTL ? currentPage <= 1 : currentPage >= totalPages}
              className="flex items-center space-x-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition disabled:opacity-30 shadow-sm"
            >
              <span>{isRTL ? '前ページ' : '次ページ'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
