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
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file metadata' },
      { status: 500 }
    );
  }
}
