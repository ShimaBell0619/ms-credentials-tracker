export type CredentialStatus = 'renew-now' | 'active' | 'no-expiry';

export type MockCredential = {
  id: string;
  code: string;
  name: string;
  level: string;
  earnedOn: string;
  expiresOn: string | null;
  status: CredentialStatus;
  statusLabel: string;
  accent: 'azure' | 'violet' | 'teal' | 'slate';
};

export const mockCredentials: MockCredential[] = [
  {
    id: 'az-104',
    code: 'AZ-104',
    name: 'Azure Administrator Associate',
    level: 'Associate',
    earnedOn: '2025/10/19',
    expiresOn: '2026/10/19',
    status: 'renew-now',
    statusLabel: '更新できます',
    accent: 'azure',
  },
  {
    id: 'az-305',
    code: 'AZ-305',
    name: 'Azure Solutions Architect Expert',
    level: 'Expert',
    earnedOn: '2026/03/12',
    expiresOn: '2027/03/12',
    status: 'active',
    statusLabel: '有効',
    accent: 'violet',
  },
  {
    id: 'az-900',
    code: 'AZ-900',
    name: 'Azure Fundamentals',
    level: 'Fundamentals',
    earnedOn: '2024/06/08',
    expiresOn: null,
    status: 'no-expiry',
    statusLabel: '期限なし',
    accent: 'teal',
  },
  {
    id: 'pl-900',
    code: 'PL-900',
    name: 'Power Platform Fundamentals',
    level: 'Fundamentals',
    earnedOn: '2025/01/25',
    expiresOn: null,
    status: 'no-expiry',
    statusLabel: '期限なし',
    accent: 'slate',
  },
];

export const upcomingEvents = [
  {
    date: '09/15',
    label: '更新リマインド',
    detail: 'Azure Administrator Associate',
    tone: 'info',
  },
  {
    date: '10/05',
    label: '期限2週間前',
    detail: 'Azure Administrator Associate',
    tone: 'warning',
  },
  {
    date: '10/19',
    label: '有効期限',
    detail: 'Azure Administrator Associate',
    tone: 'danger',
  },
] as const;
