import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFileMetadata } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = params;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    const metadata = await getFileMetadata(session.accessToken, fileId);
    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('API /api/drive/files/[fileId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file metadata' },
      { status: 500 }
    );
  }
}
