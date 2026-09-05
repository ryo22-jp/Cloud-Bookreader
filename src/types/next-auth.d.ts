import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    provider?: 'google' | 'azure-ad';
    error?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    provider?: 'google' | 'azure-ad';
    error?: string;
  }
}
