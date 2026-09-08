export type CredentialStatus = '更新可能' | '有効' | '期限なし';

export interface CredentialRecord {
  code: string;
  name: string;
  earnedOn: string;
  status: CredentialStatus;
  expiresOn: string | null;
  renewalNote: string;
}

export interface ScheduleEvent {
  date: string;
  label: string;
  detail: string;
  kind: 'deadline' | 'renewal' | 'plan';
}

export const credentials: CredentialRecord[] = [
  {
    code: 'AZ-104',
    name: 'Microsoft Certified: Azure Administrator Associate',
    earnedOn: '2025.10.19',
    status: '更新可能',
    expiresOn: '2026.10.19',
    renewalNote: '更新アセスメントを受験できます',
  },
  {
    code: 'AZ-305',
    name: 'Microsoft Certified: Azure Solutions Architect Expert',
    earnedOn: '2026.04.22',
    status: '有効',
    expiresOn: '2027.04.22',
    renewalNote: '2026.10.22 から更新可能',
  },
  {
    code: 'AZ-700',
    name: 'Microsoft Certified: Azure Network Engineer Associate',
    earnedOn: '2026.07.03',
    status: '有効',
    expiresOn: '2027.07.03',
    renewalNote: '2027.01.03 から更新可能',
  },
  {
    code: 'AZ-900',
    name: 'Microsoft Certified: Azure Fundamentals',
    earnedOn: '2024.06.15',
    status: '期限なし',
    expiresOn: null,
    renewalNote: '更新不要',
  },
];

export const scheduleEvents: ScheduleEvent[] = [
  {
    date: '09.22',
    label: 'SC-100 受験予定',
    detail: '学習予定として登録した日付',
    kind: 'plan',
  },
  {
    date: '10.19',
    label: 'AZ-104 有効期限',
    detail: 'この日までに更新が必要',
    kind: 'deadline',
  },
  {
    date: '10.22',
    label: 'AZ-305 更新開始',
    detail: '更新アセスメントの対象期間に入る',
    kind: 'renewal',
  },
  {
    date: '11.15',
    label: '更新状況を確認',
    detail: 'モックの確認予定',
    kind: 'plan',
  },
];
