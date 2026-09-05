import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Cloud,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  FolderOpen,
  Lock,
} from 'lucide-react';

export const metadata = {
  title: 'OneDrive ＆ 自宅NAS 設定・接続ガイド | Cloud BookReader',
  description: 'Microsoft OneDrive および自宅NAS（Synology, QNAP, Nextcloud等）のWebDAV設定・接続手順の完全ガイド',
};

export default function StorageGuidePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-12 shadow-xl">
        {/* 戻るボタン */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-[var(--accent)] hover:underline mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>トップページに戻る</span>
        </Link>

        {/* ページタイトル */}
        <div className="border-b border-[var(--border-color)] pb-8 mb-8">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3.5 py-1 text-xs font-semibold text-[var(--accent)] mb-4">
            <span>マルチストレージ対応 完全ガイド</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
            OneDrive ＆ 自宅NAS（WebDAV）<br />
            設定・接続ガイド
          </h1>
          <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
            Google Drive に加え、Microsoft OneDrive やご自宅のNAS（Synology / QNAP / Nextcloud 等）を連携して、どこからでも爆速ストリーミング読書を楽しむための設定手順です。
          </p>
        </div>

        <div className="space-y-12 text-sm text-[var(--text-secondary)] leading-relaxed">
          {/* 1. Microsoft OneDrive */}
          <section id="onedrive" className="scroll-mt-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Cloud className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  1. Microsoft OneDrive の設定・使い方
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Microsoft 365 ユーザーの大容量1TBストレージをフル活用
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 mb-6">
              <h3 className="text-sm font-bold text-blue-500 mb-2">📱 一般的な使い方（わずか2ステップ）</h3>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[var(--text-primary)]">
                <li>トップページの <strong>「OneDrive でログイン」</strong> ボタンをクリックし、お使いの Microsoft アカウントでサインインします。</li>
                <li>本棚画面が開いたら、画面の指示に従って本棚にするフォルダを1つ選択します（アプリ内フォルダピッカーで階層を自由に選べます）。</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
                <span>⚙️ セルフホスト（自分専用サーバー）でキーを設定する場合</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                ご自身で Vercel にデプロイしている場合は、Microsoft Azure ポータル（無料）で API キーを取得して環境変数に設定します。
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)]">① アプリの登録: </span>
                  <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline inline-flex items-center space-x-1 ml-1">
                    <span>Azure Portal (アプリの登録)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  で「新規登録」。「任意の組織と個人アカウント (例: Skype, Xbox)」を選択し、リダイレクトURIに <code>https://your-domain.vercel.app/api/auth/callback/azure-ad</code> を設定します。
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)]">② API のアクセス許可: </span>
                  「Microsoft Graph」→「委任されたアクセス許可」で <code>Files.Read</code>、<code>Files.ReadWrite.AppFolder</code>、<code>offline_access</code> を追加します。
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-primary)]">③ Vercel 環境変数: </span>
                  <code>AZURE_AD_CLIENT_ID</code>、<code>AZURE_AD_CLIENT_SECRET</code>、<code>AZURE_AD_TENANT_ID=common</code> を設定して再デプロイします。
                </div>
              </div>
            </div>
          </section>

          {/* 2. 自宅NAS (WebDAV) */}
          <section id="webdav" className="scroll-mt-8 border-t border-[var(--border-color)] pt-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  2. 自宅NAS（WebDAV）の設定・接続方法
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Synology、QNAP、Nextcloud、TrueNAS 等の大容量ハードディスクを直結
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6">
              WebDAV はほぼすべての主要NASが標準対応しているファイル転送規格です。HTTP Range Request に完全対応しているため、テラバイト級の大容量自炊ライブラリでも今開く1ページだけを瞬時にダウンロードして爆速で読書できます。
            </p>

            {/* NAS別設定ガイド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Synology */}
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 space-y-3">
                <div className="flex items-center space-x-2 font-bold text-sm text-[var(--text-primary)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Synology NAS の設定</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-muted)]">
                  <li>DSM管理画面の「パッケージセンター」から <strong>「WebDAV Server」</strong> をインストール。</li>
                  <li>アプリを開き、<strong>「HTTPS を有効にする (ポート: 5006)」</strong> にチェックを入れて適用。</li>
                  <li>接続URLの例:<br />
                    <code className="text-amber-600 dark:text-amber-400">https://your-nas.synology.me:5006</code>
                  </li>
                </ol>
              </div>

              {/* QNAP */}
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 space-y-3">
                <div className="flex items-center space-x-2 font-bold text-sm text-[var(--text-primary)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>QNAP NAS の設定</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-muted)]">
                  <li>QTS管理画面の「コントロールパネル」→「アプリケーション」→ <strong>「WebDAV」</strong> を開く。</li>
                  <li><strong>「WebDAV を有効にする」</strong>（ポート: 5001 または 8081）にチェック。</li>
                  <li>接続URLの例:<br />
                    <code className="text-amber-600 dark:text-amber-400">https://your-nas.myqnapcloud.com:5001</code>
                  </li>
                </ol>
              </div>

              {/* Nextcloud / ownCloud */}
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 space-y-3 md:col-span-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-[var(--text-primary)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <span>Nextcloud / ownCloud の設定</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Nextcloud は最初から WebDAV が有効になっています。Web画面左下の「ファイル設定（歯車マーク）」をクリックすると表示される <strong>WebDAV URL</strong> をそのままコピーして使用できます。
                </p>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  例: <code>https://your-nextcloud.com/remote.php/dav/files/username/</code>
                </div>
              </div>
            </div>

            {/* 外出先からの接続について */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3 mb-6">
              <div className="flex items-center space-x-2 font-bold text-sm text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-4 w-4" />
                <span>外出先から自宅NASにつなぐには？</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li><strong>自宅Wi-Fi内のみで読む場合</strong>: ローカルIPアドレス（例: <code>http://192.168.1.100:5005</code>）でそのまま接続できます。</li>
                <li><strong>外出先のスマホ・PCから読む場合</strong>:
                  <ul className="list-none pl-5 mt-1 space-y-1 text-[var(--text-muted)]">
                    <li>・Synology DDNS / myQNAPcloud を有効にしてルーターのWebDAVポート（5006等）を開放する</li>
                    <li>・または Tailscale / Cloudflare Tunnel などのメッシュVPNやトンネリングを利用する</li>
                  </ul>
                </li>
              </ul>
            </div>

            {/* アプリでの接続手順 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                📱 アプリでの接続手順
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                <li>トップ画面の <strong>「自宅NAS (WebDAV) で接続」</strong> をクリックします。</li>
                <li><strong>WebDAV サーバーURL</strong>（例: <code>https://my-nas.synology.me:5006</code>）、ユーザー名、パスワードを入力します。</li>
                <li>「NASに接続」を押すと自動で疎通確認が行われ、本棚画面が開きます。</li>
                <li>本棚フォルダ選択で、自炊本が入っている共有フォルダ（例: <code>/volume1/manga</code>）を選べば読書スタートです！</li>
              </ol>
            </div>
          </section>

          {/* 3. セキュリティとプライバシーの安心設計 */}
          <section className="border-t border-[var(--border-color)] pt-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  3. セキュリティとプライバシーの安心設計
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  あなたの大切なデータを外部に保存・送信しない徹底した安全設計
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span>パスワード未保存</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  NASのパスワードはサーバーやデータベースに一切保存されません。暗号化Cookie内でのみ安全に利用されます。
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>読み取り専用アクセス</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  書籍ファイルを誤って編集・削除することはシステム上不可能です。大切なファイルを傷つけません。
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <FolderOpen className="h-4 w-4 text-emerald-500" />
                  <span>隔離されたしおり同期</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  しおりや進捗は専用の隠しフォルダ（<code>/.cloud_bookreader</code>）にのみ書き込まれます。
                </p>
              </div>
            </div>
          </section>

          {/* 4. よくある質問 & トラブルシューティング */}
          <section className="border-t border-[var(--border-color)] pt-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              4. トラブルシューティング（接続できない場合）
            </h2>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1">
                <div className="font-bold text-[var(--text-primary)]">
                  Q. 「WebDAVサーバーに接続できませんでした」と表示されます
                </div>
                <ul className="list-disc list-inside text-xs text-[var(--text-muted)] space-y-1 pt-1">
                  <li>URLのプロトコル（<code>http://</code> または <code>https://</code>）とポート番号（例: <code>:5006</code>）が合っているか確認してください。</li>
                  <li>NAS側のファイアウォール設定で、WebDAVポートの通信が許可されているか確認してください。</li>
                  <li>外出先からのアクセスの場合は、ルーターのポート転送（ポートフォワーディング）が正しく行われているか確認してください。</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1">
                <div className="font-bold text-[var(--text-primary)]">
                  Q. 自己署名SSL証明書（オレオレ証明書）のNASでも使えますか？
                </div>
                <p className="text-xs text-[var(--text-muted)] pt-1">
                  自己署名証明書の場合、ブラウザのセキュリティ警告で接続がブロックされることがあります。Let's Encrypt（SynologyやQNAPの標準機能で無料で取得可能）の無料SSL証明書を設定するか、または <code>http://</code> 接続をお試しください。
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ページ下部戻るボタン */}
        <div className="mt-12 pt-8 border-t border-[var(--border-color)] flex justify-between items-center text-xs">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 font-bold text-[var(--accent)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>トップページに戻る</span>
          </Link>
          <span className="text-[var(--text-muted)]">© 2026 Cloud BookReader</span>
        </div>
      </div>
    </div>
  );
}
