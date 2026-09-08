export type CredentialDefinitionKind = 'certification' | 'appliedSkill';
export type ValidityPolicy =
  | { type: 'nonExpiring' }
  | { type: 'expiring'; validityPeriodMonths: number; renewalWindowMonths: number };

export interface CredentialDefinition {
  id: string;
  kind: CredentialDefinitionKind;
  canonicalTitle: string;
  displayCode: string | null;
  relatedExamCodes: string[];
  validityPolicy: ValidityPolicy;
}

export const credentialDefinitions: CredentialDefinition[] = [
  {
    id: 'cert.azure-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Administrator Associate',
    displayCode: 'AZ-104',
    relatedExamCodes: ['AZ-104'],
    validityPolicy: { type: 'expiring', validityPeriodMonths: 12, renewalWindowMonths: 6 },
  },
  {
    id: 'cert.azure-solutions-architect-expert',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Solutions Architect Expert',
    displayCode: 'AZ-305',
    relatedExamCodes: ['AZ-305'],
    validityPolicy: { type: 'expiring', validityPeriodMonths: 12, renewalWindowMonths: 6 },
  },
  {
    id: 'cert.azure-network-engineer-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Network Engineer Associate',
    displayCode: 'AZ-700',
    relatedExamCodes: ['AZ-700'],
    validityPolicy: { type: 'expiring', validityPeriodMonths: 12, renewalWindowMonths: 6 },
  },
  {
    id: 'cert.azure-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Fundamentals',
    displayCode: 'AZ-900',
    relatedExamCodes: ['AZ-900'],
    validityPolicy: { type: 'nonExpiring' },
  },
  {
    id: 'applied-skill.secure-azure-workloads-networking',
    kind: 'appliedSkill',
    canonicalTitle:
      'Microsoft Applied Skills: Configure secure access to your workloads using Azure networking',
    displayCode: null,
    relatedExamCodes: [],
    validityPolicy: { type: 'nonExpiring' },
  },
];

function normalizeTitle(title: string): string {
  return title.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US');
}

export function matchCredentialDefinition(title: string): CredentialDefinition | null {
  const normalized = normalizeTitle(title);
  return credentialDefinitions.find((definition) => normalizeTitle(definition.canonicalTitle) === normalized) ?? null;
}
