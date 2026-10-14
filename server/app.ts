import express, { type NextFunction, type Request } from 'express';
import { isScenarioId, scenarios } from '../shared/scenarios';
import { fictionalEmployees, isRecipientId, syntheticProtectedData } from '../shared/trainingData';
import type { BrowserProperties, EventType, LabEvent } from '../shared/types';
import { LabStore } from './store';

export const LAB_HOST = '127.0.0.1' as const;

const clientEvents: Partial<Record<EventType, Pick<LabEvent, 'title' | 'simple' | 'technical'>>> = {
  email_opened: {
    title: 'Simulated email opened',
    simple: 'The message was opened inside the training inbox. A normal phishing website would not know this from its own server logs.',
    technical: 'This is an explicitly labeled client-side simulation event, not an observation made by the landing-page HTTP server.',
  },
  sender_inspected: {
    title: 'Sender address inspected',
    simple: 'The employee paused to inspect who really sent the message.',
    technical: 'The simulator recorded a local UI action. No request was sent to the training landing page.',
  },
  link_inspected: {
    title: 'Destination URL inspected',
    simple: 'The employee checked where the link would actually go before opening it.',
    technical: 'The URL was revealed locally. Inspecting text alone did not contact the destination server.',
  },
  form_displayed: {
    title: 'Training page rendered',
    simple: 'The browser displayed the fictional training page after receiving it.',
    technical: 'This is a client-reported rendering event. The preceding GET is the independently observed server event.',
  },
};

function sourceIp(request: Request) {
  const value = request.socket.remoteAddress || '127.0.0.1';
  return value === '::1' || value === '::ffff:127.0.0.1' ? '127.0.0.1' : value;
}

function selectedHeaders(request: Request) {
  const allowlist = ['user-agent', 'referer', 'accept', 'accept-language'];
  return Object.fromEntries(allowlist.map((name) => [name, request.get(name) ?? null]));
}

const browserPropertyKeys: Array<keyof BrowserProperties> = [
  'language', 'platform', 'screenWidth', 'screenHeight', 'viewportWidth', 'viewportHeight',
  'timezone', 'devicePixelRatio', 'touchSupported',
];

function validateBrowserProperties(value: unknown): value is BrowserProperties {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== browserPropertyKeys.length || browserPropertyKeys.some((key) => !(key in record))) return false;
  const shortString = (key: 'language' | 'platform' | 'timezone') => typeof record[key] === 'string' && record[key].length > 0 && record[key].length <= 100;
  const dimension = (key: 'screenWidth' | 'screenHeight' | 'viewportWidth' | 'viewportHeight') => Number.isInteger(record[key]) && Number(record[key]) > 0 && Number(record[key]) <= 20_000;
  return shortString('language') && shortString('platform') && shortString('timezone') &&
    dimension('screenWidth') && dimension('screenHeight') && dimension('viewportWidth') && dimension('viewportHeight') &&
    typeof record.devicePixelRatio === 'number' && record.devicePixelRatio >= 0.25 && record.devicePixelRatio <= 10 &&
    typeof record.touchSupported === 'boolean';
}

function queryValues(request: Request) {
  return Object.fromEntries(
    Object.entries(request.query).flatMap(([key, value]) =>
      typeof value === 'string' && key !== 'token' && key !== 'password' ? [[key, value.slice(0, 120)]] : [],
    ),
  );
}

function httpDetails(request: Request, method: 'GET' | 'POST', responseStatus: number) {
  return {
    method,
    path: request.path,
    sourceIp: sourceIp(request),
    headers: selectedHeaders(request),
    query: queryValues(request),
    responseStatus,
  };
}

