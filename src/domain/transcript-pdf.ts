export const MAX_TRANSCRIPT_PDF_BYTES = 10 * 1024 * 1024;

export type TranscriptPdfValidationError = 'notPdf' | 'tooLarge';

export type TranscriptPdfValidation =
  | { ok: true }
  | { ok: false; error: TranscriptPdfValidationError };

export interface TranscriptPdfFileMetadata {
  name: string;
  type: string;
  size: number;
}

export function validateTranscriptPdfFile(
  file: TranscriptPdfFileMetadata,
): TranscriptPdfValidation {
  const hasPdfExtension = file.name.toLocaleLowerCase('en-US').endsWith('.pdf');
  const hasSupportedType = file.type === '' || file.type === 'application/pdf';

  if (!hasPdfExtension || !hasSupportedType) {
    return { ok: false, error: 'notPdf' };
  }
  if (file.size <= 0 || file.size > MAX_TRANSCRIPT_PDF_BYTES) {
    return { ok: false, error: 'tooLarge' };
  }
  return { ok: true };
}
