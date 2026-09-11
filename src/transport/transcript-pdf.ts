import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { validateTranscriptPdfFile } from '../domain/transcript-pdf.ts';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_TRANSCRIPT_PDF_PAGES = 50;
export const MAX_TRANSCRIPT_PDF_TEXT_CHARS = 1_000_000;

export type TranscriptPdfReadError =
  | 'notPdf'
  | 'tooLarge'
  | 'invalidPdf'
  | 'passwordProtected'
  | 'tooManyPages'
  | 'noText'
  | 'textTooLarge';

export class TranscriptPdfReadException extends Error {
  readonly code: TranscriptPdfReadError;

  constructor(code: TranscriptPdfReadError) {
    super(code);
    this.code = code;
    this.name = 'TranscriptPdfReadException';
  }
}

export interface TranscriptPdfText {
  text: string;
  pageCount: number;
}

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && /password/i.test(`${error.name} ${error.message}`);
}

function textFromItems(items: readonly unknown[]): string {
  let text = '';
  for (const item of items) {
    if (typeof item !== 'object' || item === null || !('str' in item)) continue;
    const value = (item as { str?: unknown }).str;
    if (typeof value !== 'string') continue;
    text += value;
    text += (item as { hasEOL?: unknown }).hasEOL === true ? '\n' : ' ';
  }
  return text.trim();
}

export async function extractTranscriptPdfText(file: File): Promise<TranscriptPdfText> {
  const validation = validateTranscriptPdfFile(file);
  if (!validation.ok) throw new TranscriptPdfReadException(validation.error);

  const data = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder('ascii').decode(data.slice(0, 5));
  if (signature !== '%PDF-') throw new TranscriptPdfReadException('invalidPdf');

  const loadingTask = getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  try {
    const document = await loadingTask.promise;
    if (document.numPages > MAX_TRANSCRIPT_PDF_PAGES) {
      throw new TranscriptPdfReadException('tooManyPages');
    }

    const pages: string[] = [];
    let totalLength = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = textFromItems(content.items);
      totalLength += pageText.length;
      if (totalLength > MAX_TRANSCRIPT_PDF_TEXT_CHARS) {
        throw new TranscriptPdfReadException('textTooLarge');
      }
      pages.push(pageText);
      page.cleanup();
    }

    const text = pages.join('\n\n').trim();
    if (!text) throw new TranscriptPdfReadException('noText');
    return { text, pageCount: document.numPages };
  } catch (error) {
    if (error instanceof TranscriptPdfReadException) throw error;
    if (isPasswordError(error)) throw new TranscriptPdfReadException('passwordProtected');
    throw new TranscriptPdfReadException('invalidPdf');
  } finally {
    await loadingTask.destroy();
  }
}
