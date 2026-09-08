export interface TranscriptHtmlDiagnostics {
  htmlLength: number;
  documentLang: string | null;
  containsMicrosoftCertified: boolean;
  containsAppliedSkills: boolean;
  containsPassedExams: boolean;
  containsEarnedOn: boolean;
  containsJapaneseDate: boolean;
  containsHydrationData: boolean;
}

export function analyzeTranscriptHtml(html: string): TranscriptHtmlDiagnostics {
  const documentLang = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1] ?? null;

  return {
    htmlLength: html.length,
    documentLang,
    containsMicrosoftCertified: /Microsoft\s+Certified\s*:/i.test(html),
    containsAppliedSkills: /Microsoft\s+Applied\s+Skills\s*:/i.test(html),
    containsPassedExams: /Passed\s+exams/i.test(html),
    containsEarnedOn: /Earned\s+on/i.test(html),
    containsJapaneseDate: /\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test(html),
    containsHydrationData:
      /__NEXT_DATA__|__NUXT__|__INITIAL_STATE__|type=["']application\/json["']/i.test(html),
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

  if (diagnostic.containsHydrationData) {
    return '取得HTML本文に資格文字列が見つかりません。資格情報がブラウザ側で後から描画されている可能性があります。';
  }

  return '取得HTMLに資格情報を示す文字列が見つかりません。Microsoft Learn側のHTML構造を追加調査する必要があります。';
}
