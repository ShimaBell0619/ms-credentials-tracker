import type { CredentialProjection } from '../domain/credential-projection';
import {
  formatDeadlineMeta,
  formatMonthDay,
  renewalNote,
} from '../presentation/credential-view';
import { CredentialStatus } from './CredentialStatus';

interface NextRenewalProps {
  credential: CredentialProjection | null;
  credentialCount: number;
}

export function NextRenewal({ credential, credentialCount }: NextRenewalProps) {
  if (!credential?.currentExpiresOn) {
    const empty = credentialCount === 0;
    return (
      <section
        className="rounded-xl border border-border bg-surface px-5 py-6 shadow-surface sm:px-6"
        aria-label={empty ? '資格データ未登録' : '今後の資格期限なし'}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {empty ? 'Get started' : 'No upcoming deadline'}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          {empty ? 'まだ資格データがありません' : '今後の有効期限はありません'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {empty
            ? 'Microsoft Learn の Transcript PDF を取り込んで資格情報を登録してください。'
            : '登録済み資格の状態は資格一覧で確認できます。'}
        </p>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-surface"
      aria-label="次に対応が必要な資格"
    >
      <div className="grid border-l-4 border-l-warning md:grid-cols-[150px_minmax(0,1fr)_120px]">
        <div className="flex flex-col justify-center border-b border-border bg-warning-soft/60 px-5 py-5 md:border-b-0 md:border-r">
          <span className="text-xs font-semibold text-warning">次の期限</span>
          <strong className="mt-2 font-mono text-3xl tracking-tight text-foreground">
            {formatMonthDay(credential.currentExpiresOn)}
          </strong>
          <small className="mt-1 font-mono text-xs text-muted">
            {formatDeadlineMeta(credential.currentExpiresOn)}
          </small>
        </div>

        <div className="min-w-0 px-5 py-5 sm:px-6">
          <div className="font-mono text-xs font-semibold text-primary">
            {credential.displayCode ?? 'Credential'}
          </div>
          <h2 className="mt-1 text-lg font-semibold leading-7 tracking-tight text-foreground">
            {credential.name}
          </h2>
          <div className="mt-3">
            <CredentialStatus status={credential.status} />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{renewalNote(credential)}</p>
        </div>

        <div className="flex items-baseline justify-start gap-1 border-t border-border bg-surface-muted px-5 py-4 md:flex-col md:items-center md:justify-center md:border-l md:border-t-0">
          <span className="sr-only">有効期限まで</span>
          <strong className="font-mono text-3xl font-semibold tracking-tight text-foreground">
            {credential.daysUntilExpiry ?? 0}
          </strong>
          <span className="text-sm font-medium text-muted">日</span>
        </div>
      </div>
    </section>
  );
}
