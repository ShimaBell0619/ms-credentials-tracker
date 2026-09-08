import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  credentialDefinitions,
  getCredentialDefinition,
} from '../domain/credential-catalog.ts';
import {
  createManualCredential,
  updateCredentialFacts,
  type StoredCredential,
} from '../storage/local-credential-store.ts';

interface ManualCredentialDialogProps {
  open: boolean;
  credential: StoredCredential | null;
  onClose: () => void;
}

const defaultDefinitionId = credentialDefinitions[0]?.id ?? '';

export function ManualCredentialDialog({
  open,
  credential,
  onClose,
}: ManualCredentialDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [definitionId, setDefinitionId] = useState(defaultDefinitionId);
  const [firstEarnedOn, setFirstEarnedOn] = useState('');
  const [currentExpiresOn, setCurrentExpiresOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(
    () => getCredentialDefinition(definitionId),
    [definitionId],
  );
  const isNonExpiring = definition?.validityPolicy.type === 'nonExpiring';

  useEffect(() => {
    if (!open) return;
    setDefinitionId(credential?.credentialDefinitionId ?? defaultDefinitionId);
    setFirstEarnedOn(credential?.firstEarnedOn ?? '');
    setCurrentExpiresOn(credential?.currentExpiresOn ?? '');
    setError(null);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, [open, credential]);

  useEffect(() => {
    if (!open && dialogRef.current?.open) dialogRef.current.close();
  }, [open]);

  function closeDialog() {
    dialogRef.current?.close();
    onClose();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const input = {
        credentialDefinitionId: definitionId,
        firstEarnedOn,
        currentExpiresOn: isNonExpiring ? null : currentExpiresOn || null,
      };
      if (credential) {
        updateCredentialFacts(credential.id, input);
      } else {
        createManualCredential(input);
      }
      closeDialog();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : '資格を保存できませんでした。',
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog manual-dialog"
      aria-labelledby="manual-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      <form onSubmit={submit}>
        <div className="import-dialog-header">
          <div>
            <p className="context-label">Manual credential</p>
            <h2 id="manual-dialog-title">{credential ? '資格情報を修正' : '資格を手動で追加'}</h2>
          </div>
          <button className="dialog-close" type="button" aria-label="閉じる" onClick={closeDialog}>
            ×
          </button>
        </div>

        <p className="import-description">
          Transcriptで取り込めない資格や、確認済みの資格情報を手動で登録・修正します。
        </p>

        <div className="manual-form-grid">
          <label className="transcript-field">
            <span>資格</span>
            <select value={definitionId} onChange={(event) => setDefinitionId(event.target.value)} required>
              {credentialDefinitions.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.displayCode ? `${item.displayCode} · ` : ''}{item.canonicalTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="transcript-field">
            <span>取得日</span>
            <input
              type="date"
              value={firstEarnedOn}
              onChange={(event) => setFirstEarnedOn(event.target.value)}
              required
            />
          </label>

          <label className="transcript-field">
            <span>現在の有効期限</span>
            <input
              type="date"
              value={isNonExpiring ? '' : currentExpiresOn}
              onChange={(event) => setCurrentExpiresOn(event.target.value)}
              disabled={isNonExpiring}
              required={!isNonExpiring}
            />
            <small>{isNonExpiring ? 'この資格は期限なしとして扱います。' : 'Microsoft Learnで確認した現在の期限を入力してください。'}</small>
          </label>
        </div>

        {error ? <p className="load-error" role="alert">{error}</p> : null}

        <div className="manual-dialog-actions">
          <button className="secondary-action" type="button" onClick={closeDialog}>キャンセル</button>
          <button className="primary-action" type="submit">{credential ? '修正を保存' : '資格を追加'}</button>
        </div>
      </form>
    </dialog>
  );
}
