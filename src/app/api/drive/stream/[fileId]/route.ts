import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const headers: HeadersInit = {
      Authorization: `Bearer ${session.accessToken}`,
    };

    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const driveRes = await fetch(driveUrl, {
      headers,
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      console.error(`Google Drive stream error: ${driveRes.status} ${driveRes.statusText}`);
      return new NextResponse(`Error fetching file: ${driveRes.statusText}`, {
        status: driveRes.status,
      });
    }

    // レスポンスヘッダーの構成
    const responseHeaders = new Headers();
    responseHeaders.set('Accept-Ranges', 'bytes');

    const contentType = driveRes.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);

    const contentLength = driveRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);

    const contentRange = driveRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    const contentDisposition = driveRes.headers.get('content-disposition');
    if (contentDisposition) responseHeaders.set('Content-Disposition', contentDisposition);

    // キャッシュ制御（プライベート、短期）
    responseHeaders.set('Cache-Control', 'private, max-age=3600');

    return new NextResponse(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('API /api/drive/stream/[fileId] error:', error);
    return NextResponse.json(
      { error: error.message || 'Stream proxy error' },
      { status: 500 }
    );
  }
}
