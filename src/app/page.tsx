'use client';

import React, { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Header } from '@/components/Header';
import { Bookshelf } from '@/components/Bookshelf';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
      <Header
        onSearch={handleSearch}
        onRefresh={handleRefresh}
      />

      <main className="flex-1">
        {status === 'loading' ? (
          <div className="flex h-[80vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : session ? (
          /* ログイン時：本棚を表示 */
          <Bookshelf
            searchQuery={searchQuery}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          /* 未ログイン時：ランディングページ */
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Drive 直結型 クラウド電子書籍リーダー</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Googleドライブ内の自炊本を、<br />
              <span className="text-[var(--accent)]">どこでも軽快にストリーミング。</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-[var(--text-muted)]">
              PDF、ZIP、CBZ、EPUBをダウンロード待ちなしで即座に閲覧。
              しおり・読書進捗もGoogle Driveと完全同期します。
            </p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => signIn('google')}
                className="flex items-center space-x-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
              >
                <span>Googleアカウントでログイン</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
