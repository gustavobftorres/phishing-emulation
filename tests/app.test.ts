import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Response } from 'express';
import { createLabApp, LAB_HOST } from '../server/app';
import { LabStore } from '../server/store';
import { syntheticProtectedData } from '../shared/trainingData';

const demoBrowserProperties = {
  language: 'en-US',
  platform: 'macOS',
  screenWidth: 1920,
  screenHeight: 1080,
  viewportWidth: 1280,
  viewportHeight: 720,
  timezone: 'America/Sao_Paulo',
  devicePixelRatio: 2,
  touchSupported: false,
};

describe('local phishing awareness lab API', () => {
  it('binds to the loopback host by design', () => {
    expect(LAB_HOST).toBe('127.0.0.1');
  });

  it('synchronizes selected scenarios through shared state', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/api/scenario').send({ scenarioId: 'document' });
    expect(response.status).toBe(200);
    expect(response.body.scenarioId).toBe('document');
    expect(response.body.events[0].type).toBe('campaign_created');
  });

  it('records a genuine GET with only allowlisted metadata', async () => {
    const { app } = createLabApp();
    const response = await request(app).get('/training/benefits?campaign=benefits&source=test')
      .set('Accept', 'application/json').set('User-Agent', 'Lab-Test/1.0')
      .set('Authorization', 'Bearer must-not-be-stored');
    expect(response.status).toBe(200);
    const state = (await request(app).get('/api/state')).body;
    const event = state.events.find(({ type }: { type: string }) => type === 'http_get');
    expect(event.http.method).toBe('GET');
    expect(event.http.sourceIp).toBe('127.0.0.1');
    expect(event.http.query).toEqual({ campaign: 'benefits', source: 'test' });
    expect(event.http.headers['user-agent']).toBe('Lab-Test/1.0');
    expect(event.http.headers.referer).toBeNull();
    expect(event.http.headers['accept-language']).toBeNull();
    expect(event.http.headers.authorization).toBeUndefined();
    expect(event.evidence).toBe('observed');
  });

  it('correlates a personalized link with fictional campaign data without claiming identity proof', async () => {
    const { app } = createLabApp();
    await request(app).get('/training/document?recipient=demo-002').set('Accept', 'application/json');
    const state = (await request(app).get('/api/state')).body;
    const event = state.events.find(({ type }: { type: string }) => type === 'identity_correlated');
    expect(state.recipientId).toBe('demo-002');
    expect(event.evidence).toBe('inferred');
    expect(event.identity.employee).toEqual({ id: 'demo-002', name: 'Jordan Example', department: 'Human Resources' });
    expect(event.identity.observed).toContain('demo-002');
    expect(event.identity.notProven).toContain('Jordan Example');
  });

  it('does not receive browser properties until the explicit allowlisted POST', async () => {
    const { app } = createLabApp();
    await request(app).get('/training/benefits?recipient=demo-001').set('Accept', 'application/json');
    let state = (await request(app).get('/api/state')).body;
    expect(state.events.some(({ type }: { type: string }) => type === 'browser_properties_transmitted')).toBe(false);

    const response = await request(app).post('/training/browser-properties').send({
      scenarioId: 'benefits',
      properties: demoBrowserProperties,
    });
    expect(response.status).toBe(200);
    state = (await request(app).get('/api/state')).body;
    const event = state.events.find(({ type }: { type: string }) => type === 'browser_properties_transmitted');
    expect(event.evidence).toBe('observed');
    expect(event.http.browserProperties).toEqual(demoBrowserProperties);
  });

  it('rejects extra or high-entropy browser fields', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/training/browser-properties').send({
      scenarioId: 'benefits',
      properties: { ...demoBrowserProperties, installedFonts: ['Example Sans'] },
    });
    expect(response.status).toBe(422);
    expect((await request(app).get('/api/state')).body.events).toHaveLength(0);
  });

  it('records only validated synthetic form values in a genuine POST', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/training/submit').send({
      scenarioId: 'benefits', employeeName: 'Alex Example', verificationCode: 'DEMO-1234',
    });
    expect(response.status).toBe(200);
    const state = (await request(app).get('/api/state')).body;
    expect(state.events[0].http.formValues).toEqual({ employeeName: 'Alex Example', verificationCode: 'DEMO-1234' });
  });

  it('rejects sensitive fields and non-synthetic values', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/training/submit').send({
      scenarioId: 'benefits', employeeName: 'Real Person', verificationCode: '123456', password: 'nope',
    });
    expect(response.status).toBe(422);
    expect((await request(app).get('/api/state')).body.events).toHaveLength(0);
  });

  it('reveals only bundled fictional data in the simulated compromise', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/training/simulate-compromise').send({ scenarioId: 'supplier' });
    expect(response.status).toBe(200);
    expect(response.body.compromise).toEqual(syntheticProtectedData);
    const state = (await request(app).get('/api/state')).body;
    const event = state.events.find(({ type }: { type: string }) => type === 'compromise_simulated');
    expect(event.evidence).toBe('simulated');
    expect(event.kind).toBe('client');
    expect(event.http).toBeUndefined();
    expect(event.compromise).toEqual(syntheticProtectedData);
  });

  it('rejects extra inputs to the compromise simulation boundary', async () => {
    const { app } = createLabApp();
    const response = await request(app).post('/training/simulate-compromise').send({
      scenarioId: 'supplier',
      localPath: '/Users/someone/Documents',
    });
    expect(response.status).toBe(422);
    expect((await request(app).get('/api/state')).body.events).toHaveLength(0);
  });

  it('pushes timeline changes over the event stream', () => {
    const store = new LabStore();
    const writes: string[] = [];
    let close: () => void = () => undefined;
    const response = {
      write: (chunk: string) => { writes.push(chunk); return true; },
      on: (event: string, callback: () => void) => { if (event === 'close') close = callback; return response; },
    } as unknown as Response;
    store.connect(response);
    store.push({ kind: 'client', evidence: 'simulated', type: 'email_opened', scenarioId: 'benefits', title: 'Opened', simple: 'Simple', technical: 'Technical' });
    expect(writes[0]).toContain('event: lab-state');
    expect(writes[1]).toContain('event: lab-event');
    expect(writes[1]).toContain('email_opened');
    close();
  });

  it('clears all demonstration events on reset', async () => {
    const { app } = createLabApp();
    await request(app).post('/api/scenario').send({ scenarioId: 'supplier' });
    expect((await request(app).post('/api/reset')).status).toBe(204);
    expect((await request(app).get('/api/state')).body).toEqual({ scenarioId: 'benefits', recipientId: 'demo-001', events: [] });
  });
});
