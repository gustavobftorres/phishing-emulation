export type RecipientId = 'demo-001' | 'demo-002' | 'demo-003';

export type FictionalEmployee = {
  id: RecipientId;
  name: string;
  department: string;
};

export const fictionalEmployees: Record<RecipientId, FictionalEmployee> = {
  'demo-001': { id: 'demo-001', name: 'Alex Example', department: 'Finance' },
  'demo-002': { id: 'demo-002', name: 'Jordan Example', department: 'Human Resources' },
  'demo-003': { id: 'demo-003', name: 'Taylor Example', department: 'Operations' },
};

export const fictionalEmployeeList = Object.values(fictionalEmployees);

export function isRecipientId(value: unknown): value is RecipientId {
  return typeof value === 'string' && value in fictionalEmployees;
}

export const syntheticProtectedData = {
  document: {
    name: 'company-strategy-demo.txt',
    owner: 'Alex Example',
    classification: 'TRAINING DATA',
    contents: 'This is a fictional confidential document used exclusively for cybersecurity training.',
  },
  profile: {
    name: 'Alex Example',
    employeeNumber: 'EXAMPLE-0042',
    location: 'Demo Office',
  },
  note: 'TRAINING ONLY — Fictional acquisition planning note. No real company information.',
  session: {
    application: 'Meridian Example Workspace',
    status: 'FICTIONAL SESSION — NOT AN AUTHENTICATION TOKEN',
  },
} as const;
