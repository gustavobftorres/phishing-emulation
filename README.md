# Signal & Shield — Local Phishing Awareness Lab

An interactive, two-sided phishing-awareness laboratory for corporate training. A fictional victim browser and a receiving-server observer share one local application, allowing an audience to distinguish what a server genuinely observes, what can only be inferred, and what is entirely simulated.

The laboratory is intentionally safe: it binds to `127.0.0.1`, sends no email, uses only `.example` identities and synthetic data, makes no runtime requests to external services, stores events only in memory, and does not contain an exploit.

## Install and run

Requirements: Node.js 20+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

Open:

- Presentation mode: <http://127.0.0.1:3000/presentation>
- Victim simulator: <http://127.0.0.1:3000/victim>
- Receiving-server observer: <http://127.0.0.1:3000/attacker>

Presentation mode is optimized for a 1920×1080 projector. For a production-style local run, use `pnpm build` followed by `pnpm start`.

## Advanced laboratory overview

The application retains the original phishing message, genuine GET/POST monitoring, and synthetic form flow, and adds four educational levels.

### Level 1 — HTTP request metadata

Opening the local link produces a genuine GET. The observer shows the timestamp, method, path, query parameters, loopback source IP, User-Agent, Accept, optional Accept-Language and Referer, and response status. A missing header is shown as **Not provided**; the lab never fabricates it.

This request does not reveal passwords, private files, or a confirmed human identity.

### Level 2 — Browser Information Exposure

The victim view reads a small, predefined set of values through ordinary browser APIs: language, browser-reported platform, screen and viewport dimensions, timezone, device pixel ratio, and touch support.

The interface first shows these values as **page local**. They reach the server only after **Transmit demo properties** triggers a separate genuine POST. The lab does not use canvas, WebGL, audio, installed-font, high-entropy, or persistent fingerprinting.

### Level 3 — Personalized Link Tracking

The observer can choose one of three fictional employees. The local URL contains an opaque identifier such as `recipient=demo-002`. When requested, the server matches that identifier to fictional campaign data it already held.

- Observed: a link associated with the identifier was requested.
- Inferred: the identifier is assigned to a named fictional employee.
- Not proven: that employee was the person who clicked.

The link could have been forwarded or opened by another person or an automated security scanner. The browser did not discover or disclose the employee’s name.

### Level 4 — What If the Browser Were Vulnerable?

The victim view depicts a fictional document, profile, company note, and application session as protected. Under normal browser rules, an arbitrary page cannot simply read these resources.

**Simulate Browser Security Boundary Failure** changes only application state and reveals constants bundled with the lab. It does not exploit the browser, bypass a sandbox or same-origin policy, request file access, or inspect the operating system. The timeline always marks this event **SIMULATED**.

## Architecture

- **React, Vite, and Tailwind CSS:** victim, observer, and projected split-screen experiences.
- **Express:** a single loopback-only backend and all genuine training GET/POST routes.
- **In-memory `LabStore`:** selected scenario, fictional recipient, and capped event history; no database or persistence.
- **Server-Sent Events:** one live state/event stream shared by every view.
- **Unified event model:** every event is classified as `observed`, `inferred`, or `simulated`.
- **Allowlisted capture:** only approved HTTP fields, synthetic form values, and explicitly transmitted demo properties.

No second backend or parallel event pipeline is used.

## Evidence classifications

| Classification | Meaning | Examples |
|---|---|---|
| **Observed** | Genuine activity received by the local server | GET metadata, browser-properties POST, synthetic form POST |
| **Inferred** | A conclusion drawn from fictional preexisting data | Recipient identifier mapped to a fictional employee |
| **Simulated** | A local UI action or hypothetical teaching state | Message open, page rendering, browser boundary failure |

The observer includes a live timeline, an event inspector, four Information Exposure Analysis panels, a before/after knowledge ladder, and a nine-stage clickable attack lifecycle.

### Sophisticated attack presentation mode

For a non-technical audience, select **Ataque sofisticado** in presentation mode and choose **Demonstrar ataque completo**. The lab then advances through the safe end-to-end scenario while a single Portuguese-language list of **Informações disponíveis agora** grows in real time.

Only information that expands the attacker’s knowledge appears in the presentation list; UI-only events and technical request bookkeeping stay out of the main story. Each row is labeled as already known, genuinely received, or simulated. The full technical timeline remains available on the dedicated observer route. This produces a strong “maximum exposure” story without claiming that an ordinary click automatically reads private files or authenticated sessions.

## 15–20 minute presenter guide

Use **Ataque sofisticado** and **Demonstrar ataque completo** for the complete automatic sequence. Use **Reiniciar** to clear the local evidence or switch to **Explorar livremente** to control the victim side manually. The Lado a lado/Vítima/Atacante controls change the presentation perspective without changing the scenario state.

### Step 1 — The message (2 minutes)

- **Action:** select a fictional recipient, then start the complete demonstration.
- **Audience sees:** the message, full fictional sender, and personalized loopback destination.
- **Observer knows:** only simulated inbox actions; no landing-page request has occurred.
- **Explain:** urgency, authority, and button text are persuasion signals. Inspect the actual sender and destination through a known workflow.

### Step 2 — The click and HTTP request (3 minutes)

- **Action:** let the automatic sequence open the local link and watch the attacker list grow.
- **Audience sees:** the training page and `GET /training/...` in the timeline.
- **Server receives:** genuine method, path, timestamp, query values, loopback IP, allowlisted headers, and status.
- **Explain:** URL values normally reach the destination. The IP is loopback because both sides run on this computer. Missing Referer or Accept-Language values remain **Not provided**.

### Step 3 — Browser properties (3 minutes)

