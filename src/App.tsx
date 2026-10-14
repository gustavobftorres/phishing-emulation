import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDot,
  Clipboard,
  Clock3,
  Code2,
  Copy,
  Database,
  Eye,
  FileSearch,
  FileText,
  Fingerprint,
  Globe2,
  HardDrive,
  Inbox,
  Info,
  KeyRound,
  Laptop,
  Layers3,
  Link2,
  LockKeyhole,
  Mail,
  MonitorSmartphone,
  MousePointer2,
  Network,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Unlock,
  UserRound,
  UserCheck,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { isScenarioId, scenarioList, scenarios, trainingUrl, type ScenarioId } from '../shared/scenarios';
import { fictionalEmployeeList, fictionalEmployees, isRecipientId, syntheticProtectedData, type RecipientId } from '../shared/trainingData';
import type { BrowserProperties, EvidenceClass, EventType, LabEvent, LabState, SyntheticCompromise } from '../shared/types';

const initialState: LabState = { scenarioId: 'benefits', recipientId: 'demo-001', events: [] };

function useLab() {
  const [state, setState] = useState<LabState>(initialState);
  const [connected, setConnected] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    fetch('/api/state').then((response) => response.json()).then(setState).catch(() => undefined);
    const stream = new EventSource('/api/events/stream');
    stream.addEventListener('open', () => setConnected(true));
    stream.addEventListener('error', () => setConnected(false));
    stream.addEventListener('lab-state', (event) => setState(JSON.parse((event as MessageEvent).data)));
    stream.addEventListener('lab-reset', (event) => {
      setState(JSON.parse((event as MessageEvent).data));
      setResetVersion((value) => value + 1);
    });
    stream.addEventListener('lab-event', (event) => {
      const incoming = JSON.parse((event as MessageEvent).data) as LabEvent;
      setState((current) => ({
        scenarioId: incoming.type === 'campaign_created' ? incoming.scenarioId : current.scenarioId,
        recipientId: current.recipientId,
        events: current.events.some(({ id }) => id === incoming.id) ? current.events : [...current.events, incoming],
      }));
    });
    return () => stream.close();
  }, []);

  const selectScenario = useCallback(async (scenarioId: ScenarioId) => {
    await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
  }, []);

  const selectRecipient = useCallback(async (recipientId: RecipientId) => {
    await fetch('/api/recipient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    });
  }, []);

  const reset = useCallback(async () => {
    await fetch('/api/reset', { method: 'POST' });
  }, []);

  return { state, connected, resetVersion, selectScenario, selectRecipient, reset };
}

async function reportClientEvent(type: EventType, scenarioId: ScenarioId) {
  await fetch('/api/client-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, scenarioId }),
  });
}

type VictimStage = 'inbox' | 'email' | 'landing' | 'submitted';
type LandingModule = 'overview' | 'browser' | 'identity' | 'form' | 'compromise' | 'defense';

function readBrowserProperties(): BrowserProperties {
  const navigatorWithData = navigator as Navigator & { userAgentData?: { platform?: string } };
  return {
    language: navigator.language || 'Not provided',
    platform: navigatorWithData.userAgentData?.platform || navigator.platform || 'Not provided',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Not provided',
    devicePixelRatio: window.devicePixelRatio,
    touchSupported: navigator.maxTouchPoints > 0 || 'ontouchstart' in window,
  };
}

