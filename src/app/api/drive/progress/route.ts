import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';
import { BookProgress } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = getStorageProvider(session);
    const progressData = await provider.getProgress();
    return NextResponse.json(progressData);
  } catch (error: any) {
    console.error('API GET /api/drive/progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to save progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to delete progress' },
      { status: 500 }
    );
  }
}
