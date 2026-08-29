import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'プライバシーポリシー | Cloud BookReader',
  description: 'Cloud BookReaderにおけるGoogleユーザーデータの取り扱いとプライバシー保護について',
};

export default function PrivacyPage() {
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
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            プライバシーポリシー
          </h1>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-8">
          最終更新日: 2026年8月29日
        </p>

        <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              1. はじめに
            </h2>
            <p>
              Cloud BookReader（以下、「本サービス」といいます）は、ユーザーのプライバシーを尊重し、個人情報の保護に細心の注意を払っています。本プライバシーポリシーでは、本サービスにおけるGoogleアカウントデータおよびGoogleドライブ上のファイルデータの取り扱いについて説明します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              2. 収集および利用する情報
            </h2>
            <p>本サービスは、サービスの提供に必要な最小限のGoogleユーザー情報のみにアクセスします：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs sm:text-sm">
              <li><strong>基本プロフィール情報（名前、メールアドレス、プロフィール画像）</strong>: ログイン状態の識別および画面上のユーザー表示にのみ使用します。</li>
              <li><strong>Googleドライブ内の電子書籍ファイルデータ</strong>: ユーザーがリーダー上で本をストリーミング閲覧するためにのみ一時的にアクセスし、サーバー上に永続保存することはありません。</li>
              <li><strong>読書進捗および設定データ</strong>: ユーザー自身のGoogleドライブ専用領域（Application Data Folder）にのみ保存され、開発者や第三者が閲覧・取得することはありません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              3. Google API データの限定使用に関する開示（Limited Use Policy）
            </h2>
            <p>
              本サービスによるGoogle APIから受け取った情報の使用および他のアプリへの転送は、<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Google API Services User Data Policy</a>（限定使用要件を含む）に準拠します。
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs sm:text-sm">
              <li>ユーザーデータは、人間が読める形式で開発者サーバーに保管されることはありません。</li>
              <li>ユーザーデータを広告配信やプロファイリングに利用することはありません。</li>
              <li>ユーザーデータをAIや機械学習モデルのトレーニングに使用することはありません。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              4. データの保存とセキュリティ
            </h2>
            <p>
              本サービスとGoogleサーバー間のすべての通信は、SSL/TLS（暗号化通信）によって保護されています。アクセストークンはセキュアな暗号化Cookie/セッション内でのみ一時保持され、ブラウザを閉じるかログアウトすることで破棄されます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              5. データの削除とアクセス権の取り消し
            </h2>
            <p>
              ユーザーはいつでも本サービスからログアウトできます。また、<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">Googleアカウントのサードパーティ製アプリ設定</a> から、本サービスへのアクセス許可をいつでも即座に取り消すことができます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">
              6. お問い合わせ
            </h2>
            <p>
              プライバシーポリシーに関するご質問やお問い合わせは、本サービスのGitHubリポジトリまたは管理者までご連絡ください。
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-color)] text-center">
          <Link
            href="/terms"
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition mr-6"
          >
            利用規約
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
