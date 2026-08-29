# CloudReader セットアップガイド

Googleドライブ内のマンガ・書籍（PDF / ZIP / CBZ / EPUB）を、PC・iOS・Androidで快適にストリーミング閲覧できるPWAリーダーです。

---

## 1. Google Cloud Console でのOAuth 2.0設定（初回のみ・無料）

Googleドライブのファイルを安全に読み込むために、Google Cloud ConsoleでOAuthクライアントIDを1つ発行します。

### ステップ 1: プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスしてGoogleアカウントでログインします。
2. 画面上部のプロジェクト選択メニューから **「新しいプロジェクト」** を作成します（プロジェクト名: 例 `CloudReader`）。

### ステップ 2: Google Drive API の有効化
1. 左メニューの **「APIとサービス」 > 「ライブラリ」** を開きます。
2. 検索バーに `Google Drive API` と入力し、**「Google Drive API」** を選択して **「有効にする」** をクリックします。

### ステップ 3: OAuth 同意画面の設定
1. 左メニューの **「APIとサービス」 > 「OAuth 同意画面」** を開きます。
2. User Type で **「外部」** を選択して「作成」をクリック。
3. 必須項目を入力します：
   - アプリ名: `CloudReader`
   - ユーザーサポートメール: ご自身のGoogleメールアドレス
   - デベロッパーの連絡先情報: ご自身のGoogleメールアドレス
4. **「スコープを追加または削除」** をクリックし、以下を検索して追加します：
   - `.../auth/drive.readonly` (Google ドライブのすべてのファイルの表示)
   - `.../auth/drive.appdata` (Google ドライブのアプリケーション構成データの表示と管理)
5. **「テストユーザー」** にご自身のGoogleメールアドレスを追加します。

### ステップ 4: OAuth クライアント ID の作成
1. 左メニューの **「APIとサービス」 > 「認証情報」** を開きます。
2. 上部の **「認証情報を作成」 > 「OAuth クライアント ID」** を選択します。
3. アプリケーションの種類: **「ウェブ アプリケーション」**
4. **承認済みのリダイレクト URI** に以下を追加します：
   - ローカル開発時: `http://localhost:3000/api/auth/callback/google`
   - Vercel等への本番デプロイ時: `https://your-domain.vercel.app/api/auth/callback/google`
5. 作成をクリックすると、**「クライアント ID」** と **「クライアント シークレット」** が発行されます。

---

## 2. 環境変数の設定

プロジェクト直下の `.env.local` ファイルを作成し、以下を記入します：

```env
GOOGLE_CLIENT_ID=取得したクライアントID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=取得したクライアントシークレット

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=32文字以上の適当なランダム文字列（例: openssl rand -base64 32 の出力）
```

---

## 3. 起動方法

### ローカルでの起動
```bash
# 開発サーバー起動
npm run dev
```
ブラウザで `http://localhost:3000` を開きます。

### Vercelへのデプロイ（無料・スマホからのアクセス用）
1. GitHubにこのリポジトリをPushします。
2. [Vercel](https://vercel.com/) にGitHubリポジトリをインポートします。
3. Vercelの「Environment Variables」に上記の環境変数（`NEXTAUTH_URL` はVercelのURL `https://xxx.vercel.app`）を登録してDeployします。
4. Google Cloud ConsoleのリダイレクトURIにVercelのURLを追加します。

---

## 4. スマホ（iPhone / Android）でのPWAインストール

1. スマホのブラウザ（SafariまたはChrome）でデプロイしたURLを開きます。
2. **iPhone**: Safari下部の「共有ボタン」 > **「ホーム画面に追加」**
3. **Android**: Chrome右上のメニュー > **「アプリをインストール」** または **「ホーム画面に追加」**
4. ホーム画面のアプリアイコンから起動すると、アドレスバーのない全画面ネイティブアプリとして快適に読書できます。
