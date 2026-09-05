import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStorageProvider } from '@/lib/cloud-storage';
import { AppConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const provider = getStorageProvider(session);
    const config = await provider.getConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('API GET /api/drive/config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get config' },
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

    const body: AppConfig = await request.json();
    const provider = getStorageProvider(session);
    const success = await provider.saveConfig(body);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API POST /api/drive/config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save config' },
      { status: 500 }
    );
  }
}
