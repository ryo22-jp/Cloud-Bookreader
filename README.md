# 📚 Cloud BookReader (Google Drive Web Comic & Book Reader)

Googleドライブに保存されている自炊マンガや書籍（PDF / ZIP / CBZ / EPUB）を、ダウンロード待ちなしで軽快にストリーミング閲覧できるWebリーダーアプリです。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fryo22-jp%2FCloud-Bookreader&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,NEXTAUTH_SECRET&envDescription=Google%20Cloud%20Console%E3%81%A7%E5%8F%96%E5%BE%97%E3%81%97%E3%81%9F%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A0%E3%83%B3%E3%83%88ID%E3%80%81%E3%82%B7%E3%83%BC%E3%82%AF%E3%83%AC%E3%83%83%E3%83%88%E3%80%81%E4%BB%BB%E6%84%8F%E3%81%AE%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E6%96%87%E5%AD%97%E5%88%97(NEXTAUTH_SECRET)%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%E3%80%82)

---

## ✨ 主な特徴

- ⚡ **HTTP Range Request ストリーミング**: 数百MBの大型PDFやZIPファイルも、必要なページだけをオンデマンド取得。ギガを消費せずダウンロード待ち0秒で即座に読書開始。
- 🔄 **Googleドライブ完全同期**: 読書進捗（ページ番号・読了率）および自動生成された軽量表紙サムネイルは、Googleドライブ専用領域（`appDataFolder`）に完全自動同期。PCで読んだ続きを外出先のスマホですぐに再開。
- 📖 **多彩なフォーマットに対応**: PDF（高速レンダリング）、ZIP/CBZ（マンガ見開き・右開き/左開き対応）、EPUB（縦書き・文字サイズ調整・目次対応）。
- 📱 **PWA（Progressive Web App）対応**: iPhoneやAndroidのホーム画面に追加するだけで、アドレスバーのない全画面ネイティブアプリとして動作。
- 🎨 **上質な2つの読書テーマ**: 「Midnight（木造書斎・ダーク）」と「Paper（和紙ミニマル・ライト）」をワンタップ切替。
- 🔒 **完全セルフホスト & プライベート**: 利用者自身のGoogle APIキーと無料のVercelアカウントで動作するため、第三者のサーバーにデータが渡る心配は一切ありません。

---

## 🚀 デプロイ＆セットアップ手順

### 1. Google Cloud Console で APIキーを取得（無料）
1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成。
2. **「APIとサービス」→「ライブラリ」** から **「Google Drive API」** を有効化。
3. **「OAuth 同意画面」** を設定（ユーザータイプ: 外部、スコープに `.../auth/drive.readonly` と `.../auth/drive.appdata` を追加、テストユーザーにご自身のGmailアドレスを追加）。
4. **「認証情報」→「認証情報を作成」→「OAuth クライアント ID」**（種類: ウェブ アプリケーション）を作成し、**Client ID** と **Client Secret** を取得。

### 2. Vercel にデプロイ
上の **「Deploy with Vercel」** ボタンをクリックし、取得した環境変数を入力してデプロイします。

### 3. リダイレクトURIを Google Cloud に登録
発行されたVercelのURL（例: `https://your-app.vercel.app`）を、Google Cloud Console の OAuth クライアント設定に追加します：
- **承認済みの JavaScript 生成元**: `https://your-app.vercel.app`
- **承認済みのリダイレクト URI**: `https://your-app.vercel.app/api/auth/callback/google`

---

## 🛠 技術スタック

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js (Google OAuth 2.0)
- **PDF Viewer**: PDF.js (v3)
- **Archive Viewer**: JSZip (Worker-based chunk extraction)
- **EPUB Viewer**: Epub.js
- **Local Cache**: IndexedDB (idb-keyval)
- **Deployment**: Vercel
