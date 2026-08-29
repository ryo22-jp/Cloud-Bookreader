import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: '利用規約 | Cloud BookReader',
  description: 'Cloud BookReaderのサービス利用規約について',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-10 shadow-xl">
        {/* 戻るボタン */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-[var(--accent)] hover:underline mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>トップページに戻る</span>
        </Link>

        <div className="flex items-center space-x-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-bg)] text-[var(--accent)]">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            利用規約
          </h1>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-8">
          最終更新日: 2026年8月29日
        </p>

        <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              1. 規約への同意
            </h2>
            <p>
              本規約は、Cloud BookReader（以下、「本サービス」といいます）の利用条件を定めるものです。ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              2. サービスの概要
            </h2>
            <p>
              本サービスは、ユーザーが自身のGoogleドライブに保存している自炊電子書籍・文書ファイル（PDF, ZIP, CBZ, EPUB形式等）を、ブラウザ上でストリーミング閲覧するための個人向けリーダーツールです。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              3. 著作権およびコンテンツの自己管理
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>ユーザーは、自身が適法に著作権または正当な閲覧権限を有するファイルのみを対象として本サービスを利用するものとします。</li>
              <li>違法に複製されたコンテンツや第三者の著作権を侵害するファイルの利用は固く禁止します。</li>
              <li>本サービスはファイルの保管・ホスティングを行っておらず、すべてのファイルはユーザー自身のGoogleドライブ上にのみ存在します。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              4. 免責事項
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>本サービスは「現状有姿（AS IS）」で提供され、その完全性、安全性、特定目的への適合性についていかなる保証も行いません。</li>
              <li>Google APIの仕様変更、通信環境の不具合、サーバー停止等により本サービスが一時的に利用できなくなった場合でも、管理者は一切の責任を負いません。</li>
              <li>本サービスの利用に関連してユーザーに生じた損害について、管理者は故意または重過失がある場合を除き責任を負いません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              5. 規約の変更
            </h2>
            <p>
              管理者は、必要に応じて本規約を変更できるものとします。変更後の利用規約は、本サイト上に掲載された時点で効力を生じるものとします。
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-color)] text-center">
          <Link
            href="/privacy"
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition mr-6"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition"
          >
            トップページ
          </Link>
        </div>
      </div>
    </div>
  );
}
