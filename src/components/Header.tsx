'use client';

import React, { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  BookOpen,
  Search,
  LogOut,
  LogIn,
  LayoutGrid,
  List,
  RefreshCw,
  User,
  Moon,
  Scroll,
} from 'lucide-react';
import { useUiTheme } from './ThemeProvider';

interface HeaderProps {
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Header({
  viewMode = 'list',
  onViewModeChange,
  onSearch,
  onRefresh,
  isLoading = false,
}: HeaderProps) {
  const { data: session } = useSession();
  const [searchInput, setSearchInput] = useState('');
  const { theme, toggleTheme } = useUiTheme();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90 px-4 py-3 backdrop-blur-md transition-colors">
      {/* ロゴ / タイトル */}
      <div className="flex items-center space-x-3">
        <a href="/" className="flex items-center space-x-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="hidden font-bold tracking-tight text-[var(--text-primary)] sm:inline-block text-lg">
            Cloud<span className="text-[var(--accent)] font-serif italic">Reader</span>
          </span>
        </a>
      </div>

      {/* 検索バー */}
      {session && (
        <form
          onSubmit={handleSearchSubmit}
          className="mx-4 flex flex-1 max-w-md items-center"
        >
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="本やフォルダを検索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] py-1.5 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] shadow-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearch?.('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                クリア
              </button>
            )}
          </div>
        </form>
      )}

      {/* 操作ボタン & テーマ切替 & アカウント */}
      <div className="flex items-center space-x-2">
        {/* テーマ切り替えボタン（Midnight ⇄ Paper トグル） */}
        <button
          onClick={toggleTheme}
          title={theme === 'midnight' ? 'Paperテーマ（和紙ミニマル）に切り替え' : 'Midnightテーマ（木造書斎）に切り替え'}
          className="flex items-center space-x-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition shadow-sm"
        >
          {theme === 'midnight' ? (
            <>
              <Moon className="h-4 w-4 text-amber-400" />
              <span>Midnight</span>
            </>
          ) : (
            <>
              <Scroll className="h-4 w-4 text-emerald-600" />
              <span>Paper</span>
            </>
          )}
        </button>

        {session ? (
          <>
            {/* 更新ボタン */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="再読み込み"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* ユーザーアバター / ログアウト */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[var(--border-color)]">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="h-8 w-8 rounded-full border border-[var(--border-color)] object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white text-xs font-semibold">
                  <User className="h-4 w-4" />
                </div>
              )}
              <button
                onClick={() => signOut()}
                title="ログアウト"
                className="hidden sm:flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ログアウト</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="flex items-center space-x-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/20 hover:opacity-90 transition"
          >
            <LogIn className="h-4 w-4" />
            <span>Googleでログイン</span>
          </button>
        )}
      </div>
    </header>
  );
}
