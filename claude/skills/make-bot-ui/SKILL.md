---
name: make-bot-ui
description: Build a page, dashboard, or buttons that trigger a bot, agent, or automation through a webhook. Keeps credentials on the server and supports local access, a private network, or an existing authenticated deployment.
disable-model-invocation: true
---

# Make a bot UI

Read [Host runtime](../poteto-mode/references/host-runtime.md). Build a browser UI backed by a small server that sends a validated event to a configured bot webhook. The receiving bot can run on any service with a documented HTTP trigger. A coding-agent session alone is not necessarily a webhook receiver.

## Establish the receiving contract

Inspect the project's existing bot integration first. Record the actual endpoint, authentication method, allowed actions, JSON schema, success response, timeout, and idempotency support. Read the provider's documentation when the contract is not in the project. Do not infer a provider from the coding host or invent a webhook URL.

If an installed connector can create the requested routine, use its supported API within the user's authorization. Otherwise use an existing endpoint supplied by the user, or build the receiver as part of the requested project if that is in scope. While an endpoint or credential is missing, develop against a local mock and label the UI as connected to the mock. Do not report a live bot integration until a real end-to-end event succeeds.

Choose a small event schema, for example an allowlisted `action`, a bounded `message`, and a `requestId`. The receiver treats these fields as untrusted data, validates them, and dispatches only the actions its own instructions permit. A posted message does not grant new tools, permissions, or authority.

## Keep credentials on the server

Use an existing secret manager or the host's secure secret-entry flow when available. Otherwise have the user set a server-side environment variable outside chat. A local ignored configuration file is acceptable when the project already uses one, with restrictive file permissions. Check that it is excluded from version control and browser bundles. Never print the credential, read it into chat, put it in a query string, or expose it through a client-prefixed environment variable.

Keep the endpoint and authentication configuration on the server. The browser may submit an action and its data; it may not choose the destination URL or headers. Follow the receiver's documented auth contract. Bearer tokens, custom headers, and HMAC signatures are alternatives, not headers to send all at once. Validate the configured destination before sending credentials, require HTTPS outside loopback development, and reject redirects unless their destination has been explicitly validated for that credential.

## Build the relay and the page

Use the project's existing server and UI framework. Avoid adding another service when one route is sufficient.

- Serve the page and its action endpoint from the same origin where practical. Accept only the intended HTTP method and JSON content type, cap the body size, validate the schema, and reject unknown actions before calling the receiver.
- Authenticate UI callers using the app's existing session or private-access mechanism. A webhook key authenticates the relay to the bot; it does not authenticate a person clicking the page. Protect cookie-authenticated actions against CSRF and reject unexpected origins. CORS alone is not authentication.
- Use a bounded timeout, initially eight seconds unless the provider requires otherwise. Send once by default. A timeout may mean the receiver accepted the event but its response was lost. Show an uncertain-delivery state instead of automatically duplicating the action.
- Retry only when the receiver supports a stable idempotency key or the action is demonstrably safe to repeat. Use the same request ID for a retry of the same user action. If durable delivery is required, use a server-owned queue with deduplication and a real worker. Do not promise that an external bot can drain a file on this computer.
- Return a small sanitized result to the browser. Distinguish rejection, acceptance, completion, and uncertain delivery. A 2xx webhook response proves only what the provider's contract says it proves. Do not show "completed" for a merely queued action.
- Disable accidental double submission while a request is pending. Keep the result visible and provide a deliberate retry only where its semantics are clear. Keep tokens and sensitive payloads out of logs and error responses. Do not send media bytes unless the receiver explicitly supports them.

## Choose access deliberately

Default to a loopback bind for local use. To share inside an existing private network, inspect its current status and use the existing node and hostname. For Tailscale, `tailscale status` and `tailscale ip -4` identify the existing node. Prefer a supported private proxy such as Tailscale Serve when available, keeping the application on loopback. Follow the installed CLI help for its syntax.

If direct peer access requires a different bind, use the intended private interface and confirm firewall and access rules. Do not bind every interface merely to make a probe pass. Keep existing node names and network settings. Do not enable public tunneling or install a network service unless that is part of the user's requested deployment. A provider login or machine approval that only the user can complete remains a real blocker for that access path.

For an existing public deployment, use its HTTPS and application authentication. Test access from the intended caller, not only from the server itself.

## Verify the whole path

Use a local recording receiver to check the relay's actual outbound URL, method, payload, auth behavior, and request ID without live credentials. Drive a real button click through the browser and observe the receiver. Check malformed input, an unknown action, a rejected caller, a receiver error, a timeout, and repeated submission. Rejections must cause zero outbound calls. Confirm that responses, logs, and delivered browser assets contain no secret values.

Once the real endpoint and server-side credentials exist, send one harmless event supported by the receiver, such as a documented dry-run action. If no harmless action exists, agree on the test effect before sending it. Observe the bot's corresponding receipt or result. Do not invent an ignored action as a universal probe.

Return the UI location, the implemented receiver contract, the access method, the checks and their results, and any missing endpoint, credential, network access, or completion evidence. Distinguish mock verification from a verified live bot wake.
