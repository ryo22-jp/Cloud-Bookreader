import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/storage';

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

    const rangeHeader = request.headers.get('range');
    const provider = getStorageProvider(session);

    return await provider.streamFile(fileId, rangeHeader);
  } catch (error: any) {
    console.error('API /api/drive/stream/[fileId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Stream proxy error' },
      { status: 500 }
    );
  }
}
