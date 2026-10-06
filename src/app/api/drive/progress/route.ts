import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/cloud-storage';
import { BookProgress } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken || (session as any).error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: '認証の有効期限が切れました。再度ログインしてください。', isAuthError: true },
        { status: 401 }
      );
    }

    const provider = getStorageProvider(session);
    const progressData = await provider.getProgress();
    return NextResponse.json(progressData);
  } catch (error: any) {
    console.error('API GET /api/drive/progress error:', error);
    const isAuth =
      /401|invalid authentication credentials|invalid_grant|unauthorized|token/i.test(
        error.message || ''
      );
    return NextResponse.json(
      {
        error: isAuth
          ? '認証の有効期限が切れました。再度ログインしてください。'
          : error.message || 'Failed to get progress',
        isAuthError: isAuth,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken || (session as any).error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: '認証の有効期限が切れました。再度ログインしてください。', isAuthError: true },
        { status: 401 }
      );
    }

    const body: BookProgress = await request.json();
    if (!body || !body.fileId) {
      return NextResponse.json({ error: 'Invalid progress data' }, { status: 400 });
    }

    const provider = getStorageProvider(session);
    const success = await provider.saveProgress(body);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save to cloud' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/drive/progress error:', error);
    const isAuth =
      /401|invalid authentication credentials|invalid_grant|unauthorized|token/i.test(
        error.message || ''
      );
    return NextResponse.json(
      {
        error: isAuth
          ? '認証の有効期限が切れました。再度ログインしてください。'
          : error.message || 'Failed to save progress',
        isAuthError: isAuth,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken || (session as any).error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: '認証の有効期限が切れました。再度ログインしてください。', isAuthError: true },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const provider = getStorageProvider(session);
    const success = await provider.deleteProgress(fileId);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('API DELETE /api/drive/progress error:', error);
    const isAuth =
      /401|invalid authentication credentials|invalid_grant|unauthorized|token/i.test(
        error.message || ''
      );
    return NextResponse.json(
      {
        error: isAuth
          ? '認証の有効期限が切れました。再度ログインしてください。'
          : error.message || 'Failed to delete progress',
        isAuthError: isAuth,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}
