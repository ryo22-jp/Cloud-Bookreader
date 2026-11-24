/**
 * 許可された安全なストリーミング用 Content-Type のみを通す（HTML/SVGによるXSS防止）
 */
const SAFE_STREAM_MIME_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-zip',
  'application/epub+zip',
  'application/octet-stream',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
]);

export function sanitizeSafeContentType(rawContentType: string | null): string {
  if (!rawContentType) {
    return 'application/octet-stream';
  }
  const baseMime = rawContentType.split(';')[0].trim().toLowerCase();
  return SAFE_STREAM_MIME_TYPES.has(baseMime) ? baseMime : 'application/octet-stream';
}

/**
 * ストリーミングAPIレスポンスにXSS・コンテンツスニッフィング防御ヘッダーを付与
 */
export function applyStreamSecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  headers.set('Content-Disposition', 'attachment');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
}

/**
 * Google Drive / OneDrive 等のファイルID・フォルダIDの安全性を検証
 */
export function assertSafeCloudId(id: string, label: string = 'ID'): string {
  const trimmed = (id || '').trim();
  if (!trimmed) {
    throw new Error(`Invalid ${label}`);
  }
  // パストラバーサルやクエリインジェクションに悪用され得る文字を拒否
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes("'") ||
    trimmed.includes('"') ||
    trimmed.includes('\0') ||
    /[\r\n]/.test(trimmed)
  ) {
    throw new Error(`Invalid characters in ${label}`);
  }
  return trimmed;
}

/**
 * WebDAVパスのパストラバーサル（..）およびNULLバイトを検証・正規化
 */
export function normalizeSafeWebDAVPath(rawPath: string): string {
  if (rawPath.includes('\0')) {
    throw new Error('Invalid WebDAV path');
  }
  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error('Path traversal is not allowed');
    }
  }
  return normalized;
}
