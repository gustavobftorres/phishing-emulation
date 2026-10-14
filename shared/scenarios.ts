export type ScenarioId = 'benefits' | 'document' | 'supplier';

export type Scenario = {
  id: ScenarioId;
  shortName: string;
  eyebrow: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  greeting: string;
  paragraphs: string[];
  callToAction: string;
  objective: string;
  lesson: string;
  warningSigns: string[];
};

export const scenarios: Record<ScenarioId, Scenario> = {
  benefits: {
    id: 'benefits',
    shortName: 'Benefits update',
    eyebrow: 'People Operations',
    senderName: 'Mara Cole · People Operations',
    senderEmail: 'benefits@people-ops.meridian-example.example',
    subject: 'Action required today: confirm your 2027 benefits',
    preview: 'Your current elections will expire at 5:00 PM unless you confirm…',
    greeting: 'Hello Alex,',
    paragraphs: [
      'Our annual benefits review closes today at 5:00 PM. Employees who do not validate their profile may temporarily lose access to current selections.',
      'Use the secure review link below to confirm that your employee record is current. This training message is entirely fictional.',
    ],
    callToAction: 'Review benefits profile',
    objective: 'Recognize urgency, authority, and a destination that does not match the apparent sender.',
    lesson: 'Slow down when a message combines a deadline, a consequence, and an unexpected link.',
    warningSigns: ['Artificial deadline', 'Threat of losing access', 'Look-alike sender domain'],
  },
  document: {
    id: 'document',
    shortName: 'Document review',
    eyebrow: 'Project Workspace',
    senderName: 'Noah Finch · Strategy',
    senderEmail: 'noah.finch@meridian-example.example',
    subject: 'Can you review this before the 2:30 client call?',
    preview: 'I added your name to the final review. Please leave comments…',
    greeting: 'Hi Alex,',
    paragraphs: [
      'I added your name to the final review for the Northstar proposal. The client moved the call forward, so I need your comments before 2:30 PM.',
      'Open the shared review page below. Notice that the visible workplace context does not prove the destination is trusted.',
    ],
    callToAction: 'Open shared review',
    objective: 'Compare the expected destination with the actual URL before opening a workplace link.',
    lesson: 'Familiar names and normal work requests can be copied. Verify the destination, not just the story.',
    warningSigns: ['Unexpected timing', 'Familiar-name pressure', 'Destination requires inspection'],
  },
  supplier: {
    id: 'supplier',
    shortName: 'Supplier update',
    eyebrow: 'External supplier',
    senderName: 'Elena Park · Northwind Supply',
    senderEmail: 'accounts@northwind-supply.example',
    subject: 'Supplier profile must be confirmed before next invoice',
    preview: 'Our records show your administrative contact is incomplete…',
    greeting: 'Good afternoon,',
    paragraphs: [
      'Our records show that your administrative contact is incomplete. Future invoices may be delayed until the supplier profile is confirmed.',
      'Please review the training page below. In real life, confirm financial or supplier changes through a known, independent channel.',
    ],
    callToAction: 'Confirm supplier profile',
    objective: 'Recognize how social engineering can begin an administrative or payment-fraud conversation.',
    lesson: 'Verify supplier and financial changes using a known phone number or established process.',
    warningSigns: ['Process change', 'Financial consequence', 'External sender'],
  },
};

export const scenarioList = Object.values(scenarios);

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in scenarios;
}

export function trainingUrl(id: ScenarioId, recipient = 'demo-001') {
  return `http://127.0.0.1:3000/training/${id}?campaign=${id}&recipient=${recipient}&source=simulated-inbox`;
}
