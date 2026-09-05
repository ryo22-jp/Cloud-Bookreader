'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Server,
  Lock,
  User,
  Globe,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface WebDAVConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebDAVConnectModal({ isOpen, onClose }: WebDAVConnectModalProps) {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) {
      setError('サーバーURLを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('webdav', {
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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                自宅NAS (WebDAV) に接続
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Synology, QNAP, Nextcloud 等に対応
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
              WebDAV サーバーURL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="https://my-nas.synology.me:5006"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              例: <code>https://your-nas.me:5006</code> や <code>http://192.168.1.100:5005</code>
            </p>
          </div>

          {/* ユーザー名 */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              ユーザー名（オプション）
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="ユーザー名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              パスワード（オプション）
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-[var(--text-muted)] leading-relaxed">
            <div className="flex items-center space-x-1.5 font-bold text-amber-500 mb-0.5">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>プライバシーと安全性</span>
            </div>
            パスワードはサーバーやデータベースに一切保存されません。暗号化セッション内でのみ安全に使用されます。
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
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 transition disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>接続テスト中...</span>
                </>
              ) : (
                <span>NASに接続</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
