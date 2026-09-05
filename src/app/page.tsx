'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Header } from '@/components/Header';
import { Bookshelf } from '@/components/Bookshelf';
import { WebDAVConnectModal } from '@/components/Bookshelf/WebDAVConnectModal';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Cloud,
  Server,
} from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isWebDAVModalOpen, setIsWebDAVModalOpen] = useState<boolean>(false);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const GUIDE_URL = 'https://puzzleout.net/cloud-book-reader';

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
          /* 未ログイン時：シンプルで洗練されたランディング */
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] mb-8 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Drive • OneDrive • 自宅NAS (WebDAV) 対応</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl leading-tight">
              クラウド＆自宅NASの自炊本を、<br />
              <span className="text-[var(--accent)]">どこでも軽快にストリーミング。</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              PDF、ZIP、CBZ、EPUBをダウンロード待ちなしで即座に閲覧。
              しおりや読書進捗もクラウド・NASと完全同期します。
            </p>

            {/* 接続ボタン群 */}
            <div className="mt-10 flex flex-col items-center justify-center space-y-3 max-w-lg mx-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {/* Google ログイン */}
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center justify-center space-x-2.5 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition active:scale-[0.98]"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 16.14 15.645 18 12.24 18c-3.315 0-6-2.685-6-6s2.685-6 6-6c1.53 0 2.925.57 4.005 1.515l2.4-2.4C16.995 3.525 14.775 2.7 12.24 2.7 7.08 2.7 2.91 6.87 2.91 12.03s4.17 9.33 9.33 9.33c5.385 0 8.955-3.795 8.955-9.12 0-.615-.06-1.215-.18-1.785H12.24z" />
                  </svg>
                  <span>Google でログイン</span>
                </button>

                {/* Microsoft (OneDrive) ログイン */}
                <button
                  onClick={() => signIn('azure-ad')}
                  className="flex items-center justify-center space-x-2.5 rounded-2xl border border-blue-500/30 bg-blue-600/10 text-blue-500 dark:text-blue-400 hover:bg-blue-600/20 px-5 py-3.5 text-sm font-bold transition active:scale-[0.98] shadow-sm"
                >
                  <Cloud className="h-4 w-4" />
                  <span>OneDrive でログイン</span>
                </button>
              </div>

              {/* 自宅NAS (WebDAV) 接続ボタン */}
              <button
                onClick={() => setIsWebDAVModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-5 py-3.5 text-sm font-bold transition active:scale-[0.98] shadow-sm"
              >
                <Server className="h-4 w-4" />
                <span>自宅NAS (WebDAV) で接続</span>
              </button>

              {/* 紹介記事リンク */}
              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-3 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition shadow-sm mt-1"
              >
                <BookOpen className="h-4 w-4 text-[var(--accent)]" />
                <span>紹介記事・使い方ガイドを見る</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </div>

            {/* 安全性に関するシンプルな注記 */}
            <div className="mt-12 inline-flex items-center space-x-1.5 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>本アプリは読み取り専用で動作し、お客様の書籍データをサーバー上に保管しません。</span>
            </div>
          </div>
        )}
      </main>

      {/* 自宅NAS接続モーダル */}
      <WebDAVConnectModal
        isOpen={isWebDAVModalOpen}
        onClose={() => setIsWebDAVModalOpen(false)}
      />

      {/* フッター（ログイン後・未ログイン共通で目立つデザイン） */}
      <footer className="border-t border-[var(--border-color)] py-8 px-4 text-center text-xs text-[var(--text-muted)]">
        {/* 目立つガイドリンクバナー */}
        <div className="mb-5 flex justify-center">
          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-1.5 text-xs font-bold text-[var(--accent)] hover:scale-105 transition-all shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>📖 使い方ガイド・紹介記事はこちら</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-3">
          <Link href="/privacy" className="hover:text-[var(--text-primary)] transition">
            プライバシーポリシー
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-[var(--text-primary)] transition">
            利用規約
          </Link>
          <span>•</span>
          <a
            href="https://github.com/ryo22-jp/Cloud-Bookreader"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition"
          >
            GitHub (オープンソース)
          </a>
        </div>
        <p>© 2026 Cloud BookReader. All rights reserved.</p>
      </footer>
    </div>
  );
}
