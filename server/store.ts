import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { LabEvent, LabState } from '../shared/types';
import type { ScenarioId } from '../shared/scenarios';
import type { RecipientId } from '../shared/trainingData';

export class LabStore {
  private scenarioId: ScenarioId = 'benefits';
  private recipientId: RecipientId = 'demo-001';
  private events: LabEvent[] = [];
  private clients = new Set<Response>();

  state(): LabState {
    return { scenarioId: this.scenarioId, recipientId: this.recipientId, events: [...this.events] };
  }

  setScenario(scenarioId: ScenarioId) {
    this.scenarioId = scenarioId;
    this.push({
      kind: 'system',
      evidence: 'simulated',
      type: 'campaign_created',
      title: 'Campaign prepared',
      scenarioId,
      simple: 'The presenter selected a fictional training scenario. Nothing was sent to a real inbox.',
      technical: 'The local application updated its in-memory campaign state; no email service or external network was used.',
    });
  }

  setRecipient(recipientId: RecipientId) {
    this.recipientId = recipientId;
    this.broadcast('lab-state', this.state());
  }

  push(event: Omit<LabEvent, 'id' | 'timestamp'>) {
    const complete: LabEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.events = [...this.events.slice(-199), complete];
    this.broadcast('lab-event', complete);
    return complete;
  }

  reset() {
    this.scenarioId = 'benefits';
    this.recipientId = 'demo-001';
    this.events = [];
    this.broadcast('lab-reset', this.state());
  }

  connect(response: Response) {
    this.clients.add(response);
    response.write(`event: lab-state\ndata: ${JSON.stringify(this.state())}\n\n`);
    const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20_000);
    response.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(response);
    });
  }

  private broadcast(eventName: string, payload: unknown) {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) client.write(message);
  }
}
