'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { Header } from '@/components/Header';
import { Bookshelf } from '@/components/Bookshelf';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Server,
  FileText,
  ExternalLink,
  AlertTriangle,
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
          /* 未ログイン時：ランディング & セルフホスト案内 */
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] mb-6 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Drive 直結型 クラウド電子書籍リーダー</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl leading-tight">
              Googleドライブ内の自炊本を、<br />
              <span className="text-[var(--accent)]">安全・快適にストリーミング。</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              PDF、ZIP、CBZ、EPUBをダウンロード待ちなしで即座に閲覧。
              しおり・読書進捗もGoogle Driveと完全同期します。
            </p>

            {/* ログイン & マニュアルボタン */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => signIn('google')}
                className="flex items-center space-x-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition"
              >
                <span>Googleアカウントでログイン</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href="https://puzzleout.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition shadow-sm"
              >
                <FileText className="h-4 w-4 text-[var(--accent)]" />
                <span>紹介記事・マニュアルを見る</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </div>

            {/* ご利用に関する重要な案内（自己責任・セルフホストの推奨） */}
            <div className="mt-12 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 text-left shadow-sm">
              <div className="flex items-center space-x-2.5 text-amber-500 mb-3 font-bold text-sm sm:text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>ご利用に関するご案内（自己責任・個人利用向け）</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                本サービスは、Googleドライブ内の電子書籍をストリーミング閲覧するための個人開発オープンソースツールです。
                Googleのセキュリティ仕様に基づき、本アプリは「読み取り専用」で動作し、お客様のファイルデータをサーバー上に保管・収集することは一切ありません。
                サービスの利用は自己責任にてお願いいたします。
              </p>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  <Server className="h-4 w-4 text-[var(--accent)]" />
                  <span>【推奨】自分専用の環境（セルフホスト）で一生涯安全に使う</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  ご自身のGoogle Cloudキーと無料のVercelアカウントを使って、誰にも邪魔されない「完全プライベートな自分専用リーダー」を数分で立ち上げることができます（人数制限・共有リスクゼロ）。
                </p>
                <a
                  href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fryo22-jp%2FCloud-Bookreader&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,NEXTAUTH_SECRET,NEXTAUTH_URL&envDescription=Google%20Cloud%20Console%E3%81%A7%E5%8F%96%E5%BE%97%E3%81%97%E3%81%9F%E8%A8%AD%E5%AE%9A%E5%80%A4%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84&project-name=my-cloud-bookreader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black px-3.5 py-2 text-xs font-bold hover:opacity-80 transition shadow-sm"
                >
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 1155 1000">
                    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
                  </svg>
                  <span>Deploy to Vercel（自分専用環境を作成）</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-[var(--border-color)] py-6 px-4 text-center text-xs text-[var(--text-muted)]">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <Link href="/privacy" className="hover:text-[var(--text-primary)] transition">
            プライバシーポリシー
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-[var(--text-primary)] transition">
            利用規約
          </Link>
          <span>•</span>
          <a
            href="https://puzzleout.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition font-medium"
          >
            使い方ガイド・記事
          </a>
          <span>•</span>
          <a
            href="https://github.com/ryo22-jp/Cloud-Bookreader"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition"
          >
            GitHub
          </a>
        </div>
        <p>© 2026 Cloud BookReader. All rights reserved.</p>
      </footer>
    </div>
  );
}