export function createLabApp(store = new LabStore()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb', type: 'application/json' }));
  app.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; form-action 'self'");
    next();
  });

  app.get('/api/state', (_request, response) => response.json(store.state()));

  app.get('/api/events/stream', (request, response) => {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    store.connect(response);
    request.on('close', () => response.end());
  });

  app.post('/api/scenario', (request, response) => {
    if (!isScenarioId(request.body?.scenarioId)) {
      response.status(400).json({ error: 'Unknown training scenario.' });
      return;
    }
    store.setScenario(request.body.scenarioId);
    response.json(store.state());
  });

  app.post('/api/recipient', (request, response) => {
    if (!isRecipientId(request.body?.recipientId)) {
      response.status(400).json({ error: 'Unknown fictional training recipient.' });
      return;
    }
    store.setRecipient(request.body.recipientId);
    response.json(store.state());
  });

  app.post('/api/client-event', (request, response) => {
    const type = request.body?.type as EventType;
    const scenarioId = request.body?.scenarioId;
    const content = clientEvents[type];
    if (!content || !isScenarioId(scenarioId)) {
      response.status(400).json({ error: 'Unsupported client event.' });
      return;
    }
    response.status(201).json(store.push({ kind: 'client', evidence: 'simulated', type, scenarioId, ...content }));
  });

  app.post('/api/reset', (_request, response) => {
    store.reset();
    response.status(204).end();
  });

  app.get('/training/:scenarioId', (request, response, next: NextFunction) => {
    const { scenarioId } = request.params;
    if (!isScenarioId(scenarioId)) {
      response.status(404).json({ error: 'Training scenario not found.' });
      return;
    }

    store.push({
      kind: 'http',
      evidence: 'observed',
      type: 'http_get',
      title: `GET ${request.path}`,
      scenarioId,
      simple: 'The browser contacted the local training server and asked for this page. No form values were sent.',
      technical: 'The server received an HTTP GET with the path, loopback source IP, allowlisted headers, and synthetic query parameters, then returned HTTP 200.',
      mitigation: 'Pause before opening unexpected links; browser isolation and secure web gateways can also inspect or block risky destinations.',
      http: httpDetails(request, 'GET', 200),
    });

    const recipient = request.query.recipient;
    if (isRecipientId(recipient)) {
      store.setRecipient(recipient);
      const employee = fictionalEmployees[recipient];
      store.push({
        kind: 'system',
        evidence: 'inferred',
        type: 'identity_correlated',
        title: `Personalized link correlated · ${recipient}`,
        scenarioId,
        simple: `The link was assigned to ${employee.name}, but that does not prove this person opened it.`,
        technical: 'The server matched an opaque query identifier against fictional campaign data that existed before the request. The identity did not come from the browser.',
        mitigation: 'Do not forward suspicious links; security scanners should avoid treating personalized URL hits as proof of human action.',
        identity: {
          recipientId: recipient,
          employee,
          observed: `Link associated with ${recipient} was requested.`,
          inferred: `${recipient} is assigned to ${employee.name}.`,
          notProven: `The actual person who clicked was ${employee.name}.`,
        },
      });
    }

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ ok: true, scenario: scenarios[scenarioId] });
      return;
    }
    next();
  });

  app.post('/training/browser-properties', (request, response) => {
    const { scenarioId, properties } = request.body ?? {};
    if (!isScenarioId(scenarioId) || !validateBrowserProperties(properties)) {
      response.status(422).json({ error: 'Only the predefined browser demonstration properties are accepted.' });
      return;
    }
    const details = httpDetails(request, 'POST', 200);
    store.push({
      kind: 'http',
      evidence: 'observed',
      type: 'browser_properties_transmitted',
      title: 'POST /training/browser-properties',
      scenarioId,
      simple: 'The server received these browser properties only after the explicit transmission action.',
      technical: 'Page JavaScript read low-entropy values from standard browser APIs, then deliberately encoded the allowlisted values in a separate JSON POST.',
      mitigation: 'Use current browsers, limit unnecessary scripts, and deploy browser isolation or script controls for higher-risk environments.',
      http: { ...details, browserProperties: properties },
    });
    response.json({ ok: true, message: 'Browser demonstration properties received locally.' });
  });

  app.post('/training/simulate-compromise', (request, response) => {
    const { scenarioId } = request.body ?? {};
    if (!isScenarioId(scenarioId) || Object.keys(request.body ?? {}).some((key) => !['scenarioId'].includes(key))) {
      response.status(422).json({ error: 'Invalid simulation request.' });
      return;
    }
    const compromise = JSON.parse(JSON.stringify(syntheticProtectedData));
    store.push({
      kind: 'client',
      evidence: 'simulated',
      type: 'compromise_simulated',
      title: 'SIMULATED — Browser security boundary failure',
      scenarioId,
      simple: 'The lab revealed fictional protected data to illustrate a hypothetical failure. No real file, cookie, token, or session was accessed.',
      technical: 'This transition only displays constants bundled with the training application. It does not exploit the browser, bypass same-origin policy, request file permission, or access the operating system.',
      mitigation: 'Keep browsers and operating systems updated; use automatic patching, managed-device policies, least privilege, and browser isolation where appropriate.',
      compromise,
    });
    response.json({ ok: true, compromise });
  });

  app.post('/training/submit', (request, response) => {
    const keys = Object.keys(request.body ?? {});
    const allowedKeys = ['scenarioId', 'employeeName', 'verificationCode'];
    const containsSensitiveField = keys.some((key) => /password|passcode|secret|token|cookie|mfa|otp|card|bank/i.test(key));
    const hasExtraFields = keys.some((key) => !allowedKeys.includes(key));
    const { scenarioId, employeeName, verificationCode } = request.body ?? {};

    if (
      containsSensitiveField ||
      hasExtraFields ||
      !isScenarioId(scenarioId) ||
      typeof employeeName !== 'string' ||
      !/^[A-Za-z][A-Za-z .'-]{0,50} Example$/.test(employeeName.trim()) ||
      typeof verificationCode !== 'string' ||
      !/^DEMO-[A-Z0-9]{4,12}$/.test(verificationCode.trim().toUpperCase())
    ) {
      response.status(422).json({
        error: 'Use synthetic training values only: a name ending in “Example” and a code beginning with “DEMO-”.',
      });
      return;
    }

    const formValues = {
      employeeName: employeeName.trim(),
      verificationCode: verificationCode.trim().toUpperCase(),
    };
    const details = httpDetails(request, 'POST', 200);
    store.push({
      kind: 'http',
      evidence: 'observed',
      type: 'http_post',
      title: 'POST /training/submit',
      scenarioId,
      simple: 'Only now—after Submit—the browser intentionally sent the synthetic form values to the local server.',
      technical: 'The browser encoded an allowlisted JSON body in an HTTP POST. The server rejected sensitive field names and retained only the two synthetic training values in memory.',
      mitigation: 'Verify the destination and why the information is needed before submitting any form.',
      http: { ...details, formValues },
    });
    response.json({ ok: true, message: 'Synthetic training data received locally.' });
  });

  app.use((error: unknown, _request: Request, response: express.Response, _next: NextFunction) => {
    console.error(error);
    response.status(400).json({ error: 'The local server could not process that request.' });
  });

  return { app, store };
}
