import type { CredentialDerivedStatus } from '../domain/credential-projection';
import { cn } from '../lib/utils';

const statusText: Record<CredentialDerivedStatus, string> = {
  active: '有効',
  renewalAvailable: '更新可能',
  expired: '期限切れ',
  nonExpiring: '期限なし',
};

const dotClass: Record<CredentialDerivedStatus, string> = {
  active: 'bg-success',
  renewalAvailable: 'bg-warning',
  expired: 'bg-danger',
  nonExpiring: 'bg-slate-status',
};

const textClass: Record<CredentialDerivedStatus, string> = {
  active: 'text-success',
  renewalAvailable: 'text-warning',
  expired: 'text-danger',
  nonExpiring: 'text-slate-status',
};

export function CredentialStatus({ status }: { status: CredentialDerivedStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium', textClass[status])}>
      <span className={cn('size-2 shrink-0 rounded-full', dotClass[status])} aria-hidden="true" />
      {statusText[status]}
    </span>
  );
}
