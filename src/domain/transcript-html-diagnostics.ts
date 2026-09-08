export interface TranscriptHtmlDiagnostics {
  htmlLength: number;
  bodyTextLength: number;
  documentLang: string | null;
  scriptCount: number;
  externalScriptCount: number;
  inlineScriptCount: number;
  iframeCount: number;
  containsMicrosoftCertified: boolean;
  containsAppliedSkills: boolean;
  containsPassedExams: boolean;
  containsEarnedOn: boolean;
  containsJapaneseDate: boolean;
  containsHydrationData: boolean;
  containsTranscriptToken: boolean;
  containsCredentialToken: boolean;
  containsApiHint: boolean;
  containsClientRuntimeHint: boolean;
  containsIframeTranscriptHint: boolean;
  containsNotFoundOrDeniedMarker: boolean;
}

function countMatches(value: string, pattern: RegExp): number {
  return Array.from(value.matchAll(pattern)).length;
}

function approximateBodyTextLength(html: string): number {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export function analyzeTranscriptHtml(html: string): TranscriptHtmlDiagnostics {
  const documentLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? null;
  const scriptCount = countMatches(html, /<script\b/gi);
  const externalScriptCount = countMatches(html, /<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>/gi);
  const iframeCount = countMatches(html, /<iframe\b/gi);

  return {
    htmlLength: html.length,
    bodyTextLength: approximateBodyTextLength(html),
    documentLang,
    scriptCount,
    externalScriptCount,
    inlineScriptCount: Math.max(0, scriptCount - externalScriptCount),
    iframeCount,
    containsMicrosoftCertified: /Microsoft\s+Certified\s*:/i.test(html),
    containsAppliedSkills: /Microsoft\s+Applied\s+Skills\s*:/i.test(html),
    containsPassedExams: /Passed\s+exams/i.test(html),
    containsEarnedOn: /Earned\s+on/i.test(html),
    containsJapaneseDate: /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test(html),
    containsHydrationData:
      /__NEXT_DATA__|__NUXT__|__INITIAL_STATE__|type=["']application\/json["']/i.test(html),
    containsTranscriptToken: /\btranscript\b/i.test(html),
    containsCredentialToken: /\bcredentials?\b/i.test(html),
    containsApiHint: /(?:\/api\/|\bgraphql\b|\bodata\b|api\.[a-z0-9.-]+)/i.test(html),
    containsClientRuntimeHint: /(?:webpack|__webpack|react(?:dom)?|angular|ng-version|vue(?:\.runtime)?|requirejs)/i.test(html),
    containsIframeTranscriptHint: /<iframe\b[^>]*(?:transcript|credential|profile)[^>]*>/i.test(html),
    containsNotFoundOrDeniedMarker:
      /(?:\b404\b|page not found|not found|access denied|forbidden|ページが見つかりません|アクセスが拒否されました)/i.test(
        html,
      ),
  };
}

export function describeTranscriptDiagnostic(diagnostic: TranscriptHtmlDiagnostics): string {
  if (
    diagnostic.containsMicrosoftCertified ||
    diagnostic.containsAppliedSkills ||
    diagnostic.containsPassedExams ||
    diagnostic.containsEarnedOn ||
    diagnostic.containsJapaneseDate
  ) {
    return '取得HTMLにはTranscriptらしい文字列があります。現在のparserが表示形式やローカライズに未対応の可能性があります。';
  }

  if (diagnostic.containsNotFoundOrDeniedMarker) {
    return '取得HTMLはTranscript本文ではなく、エラーまたはアクセス拒否ページの可能性があります。';
  }

  if (diagnostic.containsIframeTranscriptHint) {
    return '取得HTML自体には資格情報がなく、Transcript表示が別フレームから読み込まれている可能性があります。';
  }

  if (
    diagnostic.containsHydrationData ||
    diagnostic.containsClientRuntimeHint ||
    diagnostic.containsApiHint ||
    diagnostic.scriptCount > 0
  ) {
    return '取得HTML自体には資格情報がありません。通常のブラウザではJavaScript実行後にTranscriptデータを取得・描画している可能性が高いです。';
  }

  return '取得HTMLに資格情報を示す文字列が見つかりません。Microsoft Learn側のHTML構造を追加調査する必要があります。';
}
