import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createClient } from 'webdav';

/**
 * Googleのリフレッシュトークンを使用してアクセストークンを更新
 */
async function refreshGoogleAccessToken(token: any) {
  try {
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
    };
  } catch (error) {
    console.error('Error refreshing Google access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Microsoft (OneDrive) のリフレッシュトークンを使用してアクセストークンを更新
 */
async function refreshMicrosoftAccessToken(token: any) {
  try {
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
    };
  } catch (error) {
    console.error('Error refreshing Microsoft access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
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

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // 初回サインイン時
      if (account && user) {
        if (account.provider === 'webdav') {
          const webdavUser = user as any;
          return {
            accessToken: 'webdav-session-token',
            provider: 'webdav' as const,
            webdavConfig: {
              url: webdavUser.serverUrl,
              username: webdavUser.username,
              password: webdavUser.password,
            },
            user,
          };
        }

        const provider = (account.provider === 'azure-ad' ? 'azure-ad' : 'google') as
          | 'google'
          | 'azure-ad';
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          refreshToken: account.refresh_token,
          provider,
          user,
        };
      }

      // WebDAV はリフレッシュ不要
      if (token.provider === 'webdav') {
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
      return refreshGoogleAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as 'google' | 'azure-ad' | 'webdav';
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
