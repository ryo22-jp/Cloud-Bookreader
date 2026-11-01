'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Cloud,
  KeyRound,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  LogIn,
} from 'lucide-react';

interface DropboxConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DropboxConnectModal({ isOpen, onClose }: DropboxConnectModalProps) {
  const [accessToken, setAccessToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthLogin = async () => {
    setIsOAuthLoading(true);
    setError(null);
    try {
      await signIn('dropbox', { callbackUrl: '/' });
    } catch (err: any) {
      setError(err.message || 'OAuthログインの開始に失敗しました');
      setIsOAuthLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      setError('Dropboxのアクセストークンを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('dropbox-token', {
        accessToken: accessToken.trim(),
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || '接続に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Dropbox に接続
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                OAuthログインまたはアクセストークンで連携
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 方法1: OAuth 2.0 ワンクリックログイン */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              方法1: Dropbox アカウントでサインイン（OAuth設定済みの方）
            </label>
            <button
              type="button"
              onClick={handleOAuthLogin}
              disabled={isOAuthLoading || isLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-sm"
            >
              {isOAuthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>Dropbox でサインイン (OAuth)</span>
            </button>
            <p className="text-[11px] text-[var(--text-muted)]">
              ※Vercel環境変数に <code>DROPBOX_CLIENT_ID</code> / <code>DROPBOX_CLIENT_SECRET</code> を設定済みの場合はこちらからワンクリックでログインできます。
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border-color)]"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[var(--text-muted)] font-semibold">
              または（環境変数不要）
            </span>
            <div className="flex-grow border-t border-[var(--border-color)]"></div>
          </div>

          {/* 方法2: アクセストークンで即座に接続 */}
          <form onSubmit={handleTokenSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                方法2: アクセストークンで直接接続
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  placeholder="sl.B... (Generated access token)"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isLoading || isOAuthLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-[11px] text-[var(--text-muted)] leading-relaxed space-y-1.5">
              <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center space-x-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>トークンの取得手順（1分・環境変数不要）</span>
                </span>
                <a
                  href="https://www.dropbox.com/developers/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-0.5 underline hover:opacity-80"
                >
                  <span>App Console</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                <li>Dropbox App Console で <b>Create app</b>（Scoped access / Full Dropbox）を作成</li>
                <li><b>Permissions</b> タブで <code>files.metadata.read</code>, <code>files.content.read</code>, <code>files.content.write</code> にチェックして Submit</li>
                <li><b>Settings</b> タブの「OAuth 2」→ <b>Generated access token</b> の「Generate」を押して発行された文字列を貼り付け</li>
              </ol>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isLoading || !accessToken.trim()}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white transition disabled:opacity-50 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>接続確認中...</span>
                  </>
                ) : (
                  <span>トークンで接続</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
