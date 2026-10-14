import type { ScenarioId } from './scenarios';
import type { FictionalEmployee, RecipientId } from './trainingData';

export type EvidenceClass = 'observed' | 'inferred' | 'simulated';
export type EventKind = 'system' | 'client' | 'http';
export type EventType =
  | 'campaign_created'
  | 'email_opened'
  | 'sender_inspected'
  | 'link_inspected'
  | 'form_displayed'
  | 'http_get'
  | 'http_post'
  | 'browser_properties_transmitted'
  | 'identity_correlated'
  | 'compromise_simulated';

export type BrowserProperties = {
  language: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  timezone: string;
  devicePixelRatio: number;
  touchSupported: boolean;
};

export type SyntheticCompromise = {
  document: { name: string; owner: string; classification: string; contents: string };
  profile: { name: string; employeeNumber: string; location: string };
  note: string;
  session: { application: string; status: string };
};

export type LabEvent = {
  id: string;
  kind: EventKind;
  evidence: EvidenceClass;
  type: EventType;
  title: string;
  timestamp: string;
  scenarioId: ScenarioId;
  simple: string;
  technical: string;
  mitigation?: string;
  http?: {
    method: 'GET' | 'POST';
    path: string;
    sourceIp: string;
    headers: Record<string, string | null>;
    query: Record<string, string>;
    responseStatus: number;
    formValues?: { employeeName: string; verificationCode: string };
    browserProperties?: BrowserProperties;
  };
  identity?: {
    recipientId: RecipientId;
    employee: FictionalEmployee;
    observed: string;
    inferred: string;
    notProven: string;
  };
  compromise?: SyntheticCompromise;
};

export type LabState = {
  scenarioId: ScenarioId;
  recipientId: RecipientId;
  events: LabEvent[];
};
