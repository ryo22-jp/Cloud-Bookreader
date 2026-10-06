import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/cloud-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken || (session as any).error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: '認証の有効期限が切れました。再度ログインしてください。', isAuthError: true },
        { status: 401 }
      );
    }

    const { fileId } = params;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const provider = getStorageProvider(session);
    const metadata = await provider.getFileMetadata(fileId);
    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('API /api/drive/files/[fileId] error:', error);
    const isAuth =
      /401|invalid authentication credentials|invalid_grant|unauthorized|token/i.test(
        error.message || ''
      );
    return NextResponse.json(
      {
        error: isAuth
          ? '認証の有効期限が切れました。再度ログインしてください。'
          : error.message || 'Failed to fetch file metadata',
        isAuthError: isAuth,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}
