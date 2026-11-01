# 📚 Cloud BookReader (Google Drive / OneDrive / Dropbox / Nextcloud / WebDAV / Local Comic & Book Reader)

Googleドライブ、Microsoft OneDrive、Dropbox、Nextcloud、自宅NAS (WebDAV)、および端末内のローカルファイルに保存されている自炊マンガや書籍（PDF / ZIP / CBZ / EPUB）を、ダウンロード待ちなしで軽快にストリーミング閲覧できるWebリーダーアプリです。

📖 **公式紹介・導入＆使い方ガイドはこちら**:  
👉 **[https://puzzleout.net/cloud-book-reader](https://puzzleout.net/cloud-book-reader)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fryo22-jp%2FCloud-Bookreader&env=GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,NEXTAUTH_SECRET&envDescription=Google%20Cloud%20Console%E3%81%A7%E5%8F%96%E5%BE%97%E3%81%97%E3%81%9F%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A0%E3%83%B3%E3%83%88ID%E3%80%81%E3%82%B7%E3%83%BC%E3%82%AF%E3%83%AC%E3%83%83%E3%83%88%E3%80%81%E4%BB%BB%E6%84%8F%E3%81%AE%E3%83%A9%E3%83%B3%E3%83%80%E3%83%A0%E6%96%87%E5%AD%97%E5%88%97(NEXTAUTH_SECRET)%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%E3%80%82)

---

## ✨ 主な特徴

- ⚡ **HTTP Range Request ストリーミング**: 数百MBの大型PDFやZIPファイルも、必要なページだけをオンデマンド取得。ギガを消費せずダウンロード待ち0秒で即座に読書開始。
- 🔄 **マルチクラウド完全同期**: 読書進捗（ページ番号・読了率）および自動生成された軽量表紙サムネイルは、各クラウドの専用領域（Google Drive `appDataFolder` / OneDrive `AppFolder` / Dropbox / Nextcloud / WebDAV）や端末内に完全自動同期。PCで読んだ続きを外出先のスマホですぐに再開。
- ⏭️ **シームレスな連続読書**: 最終ページに到達すると「次の巻を読む」ボタンが自動表示され、本棚に戻ることなくワンタップで次の巻へ連続移動。
- 📂 **ログイン不要のローカル閲覧モード**: 端末内のファイルやフォルダを直接選択して、通信量ゼロ・設定ゼロですぐに閲覧可能。
- 📖 **多彩なフォーマットに対応**: PDF（高速レンダリング）、ZIP/CBZ（マンガ見開き・右開き/左開き対応）、EPUB（縦書き・文字サイズ調整・目次対応）。
- 📥 **オフライン保存対応**: 自宅Wi-Fiで最大5冊まで端末内に事前保存し、地下鉄や機内モードでも通信量ゼロで閲覧可能。
- 📱 **PWA（Progressive Web App）対応**: iPhoneやAndroidのホーム画面に追加するだけで、アドレスバーのない全画面ネイティブアプリとして動作。
- 🎨 **上質な2つの読書テーマ**: 「Midnight（木造書斎・ダーク）」と「Paper（和紙ミニマル・ライト）」をワンタップ切替。
- 🔒 **完全セルフホスト & プライベート**: 利用者自身のAPIキーと無料のVercelアカウントで動作するため、第三者のサーバーにデータが渡る心配は一切ありません。

---

## 🚀 導入・セットアップ手順 ＆ 使い方ガイド

自分専用環境のデプロイ手順（Vercel / API設定）や、各クラウドストレージ（Google Drive / OneDrive / Dropbox / Nextcloud）・自宅NAS（Synology / QNAP等）の接続方法、アップデート手順については、以下の公式解説ページをご参照ください。

🔗 **[Cloud BookReader 導入＆操作マニュアル（puzzleout.net）](https://puzzleout.net/cloud-book-reader)**

---

## 🛠 技術スタック

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js (Google / Microsoft Entra ID / Dropbox / WebDAV / Nextcloud)
- **PDF Viewer**: PDF.js (v3)
- **Archive Viewer**: unzipit (HTTP Range Request chunk extraction)
- **EPUB Viewer**: Epub.js
- **Local Cache**: IndexedDB (idb-keyval)
- **Deployment**: Vercel
