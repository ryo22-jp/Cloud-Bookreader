'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, ExternalLink } from 'lucide-react';
import packageJson from '../../package.json';

const CURRENT_VERSION = packageJson.version || '0.2.0';
const CACHE_KEY = 'cloud_reader_latest_release_check';
const DISMISS_KEY = 'cloud_reader_dismissed_release';
const RELEASES_API_URL = 'https://api.github.com/repos/ryo22-jp/Cloud-Bookreader/releases/latest';
const UPDATE_GUIDE_URL = 'https://puzzleout.net/cloud-book-reader';

/**
 * セマンティックバージョン比較（remote > current なら true）
 */
function isNewerVersion(remoteTag: string, current: string): boolean {
  const clean = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const r = clean(remoteTag);
  const c = clean(current);
  const len = Math.max(r.length, c.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

interface ReleaseInfo {
  tagName: string;
  htmlUrl: string;
}

export function UpdateNotifier() {
  const [latestRelease, setLatestRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkUpdate() {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        let release: ReleaseInfo | null = null;

        if (cached) {
          release = JSON.parse(cached);
        } else {
          const res = await fetch(RELEASES_API_URL, {
            headers: { Accept: 'application/vnd.github+json' },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data?.tag_name && data?.html_url) {
            release = {
              tagName: String(data.tag_name),
              htmlUrl: String(data.html_url),
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(release));
          }
        }

        if (!release || cancelled) return;

        const dismissed = sessionStorage.getItem(DISMISS_KEY);
        if (dismissed === release.tagName) return;

        if (isNewerVersion(release.tagName, CURRENT_VERSION)) {
          setLatestRelease(release);
        }
      } catch {
        // オフラインやGitHub API制限時は静かにスキップ
      }
    }

    checkUpdate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latestRelease) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, latestRelease.tagName);
    setLatestRelease(null);
  };

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>
            新しいバージョン（<strong>{latestRelease.tagName}</strong>）が公開されています（現在: v{CURRENT_VERSION}）。
          </span>
          <a
            href={latestRelease.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-0.5 font-bold underline hover:opacity-80"
          >
            <span>更新内容</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="opacity-50">/</span>
          <a
            href={UPDATE_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-0.5 font-bold underline hover:opacity-80"
          >
            <span>アップデート手順</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="通知を閉じる"
          className="rounded-lg p-1 hover:bg-amber-500/20 transition shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
