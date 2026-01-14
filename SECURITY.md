# 🛡️ Colony OS Security Protocol

## The Sovereign Air-Gap

Colony OS is architected for **High-Trust Privacy**. Unlike commercial AI copilots that stream your intellectual property to the cloud, Colony OS executes its core reasoning locally.

### 1. The Neural Air-Gap

- **Default Model:** DeepSeek-R1 (Local via Ollama).
- **Data Flow:** Code snippets sent to the reasoning engine never leave `localhost:11434`.
- **Verification:** You can verify this by inspecting the `DeepSeekAdvisor.js` network calls or running the system offline.

### 2. The Identity Gateway (HMAC)

- All commands sent from the Quantum Canvas (Frontend) to the Neural Bridge (Backend) are signed with **HMAC-SHA256**.
- This prevents unauthorized processes or external scripts from hijacking the Colony's motor cortex.
- Secret keys are stored in `.env` (which is git-ignored) and never committed.

### 3. Sovereign Memory

- **No Cloud Databases:** Project state, task history, and "memory" are stored in local SQLite databases or JSON ledgers within the `.colony/` directory.
- **No Telemetry:** We do not track usage, errors, or performance data.

## Vulnerability Reporting

If you discover a breach in the Neural Bridge or an issue with the local sandbox, please open a private issue or contact the Core Maintainer directly.

**"Our code is our castle."**
