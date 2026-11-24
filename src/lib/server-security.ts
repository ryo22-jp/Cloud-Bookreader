import dns from 'dns/promises';
import net from 'net';

/**
 * プライベートIP・ループバック・リンクローカル等の危険なIPアドレスかどうかを判定
 */
function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4-mapped IPv6 (例: ::ffff:127.0.0.1) の正規化
  const normalized = ip.toLowerCase().startsWith('::ffff:') ? ip.slice(7) : ip;

  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Cloud Metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // Multicast / Reserved
    return false;
  }

  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (/^fe[89ab]/i.test(lower)) return true;
    if (lower.startsWith('ff')) return true;
    return false;
  }

  return true;
}

/**
 * WebDAV / Nextcloud の接続先URLを検証（サーバー専用: SSRF対策・本番HTTPS強制）
 */
export async function validateWebDAVUrl(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('サーバーURLを入力してください');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('有効なURL形式ではありません');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const allowInsecure = process.env.ALLOW_INSECURE_WEBDAV === 'true';
  const allowPrivate = process.env.ALLOW_PRIVATE_WEBDAV === 'true';

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('http:// または https:// のURLのみ接続できます');
  }

  if (isProd && !allowInsecure && parsed.protocol !== 'https:') {
    throw new Error('セキュリティ保護のため、本番環境では https:// のURLのみ接続できます');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL内にユーザー名やパスワードを含めないでください');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 環境変数 ALLOWED_WEBDAV_HOSTS が設定されている場合はホワイトリスト照合
  const allowedHostsEnv = process.env.ALLOWED_WEBDAV_HOSTS?.trim();
  if (allowedHostsEnv) {
    const allowedHosts = allowedHostsEnv
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
      throw new Error('許可されていないサーバーホストです');
    }
  }

  // 本番環境ではプライベートネットワーク・ループバック・クラウドメタデータへのSSRFを遮断
  if (isProd && !allowPrivate) {
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      throw new Error('ローカルまたは内部ネットワークのアドレスには接続できません');
    }

    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) {
        throw new Error('プライベートIPまたは予約済みIPアドレスには接続できません');
      }
    } else {
      try {
        const records = await dns.lookup(hostname, { all: true });
        if (!records || records.length === 0) {
          throw new Error('ホスト名を解決できませんでした');
        }
        for (const rec of records) {
          if (isPrivateOrReservedIp(rec.address)) {
            throw new Error('内部ネットワークを指すホストには接続できません');
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('内部ネットワーク') || err?.message?.includes('ホスト名')) {
          throw err;
        }
        throw new Error('ホスト名の解決に失敗しました');
      }
    }
  }

  return parsed.toString().replace(/\/+$/, '');
}

/**
 * 許可されたメールアドレスかどうかを判定（ALLOWED_EMAILS 未設定時は全員許可で後方互換維持）
 */
export function isEmailAllowed(email?: string | null): boolean {
  const allowedEnv = process.env.ALLOWED_EMAILS?.trim();
  if (!allowedEnv) {
    return true;
  }
  if (!email) {
    return false;
  }
  const allowedList = allowedEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowedList.length === 0) {
    return true;
  }
  return allowedList.includes(email.trim().toLowerCase());
}