- **Action:** point out the browser and device details added after the click.
- **Audience sees:** actual values exposed to page JavaScript, followed by a distinct POST event.
- **Server receives:** nothing from the browser API display until the POST; afterward it receives exactly the allowlist shown.
- **Explain:** availability to JavaScript and transmission to a server are separate steps. Individual values often have legitimate uses, but combining characteristics can create privacy risks.

### Step 4 — Personalized URL (2 minutes)

- **Action:** show how the personalized link connects the request to a fictional identity.
- **Audience sees:** observed, inferred, and not-proven statements side by side.
- **Server receives:** the synthetic identifier in the original GET and looks it up in local fictional campaign data.
- **Explain:** correlation is not identity proof; links may be forwarded or opened by scanners.

### Step 5 — Synthetic form submission (2 minutes)

- **Action:** highlight the fictional name and `DEMO-` code when they appear in the attacker list.
- **Audience sees:** a genuine POST and an educational reveal.
- **Server receives:** only the two validated values, and only after Submit.
- **Explain:** values visible in a browser field are not automatically present in destination-server logs.

### Step 6 — Hypothetical compromise (3 minutes)

- **Action:** explain the final hypothetical escalation when simulated protected resources appear.
- **Audience sees:** the protected state change to a clearly labeled fictional-data reveal.
- **Observer receives:** a simulated event, not HTTP evidence of an exploit.
- **Explain:** sandboxing and same-origin protections exist to keep private resources away from arbitrary sites. Vulnerabilities may undermine boundaries, but impact varies and full-system compromise is not automatic. Updates and managed patching reduce exposure.

### Step 7 — Defense (2 minutes)

- **Action:** finish on the Defense screen; use the dedicated attacker route only if a technical deep dive is useful.
- **Audience sees:** human and technical interruption points: verification, filtering, browser isolation, script controls, patching, least privilege, EDR, and incident response.
- **Explain:** defense in depth creates multiple opportunities to stop the chain. Reset and repeat with another scenario or fictional recipient.

## Technical data flow

| Information | Origin | How it reaches the server | Retention |
|---|---|---|---|
| HTTP metadata | Genuine browser request | Automatic HTTP GET/POST fields, filtered by an allowlist | Memory only |
| Browser properties | Standard page JavaScript APIs | Separate POST only after the explicit transmit action | Memory only |
| Fictional identity | Static local employee directory | Server correlates an opaque query ID with data it already owns | Memory only |
| Form values | Fictional user input | Validated POST after Submit | Memory only |
| Protected-resource reveal | Static constants in the application | It does not represent received protected data | Memory only |

The listener host is the constant `127.0.0.1`; configuration cannot change it to a public interface. Content Security Policy permits same-origin connections only. Authorization, cookies, sensitive field names, and arbitrary request bodies are excluded from the event log.

## Security boundaries

Real local interactions:

- GET of the selected `/training/:scenario` route.
- POST of the explicitly transmitted browser-property allowlist.
- POST of validated synthetic form values.
- Loopback source address and allowlisted request headers observed by Express.

Inferences:

- Mapping `demo-001`, `demo-002`, or `demo-003` to fictional campaign records.
- Any suggestion about who physically clicked remains explicitly unproven.

Entirely simulated:

- Inbox delivery/open telemetry and page-rendering events.
- The browser security boundary failure and every revealed protected resource.
- The fictional application session is a label, never a cookie or token.

The application never reads cookies, tokens, storage, local files, installed fonts, real employee directories, credentials, or third-party services.

## Test and verify

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium  # once, if needed
pnpm test:e2e
```

The API suite covers loopback binding, missing headers, personalized-link inference, browser-property gating and validation, synthetic form validation, simulated-data boundaries, live events, and reset. The browser suite runs the complete expanded presentation flow, checks all three classifications, and fails if the application contacts an origin other than `http://127.0.0.1:3000`.

## Troubleshooting

### Dependencies are missing
Confirm Node.js 20+ and pnpm 10+, then run `pnpm install`. If end-to-end tests report a missing browser, run `pnpm exec playwright install chromium` once.

### Port 3000 is already in use
Stop the process using the port, then run `pnpm dev` again. The fixed port keeps the displayed training URL predictable.

### The connection indicator is red or events do not update
Confirm the development process is running, wait briefly for the event stream to reconnect, then reload the page. Reset clears shared memory but does not require a restart.

### A GET does not appear
Use the call-to-action in the simulated email. Merely revealing or inspecting the URL deliberately does not contact the destination.

### Browser properties do not appear in the observer
Opening the module only reads them in the page. Select **Transmit demo properties** to create the separate POST.

### The form rejects a value
Use a fictional name ending in `Example` and a code beginning with `DEMO-`. Password-, token-, cookie-, MFA-, card-, and banking-like fields are rejected.

### The browser warns about HTTP
That is expected for this loopback lab. HTTPS would protect transport, not prove that the destination is trustworthy.

## Limitations

- State is process-local, disappears on restart/reset, and is not shared across machines.
- The app does not model real mail-gateway telemetry, tracking pixels, email delivery, malware, credential theft, or a real browser exploit.
- Browser-exposed values vary legitimately between browsers and privacy settings.
- Personalized-link hits can be caused by forwarding or automated scanning; they never prove a human identity.
- The simulated consequence shows categories of possible impact, not a claim that every vulnerability yields those results.
- Local HTTP omits TLS negotiation by design; HTTPS is discussed rather than emulated with a certificate.
- The split-screen layout is optimized for desktop/projector use; dedicated victim and observer routes are available for narrower displays.

The central lesson is: **a click can expose information through normal web communication, existing identity correlation, and browser APIs. More serious exposure requires additional actions or exploitable security failures, and those mechanisms must be distinguished accurately.**
