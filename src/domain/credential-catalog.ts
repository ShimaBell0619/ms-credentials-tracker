export type CredentialDefinitionKind = 'certification' | 'appliedSkill';
export type ValidityPolicy =
  | { type: 'nonExpiring' }
  | { type: 'expiring'; validityPeriodMonths: number; renewalWindowMonths: number };

export interface CredentialDefinition {
  id: string;
  kind: CredentialDefinitionKind;
  canonicalTitle: string;
  aliases?: string[];
  displayCode: string | null;
  relatedExamCodes: string[];
  validityPolicy: ValidityPolicy;
}

const annualRenewal: ValidityPolicy = {
  type: 'expiring',
  validityPeriodMonths: 12,
  renewalWindowMonths: 6,
};

const nonExpiring: ValidityPolicy = { type: 'nonExpiring' };

export const credentialDefinitions: CredentialDefinition[] = [
  {
    id: 'cert.azure-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Administrator Associate',
    aliases: [
      'Microsoft認定資格: Azure管理者アソシエイト',
      'Microsoft 認定: Azure 管理者アソシエイト',
    ],
    displayCode: 'AZ-104',
    relatedExamCodes: ['AZ-104'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-security-engineer-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Security Engineer Associate',
    aliases: ['Microsoft 認定: Azure セキュリティ エンジニア アソシエイト'],
    displayCode: 'AZ-500',
    relatedExamCodes: ['AZ-500'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-solutions-architect-expert',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Solutions Architect Expert',
    aliases: [
      'Microsoft認定: Azure ソリューション アーキテクト エキスパート',
      'Microsoft 認定: Azure ソリューション アーキテクト エキスパート',
    ],
    displayCode: 'AZ-305',
    relatedExamCodes: ['AZ-305'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-network-engineer-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Network Engineer Associate',
    aliases: ['Microsoft 認定: Azure ネットワーク エンジニア アソシエイト'],
    displayCode: 'AZ-700',
    relatedExamCodes: ['AZ-700'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-database-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Database Administrator Associate',
    displayCode: 'DP-300',
    relatedExamCodes: ['DP-300'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-cosmos-db-developer-specialty',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Cosmos DB Developer Specialty',
    displayCode: 'DP-420',
    relatedExamCodes: ['DP-420'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-virtual-desktop-specialty',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Virtual Desktop Specialty',
    displayCode: 'AZ-140',
    relatedExamCodes: ['AZ-140'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.windows-server-hybrid-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Windows Server Hybrid Administrator Associate',
    displayCode: 'AZ-800 / AZ-801',
    relatedExamCodes: ['AZ-800', 'AZ-801'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.identity-access-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Identity and Access Administrator Associate',
    aliases: ['Microsoft 認定: アイデンティティおよびアクセス管理者アソシエイト'],
    displayCode: 'SC-300',
    relatedExamCodes: ['SC-300'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.security-operations-analyst-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Security Operations Analyst Associate',
    displayCode: 'SC-200',
    relatedExamCodes: ['SC-200'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.information-security-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Information Security Administrator Associate',
    displayCode: 'SC-401',
    relatedExamCodes: ['SC-401'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.cybersecurity-architect-expert',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Cybersecurity Architect Expert',
    aliases: ['Microsoft認定: サイバーセキュリティ アーキテクト エキスパート'],
    displayCode: 'SC-100',
    relatedExamCodes: ['SC-100'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.fabric-analytics-engineer-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Fabric Analytics Engineer Associate',
    displayCode: 'DP-600',
    relatedExamCodes: ['DP-600'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.fabric-data-engineer-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Fabric Data Engineer Associate',
    displayCode: 'DP-700',
    relatedExamCodes: ['DP-700'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.m365-endpoint-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft 365 Certified: Endpoint Administrator Associate',
    displayCode: 'MD-102',
    relatedExamCodes: ['MD-102'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.m365-teams-administrator-associate',
    kind: 'certification',
    canonicalTitle: 'Microsoft 365 Certified: Teams Administrator Associate',
    displayCode: 'MS-700',
    relatedExamCodes: ['MS-700'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.m365-administrator-expert',
    kind: 'certification',
    canonicalTitle: 'Microsoft 365 Certified: Administrator Expert',
    aliases: ['Microsoft 365 認定: 管理者エキスパート'],
    displayCode: 'MS-102',
    relatedExamCodes: ['MS-102'],
    validityPolicy: annualRenewal,
  },
  {
    id: 'cert.azure-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Fundamentals',
    aliases: ['Microsoft 認定: Azure Fundamentals', 'Microsoft認定: Azure Fundamentals'],
    displayCode: 'AZ-900',
    relatedExamCodes: ['AZ-900'],
    validityPolicy: nonExpiring,
  },
  {
    id: 'cert.azure-ai-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure AI Fundamentals',
    displayCode: 'AI-900 / AI-901',
    relatedExamCodes: ['AI-900', 'AI-901'],
    validityPolicy: nonExpiring,
  },
  {
    id: 'cert.azure-data-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Azure Data Fundamentals',
    displayCode: 'DP-900',
    relatedExamCodes: ['DP-900'],
    validityPolicy: nonExpiring,
  },
  {
    id: 'cert.security-compliance-identity-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Security, Compliance, and Identity Fundamentals',
    displayCode: 'SC-900',
    relatedExamCodes: ['SC-900'],
    validityPolicy: nonExpiring,
  },
  {
    id: 'cert.power-platform-fundamentals',
    kind: 'certification',
    canonicalTitle: 'Microsoft Certified: Power Platform Fundamentals',
    displayCode: 'PL-900',
    relatedExamCodes: ['PL-900'],
    validityPolicy: nonExpiring,
  },
  {
    id: 'applied-skill.secure-azure-workloads-networking',
    kind: 'appliedSkill',
    canonicalTitle:
      'Microsoft Applied Skills: Configure secure access to your workloads using Azure networking',
    displayCode: null,
    relatedExamCodes: [],
    validityPolicy: nonExpiring,
  },
  {
    id: 'applied-skill.azure-management-tasks',
    kind: 'appliedSkill',
    canonicalTitle: 'Microsoft Applied Skills: Get started with Azure management tasks',
    displayCode: null,
    relatedExamCodes: [],
    validityPolicy: nonExpiring,
  },
  {
    id: 'applied-skill.cloud-security-monitoring-tasks',
    kind: 'appliedSkill',
    canonicalTitle: 'Microsoft Applied Skills: Get started with cloud security and monitoring tasks',
    displayCode: null,
    relatedExamCodes: [],
    validityPolicy: nonExpiring,
  },
  {
    id: 'applied-skill.active-directory-domain-services',
    kind: 'appliedSkill',
    canonicalTitle: 'Microsoft Applied Skills: Administer Active Directory Domain Services',
    displayCode: null,
    relatedExamCodes: [],
    validityPolicy: nonExpiring,
  },
];

const definitionById = new Map(
  credentialDefinitions.map((definition) => [definition.id, definition] as const),
);

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
    .toLocaleLowerCase('en-US');
}

export function getCredentialDefinition(id: string): CredentialDefinition | null {
  return definitionById.get(id) ?? null;
}

export function matchCredentialDefinition(title: string): CredentialDefinition | null {
  const normalized = normalizeTitle(title);
  return (
    credentialDefinitions.find((definition) =>
      [definition.canonicalTitle, ...(definition.aliases ?? [])].some(
        (candidate) => normalizeTitle(candidate) === normalized,
      ),
    ) ?? null
  );
}
