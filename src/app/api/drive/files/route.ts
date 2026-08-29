import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listDriveFiles, getFileMetadata } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';
    const query = searchParams.get('q') || undefined;

    const result = await listDriveFiles(session.accessToken, folderId, query);

    // カレントフォルダの情報を取得（ルート以外の場合）
    let currentFolder = undefined;
    if (folderId !== 'root' && !query) {
      try {
        currentFolder = await getFileMetadata(session.accessToken, folderId);
      } catch (e) {
        console.warn('Could not fetch current folder metadata:', e);
      }
    }

    return NextResponse.json({
      files: result.files,
      currentFolder,
    });
  } catch (error: any) {
    console.error('API /api/drive/files error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
