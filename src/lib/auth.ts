import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import DropboxProvider from 'next-auth/providers/dropbox';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from 'webdav';

/**
 * Googleのリフレッシュトークンを使用してアクセストークンを更新
 */
async function refreshGoogleAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('Error refreshing Google access token:', error);
    return {
      ...token,
      accessToken: '',
      accessTokenExpires: Date.now() + 60 * 1000,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Microsoft (OneDrive) のリフレッシュトークンを使用してアクセストークンを更新
 */
async function refreshMicrosoftAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tenant = process.env.AZURE_AD_TENANT_ID || 'common';
    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID || '',
      client_secret: process.env.AZURE_AD_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('Error refreshing Microsoft access token:', error);
    return {
      ...token,
      accessToken: '',
      accessTokenExpires: Date.now() + 60 * 1000,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Dropbox のリフレッシュトークンを使用してアクセストークンを更新
 */
async function refreshDropboxAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = 'https://api.dropboxapi.com/oauth2/token';
    const params = new URLSearchParams({
      client_id: process.env.DROPBOX_CLIENT_ID || '',
      client_secret: process.env.DROPBOX_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: params.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in || 14400) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('Error refreshing Dropbox access token:', error);
    return {
      ...token,
      accessToken: '',
      accessTokenExpires: Date.now() + 60 * 1000,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * NextcloudのURL候補リストを生成（ベースURLからWebDAVエンドポイントを自動解決）
 */
function normalizeNextcloudUrl(rawUrl: string, username: string): string[] {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, '');

  // すでに /remote.php を含んでいる場合はそのURLを最優先
  if (url.includes('/remote.php')) {
    return [url];
  }

  const candidates: string[] = [];
  // 1. Nextcloud標準エンドポイント: /remote.php/dav/files/<username>
  if (username) {
    candidates.push(`${url}/remote.php/dav/files/${encodeURIComponent(username)}`);
  }
  // 2. Nextcloud互換エンドポイント: /remote.php/webdav
  candidates.push(`${url}/remote.php/webdav`);
  // 3. 入力されたベースURLそのまま
  candidates.push(url);

  return candidates;
}

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorization: {
      params: {
        prompt: 'consent',
        access_type: 'offline',
        response_type: 'code',
        scope: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.appdata',
        ].join(' '),
      },
    },
  }),

  // Nextcloud 認証プロバイダー
  CredentialsProvider({
    id: 'nextcloud',
    name: 'Nextcloud',
    credentials: {
      serverUrl: { label: 'Nextcloud URL', type: 'text' },
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.serverUrl) {
        throw new Error('NextcloudのサーバーURLを入力してください');
      }

      const username = credentials.username?.trim() || '';
      const password = credentials.password || '';
      const candidateUrls = normalizeNextcloudUrl(credentials.serverUrl, username);

      let lastError: any = null;
      let connectedUrl: string | null = null;

      for (const testUrl of candidateUrls) {
        try {
          const client = createClient(testUrl, {
            username,
            password,
          });

          // 接続疎通確認（ルート一覧の取得）
          await client.getDirectoryContents('/', { deep: false });
          connectedUrl = testUrl;
          break;
        } catch (error: any) {
          lastError = error;
        }
      }

      if (!connectedUrl) {
        console.error('Nextcloud authorize error:', lastError);
        throw new Error(
          `Nextcloudに接続できませんでした: ${lastError?.message || 'URLまたはログイン情報（アプリパスワード等）を確認してください'}`
        );
      }

      return {
        id: `nextcloud-${Date.now()}`,
        name: username || 'Nextcloud User',
        email: connectedUrl,
        serverUrl: connectedUrl,
        username,
        password,
      } as any;
    },
  }),

  // 自宅NAS (WebDAV) 認証プロバイダー
  CredentialsProvider({
    id: 'webdav',
    name: 'WebDAV (自宅NAS)',
    credentials: {
      serverUrl: { label: 'Server URL', type: 'text' },
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.serverUrl) {
        throw new Error('サーバーURLを入力してください');
      }

      let url = credentials.serverUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      try {
        const client = createClient(url, {
          username: credentials.username || '',
          password: credentials.password || '',
        });

        // 接続疎通確認（ルート一覧の取得）
        await client.getDirectoryContents('/', { deep: false });

        return {
          id: `webdav-${Date.now()}`,
          name: credentials.username || 'NAS User',
          email: url,
          serverUrl: url,
          username: credentials.username || '',
          password: credentials.password || '',
        } as any;
      } catch (error: any) {
        console.error('WebDAV authorize error:', error);
        throw new Error(
          `WebDAVサーバーに接続できませんでした: ${error.message || 'URLまたはログイン情報を確認してください'}`
        );
      }
    },
  }),

  // Dropbox アクセストークン認証プロバイダー（環境変数未設定時でも即座に接続可能）
  CredentialsProvider({
    id: 'dropbox-token',
    name: 'Dropbox (Access Token)',
    credentials: {
      accessToken: { label: 'Access Token', type: 'password' },
    },
    async authorize(credentials) {
      const token = credentials?.accessToken?.trim();
      if (!token) {
        throw new Error('Dropboxのアクセストークンを入力してください');
      }

      try {
        const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('トークンが無効または期限切れです');
        }

        const profile = await res.json();
        return {
          id: profile.account_id || `dropbox-${Date.now()}`,
          name: profile.name?.display_name || 'Dropbox User',
          email: profile.email || '',
          image: profile.profile_photo_url || null,
          accessToken: token,
        } as any;
      } catch (error: any) {
        console.error('Dropbox token authorize error:', error);
        throw new Error(
          `Dropboxに接続できませんでした: ${error.message || 'アクセストークンを確認してください'}`
        );
      }
    },
  }),
];

