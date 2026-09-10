import { useState } from 'react';
import { OPEN_GOOGLE_CALENDAR_EVENT } from './GoogleCalendarSync';
import { OPEN_TRANSCRIPT_IMPORT_EVENT } from './TranscriptImport';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface DataAndIntegrationsProps {
  credentialCount: number;
}

export function DataAndIntegrations({ credentialCount }: DataAndIntegrationsProps) {
  const [open, setOpen] = useState(false);

  function openTool(eventName: string) {
    setOpen(false);
    window.setTimeout(() => window.dispatchEvent(new Event(eventName)), 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(true)}>
        データと連携
      </Button>

      <DialogContent className="max-w-lg p-0">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <DialogHeader>
            <DialogTitle>データと連携</DialogTitle>
            <DialogDescription>
              資格情報の取り込みと、外部カレンダーへの同期をここから管理します。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="divide-y divide-border px-5 sm:px-6">
          <section className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">資格データ</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                {credentialCount > 0
                  ? `${credentialCount}件をこのブラウザに保存しています。Transcript PDFを再取り込みして更新できます。`
                  : 'Microsoft LearnのTranscript PDFを取り込み、このブラウザに保存します。'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => openTool(OPEN_TRANSCRIPT_IMPORT_EVENT)}
            >
              Transcriptを取り込む
            </Button>
          </section>

          <section className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Googleカレンダー</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                更新開始日と有効期限を専用カレンダーへ一方向同期します。
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => openTool(OPEN_GOOGLE_CALENDAR_EVENT)}
            >
              Googleカレンダー
            </Button>
          </section>
        </div>

        <p className="border-t border-border bg-surface-muted px-5 py-3 text-xs leading-5 text-muted sm:px-6">
          資格データはこのブラウザに保存されます。Google側の予定変更を資格データへ逆同期しません。
        </p>
      </DialogContent>
    </Dialog>
  );
}
