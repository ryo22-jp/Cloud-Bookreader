'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Header } from '@/components/Header';
import { Bookshelf } from '@/components/Bookshelf';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  ExternalLink,
  ShieldCheck,
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
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-28 text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] mb-8 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Drive 直結型 クラウド電子書籍リーダー</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl leading-tight">
              Googleドライブ内の自炊本を、<br />
              <span className="text-[var(--accent)]">どこでも軽快にストリーミング。</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              PDF、ZIP、CBZ、EPUBをダウンロード待ちなしで即座に閲覧。
              しおりや読書進捗もGoogle Driveと完全同期します。
            </p>

            {/* ログイン & 紹介記事ボタン */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => signIn('google')}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-[var(--accent)] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 transition active:scale-[0.98]"
              >
                <span>Googleアカウントでログイン</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-6 py-3.5 text-sm font-bold text-[var(--accent)] hover:opacity-80 transition shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                <span>紹介記事・使い方ガイドを見る</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
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