// Azure AD (OneDrive) が設定されている場合に追加
if (process.env.AZURE_AD_CLIENT_ID) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common',
      authorization: {
        params: {
          scope: 'openid profile email offline_access Files.Read Files.ReadWrite.AppFolder',
        },
      },
    })
  );
}

// Dropbox OAuth 2.0 プロバイダー
providers.push(
  DropboxProvider({
    clientId: process.env.DROPBOX_CLIENT_ID || '',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
    authorization: {
      url: 'https://www.dropbox.com/oauth2/authorize',
      params: {
        token_access_type: 'offline',
        scope: 'account_info.read files.metadata.read files.content.read files.content.write',
      },
    },
    userinfo: {
      url: 'https://api.dropboxapi.com/2/users/get_current_account',
      async request({ tokens }) {
        const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`Dropbox userinfo error: ${res.statusText}`);
        }
        return await res.json();
      },
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // 初回サインイン時
      if (account && user) {
        if (account.provider === 'webdav' || account.provider === 'nextcloud') {
          const customUser = user as any;
          const provider = account.provider as 'webdav' | 'nextcloud';
          return {
            accessToken: `${provider}-session-token`,
            provider,
            webdavConfig: {
              url: customUser.serverUrl,
              username: customUser.username,
              password: customUser.password,
            },
            user,
          };
        }

        if (account.provider === 'dropbox-token') {
          const customUser = user as any;
          return {
            accessToken: customUser.accessToken,
            accessTokenExpires: Date.now() + 365 * 24 * 60 * 60 * 1000,
            provider: 'dropbox',
            user,
            error: undefined,
          };
        }

        const provider = (
          account.provider === 'azure-ad'
            ? 'azure-ad'
            : account.provider === 'dropbox'
            ? 'dropbox'
            : 'google'
        ) as 'google' | 'azure-ad' | 'dropbox';

        const expiresIn = (account.expires_in as number) || 14400;
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + expiresIn * 1000,
          refreshToken: account.refresh_token ?? token.refreshToken,
          provider,
          user,
          error: undefined,
        };
      }

      // WebDAV / Nextcloud はリフレッシュ不要
      if (token.provider === 'webdav' || token.provider === 'nextcloud') {
        return token;
      }

      // アクセストークンが有効な場合
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // アクセストークンの期限が切れている場合はプロバイダーに応じて更新
      if (token.provider === 'azure-ad') {
        return refreshMicrosoftAccessToken(token);
      }
      if (token.provider === 'dropbox') {
        return refreshDropboxAccessToken(token);
      }
      return refreshGoogleAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as
        | 'google'
        | 'azure-ad'
        | 'dropbox'
        | 'webdav'
        | 'nextcloud';
      session.webdavConfig = token.webdavConfig;
      session.error = token.error as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/',
  },
};
