import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/cloud-storage';

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

    const provider = getStorageProvider(session);
    const result = await provider.listFiles(folderId, query);

    return NextResponse.json({
      files: result.files,
      currentFolder: result.currentFolder,
      providerId: provider.providerId,
    });
  } catch (error: any) {
    console.error('API /api/drive/files error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
