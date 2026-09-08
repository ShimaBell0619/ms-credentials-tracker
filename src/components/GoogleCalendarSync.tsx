import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localDateToIso } from '../domain/credential-projection.ts';
import {
  buildGoogleCalendarDesiredEvents,
  fingerprintGoogleCalendarDesiredEvents,
  GoogleCalendarRestApi,
  GoogleCalendarSyncError,
  syncGoogleCalendar,
} from '../integrations/google-calendar.ts';
import {
  GoogleAuthorizationError,
  loadGoogleIdentityServices,
  requestGoogleCalendarAccessToken,
} from '../integrations/google-identity.ts';
import {
  loadGoogleCalendarIntegrationState,
  saveGoogleCalendarIntegrationState,
  type GoogleCalendarIntegrationState,
} from '../storage/google-calendar-store.ts';
import {
  CREDENTIAL_STORAGE_CHANGED_EVENT,
  loadStoredCredentials,
} from '../storage/local-credential-store.ts';
import '../calendar-sync.css';

type AuthReadiness = 'idle' | 'loading' | 'ready' | 'error';
type SyncPhase = 'idle' | 'authorizing' | 'syncing' | 'success' | 'error';

function formatLastSynced(value: string | null): string {
  if (!value) return 'まだ同期していません';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '同期履歴あり';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function GoogleCalendarSync() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [credentials, setCredentials] = useState(() => loadStoredCredentials());
  const [integration, setIntegration] = useState(() => loadGoogleCalendarIntegrationState());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authReadiness, setAuthReadiness] = useState<AuthReadiness>('idle');
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const desiredEvents = useMemo(
    () => buildGoogleCalendarDesiredEvents(credentials, localDateToIso(new Date())),
    [credentials],
  );
  const desiredFingerprint = useMemo(
    () => fingerprintGoogleCalendarDesiredEvents(desiredEvents),
    [desiredEvents],
  );
  const credentialCount = useMemo(
    () => new Set(desiredEvents.map((event) => event.credentialId)).size,
    [desiredEvents],
  );
  const needsSync =
    desiredEvents.length > 0 &&
    (!integration.calendarId || integration.lastDesiredFingerprint !== desiredFingerprint);

  function openDialog() {
    setMessage(null);
    setSyncPhase('idle');
    setIntegration(loadGoogleCalendarIntegrationState());
    setDialogOpen(true);
    dialogRef.current?.showModal();
  }

  useEffect(() => {
    setPortalTarget(document.querySelector<HTMLElement>('.header-meta'));
  }, []);

  useEffect(() => {
    const refresh = () => setCredentials(loadStoredCredentials());
    window.addEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CREDENTIAL_STORAGE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!dialogOpen || !clientId) return;
    let cancelled = false;
    setAuthReadiness('loading');
    loadGoogleIdentityServices()
      .then(() => {
        if (!cancelled) setAuthReadiness('ready');
      })
      .catch(() => {
        if (!cancelled) setAuthReadiness('error');
      });
    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  async function synchronize() {
    if (!clientId || authReadiness !== 'ready') return;
    setMessage(null);
    setSyncPhase('authorizing');

    try {
      const accessToken = await requestGoogleCalendarAccessToken(clientId);
      setSyncPhase('syncing');
      const result = await syncGoogleCalendar(
        new GoogleCalendarRestApi(accessToken),
        desiredEvents,
        integration.calendarId,
      );
      const nextState: GoogleCalendarIntegrationState = {
        version: 1,
        calendarId: result.calendarId,
        lastSyncedAt: new Date().toISOString(),
        lastResult: {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
          unchanged: result.unchanged,
        },
        lastDesiredFingerprint: desiredFingerprint,
      };
      saveGoogleCalendarIntegrationState(nextState);
      setIntegration(nextState);
      setSyncPhase('success');
      setMessage(
        `同期しました。作成 ${result.created}件・更新 ${result.updated}件・削除 ${result.deleted}件・変更なし ${result.unchanged}件。`,
      );
    } catch (error) {
      if (error instanceof GoogleCalendarSyncError && error.calendarId) {
        const partialState: GoogleCalendarIntegrationState = {
          ...integration,
          calendarId: error.calendarId,
        };
        saveGoogleCalendarIntegrationState(partialState);
        setIntegration(partialState);
      }

      setSyncPhase('error');
      if (error instanceof GoogleAuthorizationError) {
        setMessage(
          error.kind === 'cancelled'
            ? 'Google認証がキャンセルされました。カレンダーは変更していません。'
            : 'Google認証に失敗しました。もう一度同期を実行してください。',
        );
      } else if (error instanceof GoogleCalendarSyncError) {
        setMessage(
          error.stage === 'calendar'
            ? '専用Googleカレンダーを確認・作成できませんでした。資格データは変更していません。'
            : 'Googleカレンダー同期が途中で失敗しました。再度「同期する」を実行すると安全に再照合します。',
        );
      } else {
        setMessage('Googleカレンダー同期に失敗しました。資格データは変更していません。');
      }
    }
  }

  const busy = syncPhase === 'authorizing' || syncPhase === 'syncing';
  const syncButtonLabel =
    syncPhase === 'authorizing'
      ? 'Google認証中…'
      : syncPhase === 'syncing'
        ? '同期中…'
        : 'Googleカレンダーと同期';

  const trigger = (
    <>
      <button className="calendar-trigger" type="button" onClick={openDialog}>
        {needsSync && integration.calendarId ? 'カレンダーを更新' : 'Googleカレンダー'}
      </button>
      {needsSync ? <span className="calendar-sync-needed">未同期</span> : null}
    </>
  );

  return (
    <>
      {portalTarget ? createPortal(trigger, portalTarget) : null}

      <dialog
        ref={dialogRef}
        className="calendar-sync-dialog"
        aria-labelledby="calendar-sync-title"
        onClose={() => setDialogOpen(false)}
      >
        <div className="calendar-sync-header">
          <div>
            <p className="context-label">External reminders</p>
            <h2 id="calendar-sync-title">Googleカレンダー同期</h2>
          </div>
          <form method="dialog">
            <button className="calendar-sync-close" type="submit" aria-label="閉じる">
              ×
            </button>
          </form>
        </div>

        <div className="calendar-sync-body">
          <p className="calendar-sync-description">
            資格の更新可能日と有効期限を専用カレンダーへ一方向同期します。更新可能日の通知は28日前・7日前・当日に届きます。
          </p>

          {needsSync && integration.calendarId ? (
            <p className="calendar-sync-change-note" role="status">
              資格情報が前回同期時点から変わっています。明示的に同期するとGoogleカレンダーへ反映されます。
            </p>
          ) : null}

          <dl className="calendar-sync-summary">
            <div>
              <dt>同期対象</dt>
              <dd>{credentialCount}資格 · {desiredEvents.length}予定</dd>
            </div>
            <div>
              <dt>同期先</dt>
              <dd>Microsoft Credentials Tracker</dd>
            </div>
            <div>
              <dt>最終同期</dt>
              <dd>{formatLastSynced(integration.lastSyncedAt)}</dd>
            </div>
          </dl>

          {!clientId ? (
            <p className="calendar-sync-warning" role="note">
              Google OAuth クライアントが未設定です。VITE_GOOGLE_CLIENT_ID を設定すると同期を有効化できます。
            </p>
          ) : authReadiness === 'error' ? (
            <p className="calendar-sync-warning" role="alert">
              Google認証ライブラリを読み込めませんでした。ネットワーク接続を確認してください。
            </p>
          ) : null}

          <div className="calendar-sync-policy">
            <strong>同期時の扱い</strong>
            <ul>
              <li>このアプリが管理する予定だけを作成・更新・削除します。</li>
              <li>Google側の予定変更を資格データへ逆同期しません。</li>
              <li>アクセストークンはブラウザへ長期保存しません。</li>
            </ul>
          </div>

          <div className="calendar-sync-actions">
            <button
              className="primary-action"
              type="button"
              onClick={synchronize}
              disabled={!clientId || authReadiness !== 'ready' || busy}
            >
              {syncButtonLabel}
            </button>
            {clientId && authReadiness === 'loading' ? <span>Google認証を準備中…</span> : null}
          </div>

          {message ? (
            <p
              className={
                syncPhase === 'error' ? 'calendar-sync-message is-error' : 'calendar-sync-message'
              }
              role={syncPhase === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
