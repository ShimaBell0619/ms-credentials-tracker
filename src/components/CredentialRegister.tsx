import type { CredentialProjection } from '../domain/credential-projection';
import { formatFullDate, renewalNote } from '../presentation/credential-view';
import { CredentialStatus } from './CredentialStatus';

export function CredentialRegister({ credentials }: { credentials: CredentialProjection[] }) {
  return (
    <section id="credentials" className="scroll-mt-20" aria-labelledby="credentials-title">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 id="credentials-title" className="text-xl font-semibold tracking-tight text-foreground">
          資格一覧
        </h2>
        <span className="text-sm font-medium text-muted">{credentials.length}件</span>
      </div>

      {credentials.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-surface md:block">
            <table className="credential-table w-full border-collapse text-left">
              <thead className="bg-surface-muted text-xs font-semibold text-muted">
                <tr>
                  <th className="px-5 py-3" scope="col">資格</th>
                  <th className="px-4 py-3" scope="col">取得日</th>
                  <th className="px-4 py-3" scope="col">状態</th>
                  <th className="px-5 py-3" scope="col">有効期限 / 次回</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {credentials.map((credential) => (
                  <tr className="align-top transition-colors hover:bg-surface-muted/60" key={credential.id}>
                    <td className="px-5 py-4">
                      <span className="block font-mono text-xs font-semibold text-primary">
                        {credential.displayCode ?? '—'}
                      </span>
                      <strong className="mt-1 block max-w-xl text-sm font-semibold leading-6 text-foreground">
                        {credential.name}
                      </strong>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-foreground">
                      {formatFullDate(credential.firstEarnedOn)}
                    </td>
                    <td className="px-4 py-4">
                      <CredentialStatus status={credential.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block font-mono text-xs font-medium text-foreground">
                        {formatFullDate(credential.currentExpiresOn)}
                      </span>
                      <small className="mt-1 block text-xs leading-5 text-muted">
                        {renewalNote(credential)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-surface md:hidden">
            {credentials.map((credential) => (
              <article className="p-4" key={`mobile-${credential.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {credential.displayCode ?? '—'}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold leading-6 text-foreground">{credential.name}</h3>
                  </div>
                  <CredentialStatus status={credential.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-xs">
                  <div>
                    <dt className="text-muted">取得日</dt>
                    <dd className="mt-1 font-mono font-medium text-foreground">{formatFullDate(credential.firstEarnedOn)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">有効期限</dt>
                    <dd className="mt-1 font-mono font-medium text-foreground">{formatFullDate(credential.currentExpiresOn)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted">次回</dt>
                    <dd className="mt-1 leading-5 text-foreground">{renewalNote(credential)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-8 text-sm text-muted">
          <strong className="block font-semibold text-foreground">登録済みの資格はありません</strong>
          <span className="mt-1 block">Transcript PDFを取り込んで資格情報を登録してください。</span>
        </div>
      )}
    </section>
  );
}
