'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DriveFile, ViewerSettings, DEFAULT_VIEWER_SETTINGS, BookProgress } from '@/types';
import { PdfViewer } from '@/components/Reader/PdfViewer';
import { ZipViewer } from '@/components/Reader/ZipViewer';
import { EpubViewer } from '@/components/Reader/EpubViewer';
import { getLocalProgress, getViewerSettings } from '@/lib/storage';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileId = params?.fileId as string;

  const [fileMetadata, setFileMetadata] = useState<DriveFile | null>(null);
  const [initialProgress, setInitialProgress] = useState<BookProgress | null>(null);
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (!session || !fileId) return;

    async function initReader() {
      setIsLoading(true);
      try {
        // 設定 & ローカル進捗の読み込み
        const [savedSettings, localProg] = await Promise.all([
          getViewerSettings(),
          getLocalProgress(fileId),
        ]);
        setSettings(savedSettings);
        setInitialProgress(localProg);

        // クエリパラメータからファイル名を取得
        const queryName = searchParams?.get('name');

        let fileName = queryName || localProg?.fileName || '';
        let fileType: DriveFile['fileType'] = 'pdf';

        // メタデータAPIからファイル詳細を取得
        try {
          const metaRes = await fetch(`/api/drive/files/${fileId}`);
          if (metaRes.ok) {
            const meta: DriveFile = await metaRes.json();
            if (meta && meta.name) {
              fileName = meta.name;
              fileType = meta.fileType;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch detailed metadata, falling back:', e);
        }

        // ファイル名の拡張子からタイプをフォールバック判定
        if (!fileName) fileName = '電子書籍';
        const lower = fileName.toLowerCase();
        if (lower.endsWith('.zip')) fileType = 'zip';
        else if (lower.endsWith('.cbz')) fileType = 'cbz';
        else if (lower.endsWith('.epub')) fileType = 'epub';
        else if (lower.endsWith('.pdf')) fileType = 'pdf';

        setFileMetadata({
          id: fileId,
          name: fileName,
          mimeType: '',
          fileType,
          isFolder: false,
        });

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing reader:', err);
        setError(err.message || '書籍データの初期化に失敗しました');
        setIsLoading(false);
      }
    }

    initReader();
  }, [session, status, fileId, searchParams, router]);

  if (isLoading || status === 'loading') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-100 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">書籍を読み込んでいます...</p>
      </div>
    );
  }

  if (error || !fileMetadata) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <h2 className="text-xl font-bold text-rose-400 mb-2">読み込みエラー</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || 'ファイルが見つかりませんでした'}</p>
        <Link
          href="/"
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>本棚に戻る</span>
        </Link>
      </div>
    );
  }

  // ファイルタイプに応じたビューアのレンダリング
  if (fileMetadata.fileType === 'pdf') {
    return (
      <PdfViewer
        fileId={fileId}
        fileName={fileMetadata.name}
        initialPage={initialProgress?.currentPage || 1}
        initialSettings={settings}
      />
    );
  }

  if (fileMetadata.fileType === 'zip' || fileMetadata.fileType === 'cbz') {
    return (
      <ZipViewer
        fileId={fileId}
        fileName={fileMetadata.name}
        fileType={fileMetadata.fileType}
        initialPage={initialProgress?.currentPage || 1}
        initialSettings={settings}
      />
    );
  }

  if (fileMetadata.fileType === 'epub') {
    return (
      <EpubViewer
        fileId={fileId}
        fileName={fileMetadata.name}
        initialCfi={initialProgress?.epubCfi}
        initialSettings={settings}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <p className="text-slate-400">未対応のファイル形式です ({fileMetadata.fileType})</p>
      <Link href="/" className="mt-4 text-indigo-400 underline">本棚に戻る</Link>
    </div>
  );
}
