import type { CredentialProjection } from '../domain/credential-projection';
import {
  formatDeadlineMeta,
  formatMonthDay,
  renewalNote,
} from '../presentation/credential-view';
import { Button } from './ui/button';
import { CredentialStatus } from './CredentialStatus';

interface PrimaryCredentialStateProps {
  credentials: CredentialProjection[];
  nextDeadline: CredentialProjection | null;
}

function ExpiredNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-l-2 border-danger bg-danger-soft/45 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-foreground">
        <strong className="font-semibold text-danger">期限切れの資格が{count}件あります。</strong>
        <span className="ml-1 text-muted">更新対象とは分けて確認してください。</span>
      </span>
      <a className="shrink-0 text-xs font-semibold text-danger no-underline hover:underline" href="#credentials">
        資格一覧で確認
      </a>
    </div>
  );
}

export function PrimaryCredentialState({
  credentials,
  nextDeadline,
}: PrimaryCredentialStateProps) {
  const expired = credentials.filter((credential) => credential.status === 'expired');
  const renewalAvailable = credentials.find(
    (credential) => credential.status === 'renewalAvailable' && credential.currentExpiresOn,
  );
  const credential = renewalAvailable ?? nextDeadline;

  if (!credential?.currentExpiresOn && expired.length > 0) {
    const firstExpired = expired[0];
    return (
      <section
        className="rounded-xl border border-danger/25 bg-surface shadow-surface"
        aria-label="期限切れの資格"
      >
        <div className="grid gap-5 border-l-4 border-l-danger px-5 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-danger">対応が必要</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              期限切れの資格があります
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {expired.length}件が期限切れです。最初に期限を迎えた資格は
              <strong className="font-semibold text-foreground">
                {firstExpired.displayCode ?? firstExpired.name}
              </strong>
              （{firstExpired.currentExpiresOn ? formatMonthDay(firstExpired.currentExpiresOn) : '期限不明'}）です。
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <a href="#credentials">資格一覧で確認</a>
          </Button>
        </div>
      </section>
    );
  }

  if (!credential?.currentExpiresOn) {
    const allNonExpiring = credentials.every((item) => item.status === 'nonExpiring');
    return (
      <section
        className="rounded-xl border border-border bg-surface px-5 py-6 shadow-surface sm:px-6"
        aria-label={allNonExpiring ? '更新対象なし' : '有効期限情報なし'}
      >
        <p className="text-xs font-semibold text-muted">
          {allNonExpiring ? '更新対象なし' : '期限情報を確認できません'}
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          {allNonExpiring
            ? '更新が必要な資格はありません'
            : '今後の有効期限を確認できる資格がありません'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {allNonExpiring
            ? `登録済み${credentials.length}件は、いずれも期限のない資格です。`
            : '必要に応じてTranscript PDFを再取り込みし、保存している資格情報を確認してください。'}
        </p>
      </section>
    );
  }

  const canRenew = credential.status === 'renewalAvailable';
  return (
    <div className="grid gap-3">
      <section
        className="overflow-hidden rounded-xl border border-border bg-surface shadow-surface"
        aria-label="次に対応が必要な資格"
      >
        <div
          className={
            canRenew
              ? 'grid border-l-4 border-l-primary md:grid-cols-[150px_minmax(0,1fr)_120px]'
              : 'grid border-l-4 border-l-warning md:grid-cols-[150px_minmax(0,1fr)_120px]'
          }
        >
          <div
            className={
              canRenew
                ? 'flex flex-col justify-center border-b border-border bg-primary-soft/70 px-5 py-5 md:border-b-0 md:border-r'
                : 'flex flex-col justify-center border-b border-border bg-warning-soft/60 px-5 py-5 md:border-b-0 md:border-r'
            }
          >
            <span className={canRenew ? 'text-xs font-semibold text-primary' : 'text-xs font-semibold text-warning'}>
              {canRenew ? '更新できます' : '次の期限'}
            </span>
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
            {canRenew ? (
              <div className="mt-4">
                <Button asChild variant="secondary" size="sm">
                  <a href="#schedule">更新予定を確認</a>
                </Button>
              </div>
            ) : null}
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
      <ExpiredNotice count={expired.length} />
    </div>
  );
}
