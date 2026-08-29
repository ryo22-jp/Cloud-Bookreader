'use client';

// Google Picker API の動的読み込みとフォルダピッカーの起動ヘルパー

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let isGapiLoaded = false;
let isPickerLoaded = false;

export async function loadGooglePickerApi(): Promise<void> {
  if (isGapiLoaded && isPickerLoaded) return;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // 1. gapi スクリプトの読み込み
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        isGapiLoaded = true;
        window.gapi.load('picker', () => {
          isPickerLoaded = true;
          resolve();
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    } else if (!isPickerLoaded) {
      window.gapi.load('picker', () => {
        isPickerLoaded = true;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export interface SelectedFolder {
  id: string;
  name: string;
}

export async function openFolderPicker(
  accessToken: string,
  apiKey: string = '',
  appId: string = ''
): Promise<SelectedFolder | null> {
  await loadGooglePickerApi();

  return new Promise((resolve) => {
    if (!window.google?.picker) {
      console.error('Google Picker not loaded');
      resolve(null);
      return;
    }

    // フォルダのみを選択可能なDocsViewを作成
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');

    const builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setTitle('本棚にするフォルダを選択してください')
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          if (doc) {
            resolve({
              id: doc.id,
              name: doc.name,
            });
            return;
          }
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      });

    if (appId) {
      builder.setAppId(appId);
    }

    const picker = builder.build();
    picker.setVisible(true);
  });
}
