import { useEffect, useMemo, useState } from 'react';
import { localDateToIso } from '../domain/credential-projection.ts';
import { findReusableGoogleCalendarId } from '../integrations/google-calendar-discovery.ts';
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
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export const OPEN_GOOGLE_CALENDAR_EVENT = 'ms-credentials-tracker:open-google-calendar';

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
  const needsSync = integration.calendarId
    ? integration.lastDesiredFingerprint !== desiredFingerprint
    : desiredEvents.length > 0;

  useEffect(() => {
    const openDialog = () => {
      setMessage(null);
      setSyncPhase('idle');
      setIntegration(loadGoogleCalendarIntegrationState());
      setDialogOpen(true);
    };
    window.addEventListener(OPEN_GOOGLE_CALENDAR_EVENT, openDialog);
    return () => window.removeEventListener(OPEN_GOOGLE_CALENDAR_EVENT, openDialog);
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
      const reusableCalendarId = await findReusableGoogleCalendarId(accessToken);
      const result = await syncGoogleCalendar(
        new GoogleCalendarRestApi(accessToken),
        desiredEvents,
        reusableCalendarId ?? integration.calendarId,
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
  const connectionState =
    syncPhase === 'error'
      ? { label: '同期失敗', dot: 'bg-danger', text: 'text-danger' }
      : !integration.calendarId
        ? { label: '未接続', dot: 'bg-slate-status', text: 'text-muted' }
        : needsSync
          ? { label: '変更あり', dot: 'bg-warning', text: 'text-warning' }
          : { label: '同期済み', dot: 'bg-success', text: 'text-success' };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-xl p-0">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <DialogHeader>
            <p className="text-xs font-semibold text-primary">予定の外部連携</p>
            <DialogTitle>Googleカレンダー同期</DialogTitle>
            <DialogDescription>
              資格の更新可能日と有効期限を専用カレンダーへ一方向同期します。更新可能日の通知は28日前・7日前・当日に届きます。
            </DialogDescription>
          </DialogHeader>
          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold ${connectionState.text}`}>
            <span className={`size-1.5 rounded-full ${connectionState.dot}`} aria-hidden="true" />
            {connectionState.label}
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6">
          {needsSync && integration.calendarId ? (
            <p
              className="rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-sm leading-6 text-foreground"
              role="status"
            >
              資格情報が前回同期時点から変わっています。同期するとGoogleカレンダーへ反映されます。
            </p>
          ) : null}

          <dl className="grid divide-y divide-border rounded-lg border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-3">
              <dt className="text-[10px] font-semibold text-muted">状態</dt>
              <dd className={`mt-1 text-sm font-semibold ${connectionState.text}`}>
                {connectionState.label}
              </dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-semibold text-muted">同期対象</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {credentialCount}資格 · {desiredEvents.length}予定
              </dd>
            </div>
            <div className="p-3">
              <dt className="text-[10px] font-semibold text-muted">最終同期</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatLastSynced(integration.lastSyncedAt)}
              </dd>
            </div>
          </dl>

          {!clientId ? (
            <p
              className="rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-sm leading-6 text-warning"
              role="note"
            >
              Google OAuth クライアントが未設定です。VITE_GOOGLE_CLIENT_ID を設定すると同期を有効化できます。
            </p>
          ) : authReadiness === 'error' ? (
            <p
              className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm leading-6 text-danger"
              role="alert"
            >
              Google認証ライブラリを読み込めませんでした。ネットワーク接続を確認してください。
            </p>
          ) : null}

          <div>
            <strong className="text-sm font-semibold text-foreground">同期時の扱い</strong>
            <ul className="mt-2 grid gap-1.5 pl-5 text-sm leading-6 text-muted">
              <li className="list-disc">このアプリが管理する予定だけを作成・更新・削除します。</li>
              <li className="list-disc">Google側の予定変更を資格データへ逆同期しません。</li>
              <li className="list-disc">アクセストークンはブラウザへ長期保存しません。</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={synchronize}
              disabled={!clientId || authReadiness !== 'ready' || busy}
            >
              {syncButtonLabel}
            </Button>
            {clientId && authReadiness === 'loading' ? (
              <span className="text-xs text-muted">Google認証を準備中…</span>
            ) : null}
          </div>

          {message ? (
            <p
              className={
                syncPhase === 'error'
                  ? 'rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm leading-6 text-danger'
                  : 'rounded-md border border-success/20 bg-success-soft px-3 py-2 text-sm leading-6 text-success'
              }
              role={syncPhase === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