function useVictimFlow(scenarioId: ScenarioId, recipientId: RecipientId, initialStage: VictimStage = 'inbox', resetSignal = 0) {
  const [stage, setStage] = useState<VictimStage>(initialStage);
  const [module, setModule] = useState<LandingModule>('overview');
  const [senderOpen, setSenderOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState(fictionalEmployees[recipientId].name);
  const [verificationCode, setVerificationCode] = useState('DEMO-1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [browserProperties, setBrowserProperties] = useState<BrowserProperties>();
  const [browserPropertiesSent, setBrowserPropertiesSent] = useState(false);
  const [compromise, setCompromise] = useState<SyntheticCompromise>();

  useEffect(() => {
    setStage(initialStage);
    setModule('overview');
    setSenderOpen(false);
    setLinkOpen(false);
    setEmployeeName(fictionalEmployees[recipientId].name);
    setVerificationCode('DEMO-1234');
    setError('');
    setBrowserProperties(undefined);
    setBrowserPropertiesSent(false);
    setCompromise(undefined);
  }, [scenarioId, recipientId, initialStage, resetSignal]);

  const openEmail = useCallback(async () => {
    if (stage === 'email') return;
    setStage('email');
    await reportClientEvent('email_opened', scenarioId);
  }, [scenarioId, stage]);

  const inspectSender = useCallback(async () => {
    if (senderOpen) return;
    setSenderOpen(true);
    await reportClientEvent('sender_inspected', scenarioId);
  }, [scenarioId, senderOpen]);

  const inspectLink = useCallback(async () => {
    if (linkOpen) return;
    setLinkOpen(true);
    await reportClientEvent('link_inspected', scenarioId);
  }, [linkOpen, scenarioId]);

  const visit = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/training/${scenarioId}?campaign=${scenarioId}&recipient=${recipientId}&source=simulated-inbox`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('The local training page could not be opened.');
      setStage('landing');
      setModule('overview');
      await reportClientEvent('form_displayed', scenarioId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The local training page could not be opened.');
    } finally {
      setBusy(false);
    }
  }, [recipientId, scenarioId]);

  const showBrowserInfo = useCallback(() => {
    const properties = browserProperties ?? readBrowserProperties();
    setStage('landing');
    setBrowserProperties(properties);
    setModule('browser');
    return properties;
  }, [browserProperties]);

  const transmitBrowserProperties = useCallback(async (properties = browserProperties) => {
    if (!properties || browserPropertiesSent) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/training/browser-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, properties }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setBrowserPropertiesSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The demo properties could not be transmitted.');
    } finally {
      setBusy(false);
    }
  }, [browserProperties, browserPropertiesSent, scenarioId]);

  const showIdentity = useCallback(() => { setStage('landing'); setModule('identity'); }, []);
  const showForm = useCallback(() => { setStage('landing'); setModule('form'); }, []);
  const showCompromise = useCallback(() => { setStage('landing'); setModule('compromise'); }, []);
  const showDefense = useCallback(() => { setStage('landing'); setModule('defense'); }, []);

  const simulateCompromise = useCallback(async () => {
    if (compromise) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/training/simulate-compromise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCompromise(body.compromise);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The educational simulation could not be activated.');
    } finally {
      setBusy(false);
    }
  }, [compromise, scenarioId]);

  const submit = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, employeeName, verificationCode }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setStage('submitted');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The form could not be submitted.');
    } finally {
      setBusy(false);
    }
  }, [employeeName, scenarioId, verificationCode]);

  const resetLocal = useCallback(() => {
    setStage('inbox');
    setModule('overview');
    setSenderOpen(false);
    setLinkOpen(false);
    setEmployeeName(fictionalEmployees[recipientId].name);
    setVerificationCode('DEMO-1234');
    setError('');
    setBrowserProperties(undefined);
    setBrowserPropertiesSent(false);
    setCompromise(undefined);
  }, [recipientId]);

  return {
    stage,
    module,
    senderOpen,
    linkOpen,
    employeeName,
    verificationCode,
    error,
    busy,
    browserProperties,
    browserPropertiesSent,
    compromise,
    setEmployeeName,
    setVerificationCode,
    openEmail,
    inspectSender,
    inspectLink,
    visit,
    showBrowserInfo,
    transmitBrowserProperties,
    showIdentity,
    showForm,
    showCompromise,
    showDefense,
    simulateCompromise,
    submit,
    resetLocal,
  };
}

type VictimFlow = ReturnType<typeof useVictimFlow>;

function Brand() {
  return (
    <a href="/presentation" className="flex items-center gap-3" aria-label="Signal and Shield presentation home">
      <span className="brand-mark"><ShieldCheck size={20} /></span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">Signal &amp; Shield</span>
        <span className="block text-sm font-semibold text-white">Phishing awareness lab</span>
      </span>
    </a>
  );
}

function SafetyPill({ connected }: { connected: boolean }) {
  return (
    <div className="safety-pill" title="This lab is bound to the loopback interface only">
      <span className={`status-dot ${connected ? 'online' : ''}`} />
      <span><b>TRAINING ENVIRONMENT</b> · 127.0.0.1 only</span>
    </div>
  );
}

function Shell({ children, connected, reset }: { children: ReactNode; connected: boolean; reset: () => Promise<void> }) {
  return (
    <div className="min-h-screen bg-[#06090d] text-slate-100">
      <header className="app-header">
        <Brand />
        <nav className="nav-tabs" aria-label="Lab views">
          <a href="/victim"><Laptop size={14} /> Victim</a>
          <a href="/attacker"><TerminalSquare size={14} /> Observer</a>
          <a href="/presentation"><Zap size={14} /> Presentation</a>
        </nav>
        <div className="flex items-center gap-3">
          <SafetyPill connected={connected} />
          <button className="icon-button" onClick={reset} aria-label="Reset simulation" title="Reset simulation"><RotateCcw size={16} /></button>
        </div>
      </header>
      {children}
    </div>
  );
}

function ScenarioSelect({ value, onChange, compact = false }: { value: ScenarioId; onChange: (id: ScenarioId) => void; compact?: boolean }) {
  return (
    <label className={`scenario-select ${compact ? 'compact' : ''}`}>
      {!compact && <span>Active scenario</span>}
      <select value={value} onChange={(event) => onChange(event.target.value as ScenarioId)} aria-label="Active scenario">
        {scenarioList.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.shortName}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

function RecipientSelect({ value, onChange, compact = false }: { value: RecipientId; onChange: (id: RecipientId) => void; compact?: boolean }) {
  return (
    <label className={`scenario-select recipient-select ${compact ? 'compact' : ''}`}>
      {!compact && <span>Fictional recipient</span>}
      <select value={value} onChange={(event) => onChange(event.target.value as RecipientId)} aria-label="Fictional recipient">
        {fictionalEmployeeList.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.id}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

function BrowserBar({ scenarioId, recipientId }: { scenarioId: ScenarioId; recipientId: RecipientId }) {
  return (
    <div className="browser-bar">
      <div className="flex gap-1.5" aria-hidden="true"><i /><i /><i /></div>
      <div className="url-bar"><LockKeyhole size={12} /><span>127.0.0.1:3000/training/{scenarioId}?recipient={recipientId}</span></div>
      <RefreshCcw size={12} />
    </div>
  );
}

function InboxChrome({ children }: { children: ReactNode }) {
  return (
    <div className="inbox-shell">
      <div className="inbox-topbar">
        <div className="wordmark"><span>M</span> Meridian Mail <small>SIMULATOR</small></div>
        <div className="fake-search"><Search size={13} /> Search simulated messages</div>
        <div className="avatar">AE</div>
      </div>
      {children}
    </div>
  );
}

function LandingModuleNav({ flow }: { flow: VictimFlow }) {
  const items: Array<{ id: LandingModule; label: string; icon: typeof Globe2; action: () => void }> = [
    { id: 'overview', label: 'Request', icon: Globe2, action: () => undefined },
    { id: 'browser', label: 'Browser APIs', icon: MonitorSmartphone, action: () => { flow.showBrowserInfo(); } },
    { id: 'identity', label: 'Identity link', icon: Link2, action: flow.showIdentity },
    { id: 'form', label: 'Form', icon: Clipboard, action: flow.showForm },
    { id: 'compromise', label: 'Boundary', icon: ShieldAlert, action: flow.showCompromise },
    { id: 'defense', label: 'Defense', icon: ShieldCheck, action: flow.showDefense },
  ];
  return (
    <nav className="module-nav" aria-label="Advanced laboratory modules">
      {items.map(({ id, label, icon: Icon, action }) => (
        <button key={id} className={flow.module === id ? 'active' : ''} onClick={action} disabled={id === 'overview'}>
          <Icon size={12} /> {label}
        </button>
      ))}
    </nav>
  );
}

function BrowserPropertyGrid({ properties }: { properties: BrowserProperties }) {
  const rows = [
    ['Browser language', properties.language],
    ['Reported platform', properties.platform],
    ['Screen size', `${properties.screenWidth} × ${properties.screenHeight}`],
    ['Viewport size', `${properties.viewportWidth} × ${properties.viewportHeight}`],
    ['Timezone', properties.timezone],
    ['Device pixel ratio', String(properties.devicePixelRatio)],
    ['Touch input', properties.touchSupported ? 'Supported' : 'Not reported'],
  ];
  return <div className="browser-property-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code></div>)}</div>;
}

function ProtectedResource({ icon: Icon, label, value, revealed }: { icon: typeof FileText; label: string; value: string; revealed: boolean }) {
  return (
    <div className={`protected-resource ${revealed ? 'revealed' : ''}`}>
      <span className="resource-icon">{revealed ? <Unlock size={15} /> : <Icon size={15} />}</span>
      <span><small>{label}</small><b>{revealed ? value : 'Protected by browser / OS boundary'}</b></span>
      <span className="resource-state">{revealed ? 'SIMULATED REVEAL' : 'PROTECTED'}</span>
    </div>
  );
}

function VictimPanel({ scenarioId, recipientId, flow, compact = false, disabled = false }: { scenarioId: ScenarioId; recipientId: RecipientId; flow: VictimFlow; compact?: boolean; disabled?: boolean }) {
  const scenario = scenarios[scenarioId];
  const employee = fictionalEmployees[recipientId];
  const landingCopy = {
    benefits: { eyebrow: 'Annual enrollment · fictional exercise', title: 'Confirm your employee profile', section: 'Benefits center' },
    document: { eyebrow: 'Shared review · fictional exercise', title: 'Confirm document-review access', section: 'Document workspace' },
    supplier: { eyebrow: 'Supplier portal · fictional exercise', title: 'Confirm administrative contact', section: 'Supplier center' },
  }[scenarioId];

  if (flow.stage === 'landing' || flow.stage === 'submitted') {
    return (
      <div className={`victim-panel ${compact ? 'compact' : ''}`} data-testid="victim-panel">
        <BrowserBar scenarioId={scenarioId} recipientId={recipientId} />
        <div className="landing-page">
          <div className="training-ribbon"><ShieldCheck size={14} /> FICTIONAL LOCAL TRAINING PAGE · DO NOT ENTER REAL INFORMATION</div>
          <div className="landing-nav"><span className="fictional-logo">Meridian <b>Example</b></span><span>{landingCopy.section}</span></div>
          <LandingModuleNav flow={flow} />
          {flow.stage === 'submitted' ? (
            <div className="reveal-card" data-testid="training-feedback">
              <div className="reveal-icon"><Check size={28} /></div>
              <p className="kicker">Educational reveal</p>
              <h2>The server received exactly what you submitted.</h2>
              <p>Before you selected <b>Submit training data</b>, the server could see the page request and limited connection metadata—but not these form values.</p>
              <div className="reveal-grid">
                <div><span>Automatic on page visit</span><b>Path, time, loopback IP, selected headers</b></div>
                <div><span>Sent only on submit</span><b>{flow.employeeName} · {flow.verificationCode}</b></div>
              </div>
              <div className="lesson-callout"><Info size={18} /><span><b>HTTPS protects data in transit.</b> It does not prove that the organization receiving it is trustworthy.</span></div>
              <div className="button-row center">
                <button className="secondary-button" onClick={flow.resetLocal}><Inbox size={15} /> Return to inbox</button>
                <button className="primary-button" onClick={flow.showCompromise}><ShieldAlert size={15} /> Continue to security boundary</button>
              </div>
            </div>
          ) : flow.module === 'overview' ? (
            <div className="advanced-card overview-card" data-testid="request-overview">
              <div className="advanced-icon observed"><Network size={22} /></div>
              <p className="kicker">Level 1 · genuine request</p>
              <h2>The local server received an HTTP GET.</h2>
              <p>The request included its path, query parameters, source IP, and selected headers. It did not automatically include passwords, local files, or a verified human identity.</p>
              <div className="mechanism-grid">
                <div><span>Observed by server</span><b>Path · query · IP · selected headers</b></div>
                <div><span>Not automatically available</span><b>Private files · sessions · form values</b></div>
              </div>
              <div className="identity-mini"><Link2 size={15} /><span><b>Personalized parameter present</b><code>recipient={recipientId}</code></span></div>
              <div className="button-row">
                <button className="primary-button" onClick={() => flow.showBrowserInfo()}><MonitorSmartphone size={15} /> Inspect browser APIs</button>
                <button className="secondary-button" onClick={flow.showIdentity}><UserCheck size={15} /> Explain identity correlation</button>
              </div>
            </div>
          ) : flow.module === 'browser' ? (
            <div className="advanced-card" data-testid="browser-information-exposure">
              <div className="advanced-card-heading"><div><p className="kicker">Level 2 · standard browser APIs</p><h2>Browser Information Exposure</h2></div><span className="classification-pill page-local">PAGE LOCAL</span></div>
              <p>JavaScript on this page can read these low-entropy properties for legitimate layout and localization. They are visible here in the browser, but the receiving server does not get them automatically.</p>
              {flow.browserProperties && <BrowserPropertyGrid properties={flow.browserProperties} />}
              <div className="transmission-boundary">
                <span><MonitorSmartphone size={15} /><b>Available to page JavaScript</b>Values above are currently local to this page.</span>
                <ArrowRight size={18} />
                <span className={flow.browserPropertiesSent ? 'sent' : ''}><Server size={15} /><b>Available to server</b>{flow.browserPropertiesSent ? 'Explicit POST received.' : 'Not transmitted yet.'}</span>
              </div>
              {flow.error && <p className="form-error" role="alert"><AlertTriangle size={14} /> {flow.error}</p>}
              <button className="primary-button" disabled={flow.busy || flow.browserPropertiesSent || disabled} onClick={() => flow.transmitBrowserProperties()} data-testid="transmit-browser-properties">
                <Send size={15} /> {flow.browserPropertiesSent ? 'Demo properties transmitted' : 'Transmit demo properties'}
              </button>
              <p className="privacy-note"><Fingerprint size={13} /> No canvas, WebGL, audio, font, or persistent fingerprinting</p>
            </div>
          ) : flow.module === 'identity' ? (
            <div className="advanced-card" data-testid="identity-correlation">
              <div className="advanced-card-heading"><div><p className="kicker">Level 3 · campaign correlation</p><h2>Personalized Link Tracking</h2></div><span className="classification-pill inferred">INFERRED</span></div>
              <p>The opaque identifier was assigned before the click. The browser did not discover or reveal the employee’s name.</p>
              <div className="correlation-flow">
                <div><span>Observed</span><code>{recipientId}</code><small>was present in the requested URL</small></div>
                <ArrowRight size={20} />
                <div><span>Campaign lookup</span><b>{employee.name}</b><small>{employee.department}</small></div>
              </div>
              <div className="proof-grid">
                <div className="observed"><Eye size={15} /><span><b>Observed</b>Link associated with {recipientId} was requested.</span></div>
                <div className="inferred"><Database size={15} /><span><b>Inferred from existing data</b>{recipientId} is assigned to {employee.name}.</span></div>
                <div className="not-proven"><AlertTriangle size={15} /><span><b>Not proven</b>The person who clicked was {employee.name}.</span></div>
              </div>
              <p className="lesson-callout"><Info size={16} /> Links can be forwarded or opened by another person, a preview service, or an automated security scanner.</p>
            </div>
          ) : flow.module === 'form' ? (
            <div className="form-card">
              <div className="form-header">
                <p className="kicker">{landingCopy.eyebrow}</p>
                <h2>{landingCopy.title}</h2>
                <p>Use the provided synthetic values. Real names and credentials are rejected.</p>
              </div>
              <form onSubmit={flow.submit}>
                <label>Fictional employee name
                  <input aria-label="Fictional employee name" value={flow.employeeName} onChange={(event) => flow.setEmployeeName(event.target.value)} autoComplete="off" />
                  <small>Must end in “Example”</small>
                </label>
                <label>Training verification code
                  <input aria-label="Training verification code" value={flow.verificationCode} onChange={(event) => flow.setVerificationCode(event.target.value)} autoComplete="off" />
                  <small>Must begin with “DEMO-”</small>
                </label>
                {flow.error && <p className="form-error" role="alert"><AlertTriangle size={14} /> {flow.error}</p>}
                <button className="primary-button w-full" disabled={flow.busy || disabled} type="submit" data-testid="submit-training-data">
                  <Send size={15} /> {flow.busy ? 'Sending to local server…' : 'Submit training data'}
                </button>
              </form>
              <p className="privacy-note"><ShieldCheck size={13} /> In-memory only · no account access · no external transmission</p>
            </div>
          ) : flow.module === 'compromise' ? (
            <div className="advanced-card compromise-card" data-testid="browser-compromise-simulation">
              <div className="advanced-card-heading"><div><p className="kicker">Level 4 · hypothetical scenario</p><h2>What If the Browser Were Vulnerable?</h2></div><span className="classification-pill simulated">SIMULATED</span></div>
              <p>Under normal browser and operating-system rules, an arbitrary page cannot simply read private documents or another application’s authenticated session.</p>
              <div className="protected-list">
                <ProtectedResource icon={FileText} label="Fictional document" value={`${syntheticProtectedData.document.name} · ${syntheticProtectedData.document.contents}`} revealed={Boolean(flow.compromise)} />
                <ProtectedResource icon={UserRound} label="Fictional profile" value={`${syntheticProtectedData.profile.name} · ${syntheticProtectedData.profile.employeeNumber}`} revealed={Boolean(flow.compromise)} />
                <ProtectedResource icon={HardDrive} label="Fictional confidential note" value={syntheticProtectedData.note} revealed={Boolean(flow.compromise)} />
                <ProtectedResource icon={KeyRound} label="Fictional app session" value={`${syntheticProtectedData.session.application} · ${syntheticProtectedData.session.status}`} revealed={Boolean(flow.compromise)} />
              </div>
              {!flow.compromise ? (
                <button className="danger-demo-button" onClick={flow.simulateCompromise} disabled={flow.busy || disabled} data-testid="simulate-boundary-failure"><ShieldAlert size={16} /> Simulate Browser Security Boundary Failure</button>
              ) : (
                <div className="simulation-warning"><Sparkles size={17} /><span><b>SIMULATION ONLY</b>These values were authored inside the lab. No real exploit, file, cookie, token, or session was accessed.</span></div>
              )}
              <p className="boundary-note"><ShieldCheck size={14} /> Vulnerabilities can undermine specific protections, but not every browser flaw produces full system compromise.</p>
            </div>
          ) : (
            <div className="advanced-card defense-card" data-testid="defense-module">
              <div className="advanced-card-heading"><div><p className="kicker">Defense in depth</p><h2>Interrupt the attack at multiple stages</h2></div><ShieldCheck size={24} /></div>
              <div className="defense-grid">
                <div><span>01</span><b>Before the click</b><p>Pause, inspect the sender and destination, and verify urgent requests independently.</p></div>
                <div><span>02</span><b>At the network edge</b><p>Secure email, DNS, URL rewriting, web filtering, and isolation can block risky destinations.</p></div>
                <div><span>03</span><b>In the browser</b><p>Automatic updates, reduced script exposure, and browser sandboxing limit exploit opportunities.</p></div>
                <div><span>04</span><b>On the device</b><p>Managed patching, least privilege, EDR, and OS security policies reduce consequences.</p></div>
              </div>
              <div className="lesson-callout"><ShieldCheck size={16} /><span><b>Central lesson</b>A click exposes some data through normal web communication. More serious exposure requires additional actions or a real security failure.</span></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`victim-panel ${compact ? 'compact' : ''}`} data-testid="victim-panel">
      <InboxChrome>
        <div className="mail-layout">
          <aside className="mail-sidebar">
            <button className="compose"><Mail size={15} /> Compose</button>
            <button className="folder active"><Inbox size={15} /><span>Inbox</span><b>1</b></button>
            <button className="folder"><Send size={15} /><span>Sent</span></button>
            <div className="sidebar-safety"><ShieldCheck size={15} /><span>This is a simulation.<br />No real mail is connected.</span></div>
          </aside>
          <div className="message-list">
            <div className="list-heading"><span>Focused</span><small>1 simulated message</small></div>
            <button className="message-row selected" onClick={flow.openEmail} data-testid="open-email">
              <span className="unread-dot" />
              <span className="message-avatar">{scenario.senderName.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 text-left">
                <b>{scenario.senderName.split(' · ')[0]}</b>
                <strong>{scenario.subject}</strong>
                <small>{scenario.preview}</small>
              </span>
              <time>10:42</time>
            </button>
          </div>
          <main className="mail-reader">
            {flow.stage === 'inbox' ? (
              <div className="empty-reader">
                <Mail size={34} />
                <h3>Select the unread message</h3>
                <p>Then examine the story, sender, and destination separately.</p>
                <button className="primary-button" onClick={flow.openEmail} disabled={disabled}><MousePointer2 size={15} /> Open message</button>
              </div>
            ) : (
              <article className="email-content">
                <div className="email-subject">
                  <span className="external-pill">EXTERNAL</span>
                  <h2>{scenario.subject}</h2>
                  <p><Clock3 size={13} /> Today, 10:42 AM</p>
                </div>
                <button className="sender-card" onClick={flow.inspectSender} data-testid="inspect-sender">
                  <span className="message-avatar large">{scenario.senderName.slice(0, 1)}</span>
                  <span><b>{scenario.senderName}</b><small>to {employee.name} <ChevronDown size={12} /></small></span>
                </button>
                {flow.senderOpen && (
                  <div className="inspection-popover" data-testid="sender-details">
                    <span>Actual sender address</span><code>{scenario.senderEmail}</code>
                    <p><AlertTriangle size={13} /> A display name is easy to imitate. Read the full address.</p>
                  </div>
                )}
                <div className="email-body">
                  <p>{scenario.greeting.includes('Alex') ? `Hello ${employee.name.split(' ')[0]},` : scenario.greeting}</p>
                  {scenario.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  <button className="email-cta" onMouseEnter={flow.inspectLink} onFocus={flow.inspectLink} onClick={flow.visit} disabled={flow.busy || disabled} data-testid="open-training-link">
                    {flow.busy ? 'Opening local page…' : scenario.callToAction} <ArrowRight size={15} />
                  </button>
                  <button className="inspect-link" onClick={flow.inspectLink} data-testid="inspect-link"><Eye size={14} /> Inspect destination before opening</button>
                  {flow.linkOpen && <div className="link-preview"><Globe2 size={14} /><span>Actual destination</span><code>{trainingUrl(scenarioId, recipientId)}</code></div>}
                  {flow.error && <p className="form-error" role="alert"><AlertTriangle size={14} /> {flow.error}</p>}
                  <p>Thank you,<br /><b>{scenario.senderName.split(' · ')[0]}</b><br /><span className="muted">{scenario.eyebrow} · Meridian Example Group</span></p>
                </div>
              </article>
            )}
          </main>
        </div>
      </InboxChrome>
    </div>
  );
}

function EventBadge({ evidence, kind }: { evidence: EvidenceClass; kind?: LabEvent['kind'] }) {
  const content = evidence === 'observed'
    ? [kind === 'http' ? 'OBSERVED · HTTP' : 'OBSERVED', Network]
    : evidence === 'inferred' ? ['INFERRED', Database] : ['SIMULATED', Sparkles];
  const Icon = content[1] as typeof Network;
  return <span className={`event-badge ${evidence}`}><Icon size={11} />{content[0] as string}</span>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value));
}

function Timeline({ events, selectedId, onSelect, compact = false }: { events: LabEvent[]; selectedId?: string; onSelect: (event: LabEvent) => void; compact?: boolean }) {
  return (
    <div className={`timeline ${compact ? 'compact' : ''}`} data-testid="event-timeline">
      {events.length === 0 ? (
        <div className="empty-timeline"><Activity size={24} /><b>Listening for local activity</b><span>Victim actions will appear here in real time.</span></div>
      ) : [...events].reverse().map((event) => (
        <button key={event.id} className={`timeline-row ${selectedId === event.id ? 'selected' : ''}`} onClick={() => onSelect(event)} data-event-type={event.type}>
          <time>{formatTime(event.timestamp)}</time>
          <span className={`timeline-node ${event.evidence}`} />
          <span className="timeline-content"><b>{event.title}</b><EventBadge evidence={event.evidence} kind={event.kind} /></span>
          <ArrowRight size={13} />
        </button>
      ))}
    </div>
  );
}

function CodeLine({ label, value, accent = false }: { label: string; value: string | number | boolean | null | undefined; accent?: boolean }) {
  const shown = value === null || value === undefined || value === '' ? 'Not provided' : String(value);
  return <div className="code-line"><span>{label}</span><code className={accent ? 'accent' : ''}>{shown}</code></div>;
}

type ExplanationMode = 'simple' | 'technical' | 'both';

function EventInspector({ event, compact = false, explanationMode = 'both' }: { event?: LabEvent; compact?: boolean; explanationMode?: ExplanationMode }) {
  if (!event) return <div className="inspector-empty"><FileSearch size={26} /><b>Select an event</b><span>Its evidence and explanation will appear here.</span></div>;
  return (
    <div className={`event-inspector ${compact ? 'compact' : ''}`} data-testid="event-inspector">
      <div className="inspector-heading"><EventBadge evidence={event.evidence} kind={event.kind} /><time>{formatTime(event.timestamp)}</time></div>
      <h3>{event.title}</h3>
      {event.http ? (
        <div className="http-block">
          <CodeLine label="method" value={event.http.method} accent />
          <CodeLine label="path" value={event.http.path} />
          <CodeLine label="status" value={String(event.http.responseStatus)} />
          <CodeLine label="source ip" value={event.http.sourceIp} />
          {Object.keys(event.http.query).length === 0 && <CodeLine label="query parameters" value={null} />}
          {Object.entries(event.http.query).map(([key, value]) => <CodeLine key={key} label={`query · ${key}`} value={value} />)}
          {Object.entries(event.http.headers).map(([key, value]) => <CodeLine key={key} label={`header · ${key}`} value={value} />)}
          {event.http.formValues && <>
            <CodeLine label="form · employee" value={event.http.formValues.employeeName} accent />
            <CodeLine label="form · code" value={event.http.formValues.verificationCode} accent />
          </>}
          {event.http.browserProperties && Object.entries(event.http.browserProperties).map(([key, value]) => <CodeLine key={key} label={`browser · ${key}`} value={value} accent />)}
        </div>
      ) : <div className="not-http"><Info size={16} /> This event is intentionally not presented as HTTP evidence.</div>}
      {event.identity && <div className="identity-inspector">
        <CodeLine label="observed" value={event.identity.observed} />
        <CodeLine label="inferred" value={event.identity.inferred} accent />
        <CodeLine label="not proven" value={event.identity.notProven} />
      </div>}
      {event.compromise && <div className="simulation-data"><b>Fictional data shown by simulation</b><span>{event.compromise.document.name}</span><span>{event.compromise.profile.employeeNumber}</span><span>{event.compromise.session.status}</span></div>}
      {(explanationMode === 'simple' || explanationMode === 'both') && <div className="explanation simple"><UserRound size={15} /><span><b>In plain language</b>{event.simple}</span></div>}
      {(explanationMode === 'technical' || explanationMode === 'both') && <div className="explanation technical"><Code2 size={15} /><span><b>Technical view</b>{event.technical}</span></div>}
      {event.mitigation && <div className="explanation mitigation"><ShieldCheck size={15} /><span><b>Protection / mitigation</b>{event.mitigation}</span></div>}
      {event.http?.sourceIp === '127.0.0.1' && <p className="loopback-note"><Wifi size={13} /><span><b>127.0.0.1</b> is the loopback address because browser and server are on this computer.</span></p>}
      {event.type === 'http_get' && <div className="metadata-context">
        <p><b>Source IP</b>This is the address observed by the server. Locally, it is normally 127.0.0.1.</p>
        <p><b>User-Agent</b>May describe the browser and platform, though modern browsers can reduce detail.</p>
        <p><b>Referer</b>May reveal the previous page, subject to browser and site privacy policies.</p>
        <p><b>Query parameters</b>Values embedded in the URL are normally sent when that URL is requested.</p>
      </div>}
    </div>
  );
}

type ObserverTab = 'impact' | 'timeline' | 'analysis' | 'lifecycle';

const lifecycleStages = [
  { id: 'message', title: 'Fictional message', evidence: 'simulated' as const, event: 'email_opened', happened: 'A fictional social-engineering message is opened in the training inbox.', available: 'A social-engineering story and local demonstration link.', condition: 'The recipient opens the simulated message.', defense: 'Email filtering, awareness, and independent verification.' },
  { id: 'click', title: 'Victim clicks URL', evidence: 'simulated' as const, event: 'form_displayed', happened: 'The simulator directs the browser to the local demonstration URL.', available: 'The visible destination and its personalized query value.', condition: 'The recipient chooses to open the link.', defense: 'URL inspection, DNS/web filtering, and browser isolation.' },
  { id: 'metadata', title: 'Server receives metadata', evidence: 'observed' as const, event: 'http_get', happened: 'The loopback server genuinely receives and records an HTTP GET.', available: 'Request path, IP, query parameters, allowlisted headers, timestamp, and response status.', condition: 'The browser requests the destination.', defense: 'Secure web gateways and destination reputation controls.' },
  { id: 'browser-read', title: 'JavaScript reads properties', evidence: 'simulated' as const, event: 'form_displayed', happened: 'Page JavaScript reads a small allowlist through standard browser APIs.', available: 'Language, platform, dimensions, timezone, pixel ratio, and touch support in the page.', condition: 'Page JavaScript executes; values remain page-local.', defense: 'Limit unnecessary scripts and use updated browsers.' },
  { id: 'browser-send', title: 'Properties transmitted', evidence: 'observed' as const, event: 'browser_properties_transmitted', happened: 'A separate genuine POST sends the displayed allowlist to the local server.', available: 'The allowlisted browser properties become server-visible.', condition: 'The explicit “Transmit demo properties” action is selected.', defense: 'Script controls, privacy protections, and isolation.' },
  { id: 'correlation', title: 'Identity correlated', evidence: 'inferred' as const, event: 'identity_correlated', happened: 'The opaque URL identifier is matched to fictional campaign data that already existed.', available: 'A fictional campaign identity associated with the opaque link ID.', condition: 'The identifier already exists in campaign data.', defense: 'Do not forward suspicious personalized links; account for scanners.' },
  { id: 'form', title: 'Synthetic form submitted', evidence: 'observed' as const, event: 'http_post', happened: 'A genuine POST carries the two synthetic values chosen in the form.', available: 'Only the two explicitly submitted training values.', condition: 'The user selects Submit.', defense: 'Verify the destination and the need for requested data.' },
  { id: 'compromise', title: 'Hypothetical vulnerability', evidence: 'simulated' as const, event: 'compromise_simulated', happened: 'The presenter activates a state transition representing a browser security failure; no exploit runs.', available: 'Only the lab’s pre-authored fictional protected data.', condition: 'A serious hypothetical vulnerability would first have to defeat relevant browser protections.', defense: 'Automatic updates, managed patching, least privilege, and EDR.' },
  { id: 'consequence', title: 'Potential consequences', evidence: 'simulated' as const, event: 'compromise_simulated', happened: 'The lab visualizes the categories of information that could be at risk after a boundary failure.', available: 'A fictional document, profile, company note, and application session placeholder.', condition: 'Impact depends on the vulnerability, privileges, sandbox, and other defenses; full compromise is not automatic.', defense: 'Defense in depth, segmentation, application isolation, monitoring, and incident response.' },
];

function AttackLifecycle({ events, compact = false }: { events: LabEvent[]; compact?: boolean }) {
  const [selectedId, setSelectedId] = useState('click');
  const selected = lifecycleStages.find(({ id }) => id === selectedId)!;
  const happened = new Set(events.map(({ type }) => type));
  return (
    <div className={`lifecycle-view ${compact ? 'compact' : ''}`} data-testid="attack-lifecycle">
      <div className="lifecycle-rail">
        {lifecycleStages.map((stage, index) => (
          <button key={stage.id} className={`${selectedId === stage.id ? 'selected' : ''} ${happened.has(stage.event as EventType) ? 'reached' : ''}`} onClick={() => setSelectedId(stage.id)}>
            <span>{String(index + 1).padStart(2, '0')}</span><i className={stage.evidence} /><b>{stage.title}</b>
          </button>
        ))}
      </div>
      <div className="lifecycle-detail">
        <EventBadge evidence={selected.evidence} />
        <h3>{selected.title}</h3>
        <dl>
          <div><dt>What happened</dt><dd>{selected.happened}</dd></div>
          <div><dt>What information was available</dt><dd>{selected.available}</dd></div>
          <div><dt>Additional condition</dt><dd>{selected.condition}</dd></div>
          <div><dt>Defense that can interrupt it</dt><dd>{selected.defense}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function ExposureCard({ title, icon: Icon, event, empty, interaction }: { title: string; icon: typeof Network; event?: LabEvent; empty: string; interaction: string }) {
  return (
    <article className={`exposure-card ${event?.evidence ?? 'empty'}`}>
      <div className="exposure-heading"><span><Icon size={14} /></span><div><small>{event ? event.evidence : 'not available'}</small><b>{title}</b></div></div>
      <div className="exposure-explanations">
        <p><b>Plain language</b>{event?.simple ?? empty}</p>
        <p><b>Technical</b>{event?.technical ?? 'No event has made this category available to the server.'}</p>
      </div>
      <dl>
        <div><dt>Source</dt><dd>{event?.kind === 'http' ? 'Genuine local HTTP request' : event?.evidence === 'inferred' ? 'Fictional preexisting campaign data' : event ? 'Training simulation' : '—'}</dd></div>
        <div><dt>Interaction</dt><dd>{interaction}</dd></div>
        <div><dt>Protection</dt><dd>{event?.mitigation ?? 'No data at this stage.'}</dd></div>
      </dl>
    </article>
  );
}

function ExposureAnalysis({ events, compact = false }: { events: LabEvent[]; compact?: boolean }) {
  const latest = (type: EventType) => [...events].reverse().find((event) => event.type === type);
  const get = latest('http_get');
  const browser = latest('browser_properties_transmitted');
  const identity = latest('identity_correlated');
  const form = latest('http_post');
  const compromise = latest('compromise_simulated');
  const stages = [
    ['Before clicking', 'Campaign identity and personalized link assignment only.', true],
    ['After clicking', 'HTTP metadata and URL parameters available.', Boolean(get)],
    ['After browser transmission', 'Allowlisted JavaScript-readable properties available.', Boolean(browser)],
    ['After form submission', 'Explicit synthetic form values available.', Boolean(form)],
    ['After simulated vulnerability', 'Fictional protected data shown as a hypothetical consequence.', Boolean(compromise)],
  ] as const;
  return (
    <div className={`exposure-analysis ${compact ? 'compact' : ''}`} data-testid="exposure-analysis">
      <div className="exposure-panels">
        <ExposureCard title="A · HTTP metadata" icon={Network} event={get} empty="No training-page GET observed yet." interaction="Opening the destination URL" />
        <ExposureCard title="B · Browser properties" icon={MonitorSmartphone} event={browser} empty="Properties may be visible in the page, but none were sent." interaction="Explicit ‘Transmit demo properties’ action" />
        <ExposureCard title="C · Identity correlation" icon={UserCheck} event={identity} empty="No personalized identifier has been correlated." interaction="Requesting a URL containing a known synthetic ID" />
        <ExposureCard title="D · Simulated compromise" icon={ShieldAlert} event={compromise} empty="The protected-data simulation has not been activated." interaction="Presenter activates a clearly labeled simulation" />
      </div>
      <div className="knowledge-delta">
        <div className="knowledge-title"><Layers3 size={14} /><span><b>What changed?</b>Before → after comparison</span></div>
        {stages.map(([title, text, reached]) => <div key={title} className={reached ? 'reached' : ''}><i /><span><b>{title}</b>{text}</span></div>)}
      </div>
    </div>
  );
}

function summarizeUserAgent(value: string | null | undefined) {
  if (!value) return 'Não informado';
  if (/Edg\//.test(value)) return 'Microsoft Edge';
  if (/Chrome\//.test(value)) return 'Google Chrome';
  if (/Firefox\//.test(value)) return 'Mozilla Firefox';
  if (/Safari\//.test(value)) return 'Apple Safari';
  return 'Navegador não identificado';
}

function AttackerAccessList({ state, compact = false }: { state: LabState; compact?: boolean }) {
  const latest = (type: EventType) => [...state.events].reverse().find((event) => event.type === type);
  const visit = latest('http_get');
  const browser = latest('browser_properties_transmitted');
  const identity = latest('identity_correlated');
  const form = latest('http_post');
  const compromise = latest('compromise_simulated');
  const employee = identity?.identity?.employee ?? fictionalEmployees[state.recipientId];
  const properties = browser?.http?.browserProperties;
  const formValues = form?.http?.formValues;
  const items: Array<{ id: string; label: string; value: string; evidence: EvidenceClass; icon: typeof UserRound }> = [
    { id: 'identity', label: 'Pessoa associada ao link', value: `${employee.name} · ${employee.department}`, evidence: 'inferred', icon: UserRound },
  ];

  if (visit?.http) {
    items.push(
      { id: 'ip', label: 'Endereço visto pelo servidor', value: visit.http.sourceIp, evidence: 'observed', icon: Wifi },
      { id: 'browser', label: 'Navegador utilizado', value: summarizeUserAgent(visit.http.headers['user-agent']), evidence: 'observed', icon: Globe2 },
      { id: 'language', label: 'Idioma preferido', value: visit.http.headers['accept-language'] ?? 'Não informado', evidence: 'observed', icon: BookOpen },
      { id: 'tracking-id', label: 'Identificador do link', value: visit.http.query.recipient ?? 'Não informado', evidence: 'observed', icon: Link2 },
    );
  }

  if (properties) {
    items.push(
      { id: 'platform', label: 'Sistema informado pelo navegador', value: properties.platform, evidence: 'observed', icon: Laptop },
      { id: 'timezone', label: 'Fuso horário', value: properties.timezone, evidence: 'observed', icon: Clock3 },
      { id: 'screen', label: 'Tamanho da tela', value: `${properties.screenWidth} × ${properties.screenHeight} · ${properties.devicePixelRatio}×`, evidence: 'observed', icon: MonitorSmartphone },
      { id: 'touch', label: 'Suporte a toque', value: properties.touchSupported ? 'Detectado' : 'Não detectado', evidence: 'observed', icon: Fingerprint },
    );
  }

  if (formValues) {
    items.push(
      { id: 'form-name', label: 'Nome preenchido no formulário', value: formValues.employeeName, evidence: 'observed', icon: UserCheck },
      { id: 'form-code', label: 'Código informado', value: formValues.verificationCode, evidence: 'observed', icon: KeyRound },
    );
  }

  if (compromise?.compromise) {
    items.push(
      { id: 'document', label: 'Documento fictício', value: compromise.compromise.document.name, evidence: 'simulated', icon: FileText },
      { id: 'profile', label: 'Perfil fictício', value: compromise.compromise.profile.employeeNumber, evidence: 'simulated', icon: UserRound },
      { id: 'internal-note', label: 'Nota interna fictícia', value: 'Conteúdo de treinamento revelado', evidence: 'simulated', icon: Clipboard },
      { id: 'session', label: 'Sessão fictícia', value: compromise.compromise.session.application, evidence: 'simulated', icon: Unlock },
    );
  }

  const headline = compromise
    ? 'Lista completa da demonstração'
    : form
      ? 'Os dados digitados foram adicionados'
      : browser
        ? 'O dispositivo revelou novas características'
        : visit
          ? 'O clique adicionou dados da conexão'
          : 'Aguardando o clique da vítima';
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    window.requestAnimationFrame(() => list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' }));
  }, [items.length]);

  return (
    <div className={`access-panel ${compact ? 'compact' : ''}`} data-testid="attacker-access-list">
      <header className="access-header">
        <div>
          <p>SERVIDOR DO ATACANTE</p>
          <h2>Informações disponíveis agora</h2>
          <span>A lista cresce somente quando um novo dado passa a estar disponível.</span>
        </div>
        <div className="access-count" aria-label={`${items.length} ${items.length === 1 ? 'informação disponível' : 'informações disponíveis'}`}><b>{items.length}</b><span>{items.length === 1 ? 'informação' : 'informações'}</span></div>
      </header>

      <div className="access-status"><span><i className="pulse-dot" />{headline}</span><small>atualização em tempo real</small></div>

      <ol className="access-list" ref={listRef}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const badge = item.evidence === 'observed' ? 'recebido' : item.evidence === 'inferred' ? 'já conhecido' : 'simulado';
          return (
            <li key={item.id} className={item.evidence} data-testid={`leak-item-${item.id}`}>
              <span className="access-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="access-icon"><Icon size={15} /></span>
              <span className="access-copy"><small>{item.label}</small><b>{item.value}</b></span>
              <span className={`access-source ${item.evidence}`}>{badge}</span>
            </li>
          );
        })}
      </ol>

      <div className={`access-next ${compromise ? 'complete' : ''}`}>
        {compromise ? <><ShieldAlert size={16} /><span><b>Itens roxos são uma simulação</b>Nenhum arquivo, cookie ou sessão real foi acessado.</span></> : <><CircleDot size={16} /><span><b>Aguardando a próxima ação</b>Novas informações aparecerão aqui, sem exibir eventos que não ampliam o vazamento.</span></>}
      </div>
    </div>
  );
}

function Counter({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone: string }) {
  return <div className={`counter ${tone}`}><span><Icon size={16} /></span><div><b>{value}</b><small>{label}</small></div></div>;
}

function AttackerPanel({ state, compact = false, onScenario, onRecipient, explanationMode = 'both', focusTab }: {
  state: LabState;
  compact?: boolean;
  onScenario?: (id: ScenarioId) => void;
  onRecipient?: (id: RecipientId) => void;
  explanationMode?: ExplanationMode;
  focusTab?: ObserverTab;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [tab, setTab] = useState<ObserverTab>(focusTab ?? 'timeline');
  const selected = state.events.find((event) => event.id === selectedId) ?? state.events.at(-1);
  useEffect(() => {
    if (state.events.length) setSelectedId(state.events.at(-1)!.id);
  }, [state.events.length]);
  useEffect(() => {
    if (focusTab) setTab(focusTab);
  }, [focusTab]);
  const requests = state.events.filter(({ kind }) => kind === 'http');
  const visits = state.events.filter(({ type }) => type === 'http_get');
  const submissions = state.events.filter(({ type }) => type === 'http_post');
  const scenario = scenarios[state.scenarioId];

  if (compact) {
    return <div className="attacker-panel compact clean-server-view" data-testid="attacker-panel"><AttackerAccessList state={state} compact /></div>;
  }

  return (
    <div className={`attacker-panel ${compact ? 'compact' : ''}`} data-testid="attacker-panel">
      <div className="observer-header">
        <div><p className="kicker">Servidor receptor · visão local</p><h2>O que a página conseguiu coletar</h2></div>
        {onScenario && <div className="observer-selects"><ScenarioSelect value={state.scenarioId} onChange={onScenario} compact />{onRecipient && <RecipientSelect value={state.recipientId} onChange={onRecipient} compact />}</div>}
      </div>
      <div className="counter-grid">
        <Counter label="visitas à página" value={visits.length} icon={Globe2} tone="cyan" />
        <Counter label="requisições HTTP" value={requests.length} icon={Network} tone="violet" />
        <Counter label="dados enviados" value={submissions.length} icon={Send} tone="amber" />
      </div>
      {!compact && (
        <div className="campaign-strip">
          <div><span>ACTIVE FICTIONAL CAMPAIGN · {state.recipientId}</span><b>{scenario.subject}</b></div>
          <button className="copy-button" onClick={() => navigator.clipboard.writeText(trainingUrl(state.scenarioId, state.recipientId))}><Copy size={13} /> Copy personalized local link</button>
        </div>
      )}
      <div className="observer-tabs" role="tablist" aria-label="Observer analysis views">
        <button className={tab === 'impact' ? 'active impact' : ''} onClick={() => setTab('impact')}><Eye size={12} /> Dossiê do atacante</button>
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}><Activity size={12} /> Linha do tempo</button>
        <button className={tab === 'analysis' ? 'active' : ''} onClick={() => setTab('analysis')}><Layers3 size={12} /> Análise por nível</button>
        <button className={tab === 'lifecycle' ? 'active' : ''} onClick={() => setTab('lifecycle')}><Link2 size={12} /> Ciclo do ataque</button>
      </div>
      {tab === 'impact' ? <AttackerAccessList state={state} compact={compact} /> : tab === 'timeline' ? (
        <div className="observer-grid">
          <section className="panel-card timeline-card">
            <div className="panel-title"><span><Activity size={14} /> Eventos recebidos ao vivo</span><small><i className="pulse-dot" /> atualização automática</small></div>
            <Timeline events={state.events} selectedId={selected?.id} onSelect={(event) => setSelectedId(event.id)} compact={compact} />
          </section>
          <section className="panel-card inspector-card">
            <div className="panel-title"><span><FileSearch size={14} /> Detalhes da evidência</span><small>somente dados permitidos</small></div>
            <EventInspector event={selected} compact={compact} explanationMode={explanationMode} />
          </section>
        </div>
      ) : tab === 'analysis' ? <ExposureAnalysis events={state.events} compact={compact} /> : <AttackLifecycle events={state.events} compact={compact} />}
    </div>
  );
}

function MessagePreview({ scenarioId, recipientId }: { scenarioId: ScenarioId; recipientId: RecipientId }) {
  const scenario = scenarios[scenarioId];
  return (
    <section className="message-preview panel-card">
      <div className="panel-title"><span><Mail size={14} /> Message preview</span><small>not delivered externally</small></div>
      <div className="preview-email">
        <div><span>FROM</span><b>{scenario.senderName}</b><code>{scenario.senderEmail}</code></div>
        <div><span>SUBJECT</span><b>{scenario.subject}</b></div>
        <p>{scenario.paragraphs[0]}</p>
        <span className="fake-cta">{scenario.callToAction}</span>
        <div className="preview-url"><Globe2 size={13} />{trainingUrl(scenarioId, recipientId)}</div>
      </div>
      <div className="objective-box"><BookOpen size={16} /><span><b>Teaching objective</b>{scenario.objective}</span></div>
    </section>
  );
}

function ObserverSummary({ state }: { state: LabState }) {
  const has = (type: EventType) => state.events.some((event) => event.type === type);
  const clicked = has('http_get');
  const browserShared = has('browser_properties_transmitted');
  const formSubmitted = has('http_post');
  const compromiseShown = has('compromise_simulated');
  const received = (clicked ? 4 : 0) + (browserShared ? 4 : 0) + (formSubmitted ? 2 : 0);
  const simulated = compromiseShown ? 4 : 0;
  const total = 1 + received + simulated;
  const phase = compromiseShown
    ? ['Impacto máximo demonstrado', 'Além dos dados realmente recebidos, a tela mostra quatro consequências hipotéticas claramente marcadas como simulação.']
    : formSubmitted
      ? ['Dados digitados foram enviados', 'O servidor já conhece a conexão, o dispositivo e os valores preenchidos no formulário fictício.']
      : browserShared
        ? ['Dispositivo reconhecido', 'O clique já foi relacionado à pessoa fictícia e novas características do navegador chegaram ao servidor.']
        : clicked
          ? ['O link foi aberto', 'A conexão entregou metadados e o identificador personalizado presente no endereço.']
          : ['Antes do clique', 'O atacante conhece somente a pessoa associada ao link personalizado da campanha fictícia.'];

  return (
    <aside className="observer-summary" data-testid="observer-summary">
      <section className="observer-risk-card">
        <div className="observer-risk-heading"><span><i className="pulse-dot" /> SITUAÇÃO ATUAL</span><b>{total}</b></div>
        <h2>{phase[0]}</h2>
        <p>{phase[1]}</p>
        <div className="observer-counts">
          <div className="inferred"><b>1</b><span>já conhecido</span></div>
          <div className="observed"><b>{received}</b><span>recebidos</span></div>
          <div className="simulated"><b>{simulated}</b><span>simulados</span></div>
        </div>
      </section>

      <section className="observer-legend-card">
        <p>COMO INTERPRETAR</p>
        <h3>Nem tudo veio do clique</h3>
        <div className="observer-legend-row inferred"><Database size={18} /><span><b>Já conhecido</b>Informação que existia na campanha antes da vítima agir.</span></div>
        <div className="observer-legend-row observed"><Network size={18} /><span><b>Recebido de verdade</b>Dado que chegou ao servidor local por uma requisição.</span></div>
        <div className="observer-legend-row simulated"><Sparkles size={18} /><span><b>Somente simulação</b>Consequência hipotética; nenhum arquivo ou login real foi acessado.</span></div>
      </section>

      <section className="observer-takeaway">
        <ShieldAlert size={22} />
        <span><b>Mensagem principal</b>Um único clique inicia a correlação. Cada ação seguinte aumenta o que o atacante consegue saber.</span>
      </section>
    </aside>
  );
}

function AttackerView({ lab }: { lab: ReturnType<typeof useLab> }) {
  const scenario = scenarios[lab.state.scenarioId];
  const employee = fictionalEmployees[lab.state.recipientId];
  return (
    <Shell connected={lab.connected} reset={lab.reset}>
      <main className="page-shell observer-page">
        <div className="page-heading observer-page-heading">
          <div><p className="kicker">VISÃO DO ATACANTE</p><h1>O que o atacante sabe agora</h1><p>Apenas informações que realmente ampliam o vazamento aparecem nesta tela.</p></div>
          <div className="observer-selects"><ScenarioSelect value={lab.state.scenarioId} onChange={lab.selectScenario} /><RecipientSelect value={lab.state.recipientId} onChange={lab.selectRecipient} /></div>
        </div>
        <section className="observer-context" aria-label="Contexto da demonstração">
          <div><span>CAMPANHA FICTÍCIA</span><b>{scenario.subject}</b></div>
          <div><span>PESSOA ASSOCIADA</span><b>{employee.name} · {employee.department}</b></div>
        </section>
        <div className="observer-focus-grid">
          <AttackerAccessList state={lab.state} />
          <ObserverSummary state={lab.state} />
        </div>
      </main>
    </Shell>
  );
}

function VictimView({ lab, directScenario, directRecipient }: { lab: ReturnType<typeof useLab>; directScenario?: ScenarioId; directRecipient?: RecipientId }) {
  const scenarioId = directScenario ?? lab.state.scenarioId;
  const recipientId = directRecipient ?? lab.state.recipientId;
  const flow = useVictimFlow(scenarioId, recipientId, directScenario ? 'landing' : 'inbox', lab.resetVersion);
  useEffect(() => {
    if (directScenario) void reportClientEvent('form_displayed', directScenario);
  }, [directScenario]);
  return (
    <Shell connected={lab.connected} reset={lab.reset}>
      <main className="page-shell victim-page">
        {!directScenario && <div className="page-heading"><div><p className="kicker">Perspective 01</p><h1>{fictionalEmployees[recipientId].name}’s simulated workday</h1><p>A fictional inbox for learning how to pause, inspect, and verify.</p></div><div className="heading-selects"><ScenarioSelect value={scenarioId} onChange={lab.selectScenario} /><RecipientSelect value={recipientId} onChange={lab.selectRecipient} /></div></div>}
        <VictimPanel scenarioId={scenarioId} recipientId={recipientId} flow={flow} />
      </main>
    </Shell>
  );
}

const demoDelay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function PresentationView({ lab }: { lab: ReturnType<typeof useLab> }) {
  const [mode, setMode] = useState<'impact' | 'free'>('impact');
  const [step, setStep] = useState(0);
  const [autoRunToken, setAutoRunToken] = useState(0);
  const [runningImpactDemo, setRunningImpactDemo] = useState(false);
  const [perspective, setPerspective] = useState<'split' | 'victim' | 'attacker'>('split');
  const flow = useVictimFlow(lab.state.scenarioId, lab.state.recipientId, 'inbox', lab.resetVersion);
  const scenario = scenarios[lab.state.scenarioId];

  const start = async () => {
    const scenarioId = lab.state.scenarioId;
    const recipientId = lab.state.recipientId;
    await lab.reset();
    await lab.selectScenario(scenarioId);
    await lab.selectRecipient(recipientId);
    flow.resetLocal();
    setStep(0);
  };

  const launchSophisticatedDemo = async () => {
    if (runningImpactDemo) return;
    await start();
    setPerspective('split');
    setAutoRunToken((value) => value + 1);
  };

  useEffect(() => {
    if (autoRunToken === 0) return;
    let cancelled = false;
    const run = async () => {
      setRunningImpactDemo(true);
      try {
        await flow.openEmail();
        await flow.inspectSender();
        await flow.inspectLink();
        if (cancelled) return;
        setStep(1);
        await demoDelay(600);

        await flow.visit();
        if (cancelled) return;
        setStep(2);
        await demoDelay(700);

        const properties = flow.showBrowserInfo();
        await flow.transmitBrowserProperties(properties);
        if (cancelled) return;
        setStep(3);
        await demoDelay(700);

        flow.showIdentity();
        setStep(4);
        await demoDelay(650);

        flow.showForm();
        await flow.submit();
        if (cancelled) return;
        setStep(5);
        await demoDelay(700);

        flow.showCompromise();
        await flow.simulateCompromise();
        if (cancelled) return;
        setStep(6);
        await demoDelay(900);

        flow.showDefense();
      } finally {
        if (!cancelled) setRunningImpactDemo(false);
      }
    };
    void run();
    return () => { cancelled = true; };
    // The token intentionally captures one fresh flow after reset and runs only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunToken]);

  const chooseScenario = async (scenarioId: ScenarioId) => {
    await lab.selectScenario(scenarioId);
    setStep(0);
  };

  const chooseRecipient = async (recipientId: RecipientId) => {
    await lab.selectRecipient(recipientId);
    setStep(0);
  };

  return (
    <Shell connected={lab.connected} reset={lab.reset}>
      <main className="presentation-shell">
        <section className="control-deck">
          <div className="control-title"><span className="live-tag"><i /> LIVE LAB</span><div><b>{scenario.shortName}</b><small>{scenario.objective}</small></div></div>
          <ScenarioSelect value={lab.state.scenarioId} onChange={chooseScenario} compact />
          <RecipientSelect value={lab.state.recipientId} onChange={chooseRecipient} compact />
          <div className="mode-toggle" role="group" aria-label="Presentation mode">
            <button className={mode === 'impact' ? 'active impact' : ''} onClick={() => setMode('impact')}>Ataque sofisticado</button>
            <button className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>Explorar livremente</button>
          </div>
          <div className="control-actions">
            <button onClick={start} disabled={runningImpactDemo}><RefreshCcw size={13} /> Reiniciar</button>
            {mode === 'impact' && <button className="impact-run-button" onClick={launchSophisticatedDemo} disabled={runningImpactDemo} data-testid="run-sophisticated-demo"><Zap size={13} /> {runningImpactDemo ? 'Ataque em andamento…' : 'Demonstrar ataque completo'}</button>}
          </div>
        </section>

        {mode === 'impact' && (
          <section className={`impact-guide ${runningImpactDemo ? 'running' : ''}`} data-testid="sophisticated-demo-guide">
            <span className="impact-guide-icon"><Fingerprint size={20} /></span>
            <div><p>CASO SOFISTICADO · EXTRAÇÃO MÁXIMA SEGURA</p><b>{runningImpactDemo ? 'Acompanhe o dossiê do atacante crescer em tempo real' : 'Mostre como pequenas exposições se acumulam em um grande risco'}</b><span>Metadados, correlação e dados enviados são reais no servidor local. Arquivos e sessões aparecem somente na etapa hipotética, sempre marcada como simulação.</span></div>
            <div className="impact-guide-progress"><span>{runningImpactDemo ? `Etapa ${Math.min(step + 1, 7)} de 7` : step >= 6 ? 'Demonstração concluída' : 'Pronto para iniciar'}</span><i><em style={{ width: `${runningImpactDemo || step > 0 ? ((step + 1) / 7) * 100 : 0}%` }} /></i></div>
          </section>
        )}

        <div className="perspective-switch" role="group" aria-label="Presentation perspective">
          <button className={perspective === 'split' ? 'active' : ''} onClick={() => setPerspective('split')}><Layers3 size={11} /> Lado a lado</button>
          <button className={perspective === 'victim' ? 'active' : ''} onClick={() => setPerspective('victim')}><Laptop size={11} /> Vítima</button>
          <button className={perspective === 'attacker' ? 'active' : ''} onClick={() => setPerspective('attacker')}><Server size={11} /> Atacante</button>
          <a href="/victim" target="_blank">Vítima ↗</a><a href="/attacker" target="_blank">Atacante ↗</a>
        </div>

        <div className={`split-labels focus-${perspective}`}>{perspective !== 'attacker' && <span><Laptop size={13} /> NAVEGADOR DA VÍTIMA</span>}{perspective !== 'victim' && <span><Server size={13} /> VISÃO DO ATACANTE</span>}</div>
        <div className={`presentation-grid focus-${perspective}`}>
          {perspective !== 'attacker' && <div className="perspective victim-perspective"><VictimPanel scenarioId={lab.state.scenarioId} recipientId={lab.state.recipientId} flow={flow} compact disabled={runningImpactDemo} /></div>}
          {perspective !== 'victim' && <div className="perspective attacker-perspective"><AttackerPanel state={lab.state} compact /></div>}
        </div>
        <footer className="presentation-footer">
          <span><ShieldCheck size={13} /> Ambiente local · identidades fictícias · memória apagada ao reiniciar</span>
          <span><Network size={13} /> Verde = observado · amarelo = inferido · roxo = simulado</span>
        </footer>
      </main>
    </Shell>
  );
}

function NotFound({ lab }: { lab: ReturnType<typeof useLab> }) {
  return <Shell connected={lab.connected} reset={lab.reset}><main className="not-found"><AlertTriangle size={36} /><h1>That training route does not exist.</h1><a className="primary-button" href="/presentation">Open presentation mode</a></main></Shell>;
}

export function App() {
  const lab = useLab();
  const path = window.location.pathname;
  const trainingMatch = path.match(/^\/training\/([^/]+)$/);
  if (trainingMatch) {
    const recipient = new URLSearchParams(window.location.search).get('recipient');
    return isScenarioId(trainingMatch[1])
      ? <VictimView lab={lab} directScenario={trainingMatch[1]} directRecipient={isRecipientId(recipient) ? recipient : undefined} />
      : <NotFound lab={lab} />;
  }
  if (path === '/victim') return <VictimView lab={lab} />;
  if (path === '/attacker') return <AttackerView lab={lab} />;
  if (path === '/' || path === '/presentation') return <PresentationView lab={lab} />;
  return <NotFound lab={lab} />;
}
