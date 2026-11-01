'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Cloud,
  Lock,
  User,
  Globe,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';

interface NextcloudConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NextcloudConnectModal({ isOpen, onClose }: NextcloudConnectModalProps) {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) {
      setError('NextcloudのサーバーURLを入力してください');
      return;
    }
    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('nextcloud', {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        // 接続成功時はリロードしてセッション反映
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Nextcloud に接続
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                セルフホストまたはクラウドのNextcloudと連携
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

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* サーバーURL */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              Nextcloud サーバーURL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="https://cloud.example.com"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              トップURL（例: <code>https://cloud.example.com</code>）を入力すればWebDAVエンドポイントは自動補完されます。
            </p>
          </div>

          {/* ユーザー名 */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="ユーザー名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* パスワード / アプリパスワード */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                パスワード / アプリパスワード <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium flex items-center gap-0.5">
                <KeyRound className="h-3 w-3" />
                アプリパスワード推奨
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          {/* アプリパスワード案内 */}
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-[var(--text-muted)] leading-relaxed space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-sky-600 dark:text-sky-400">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Nextcloudのアプリパスワードについて</span>
            </div>
            <p>
              2段階認証(2FA)をご利用中の方やセキュリティを高めたい方は、Nextcloudの「個人設定」→「セキュリティ」→「デバイスとセッション」から新規アプリパスワードを作成してご利用ください。
            </p>
          </div>

          {/* ボタン */}
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
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>接続テスト中...</span>
                </>
              ) : (
                <span>Nextcloud に接続</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
