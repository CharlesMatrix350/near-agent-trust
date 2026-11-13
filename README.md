# NEAR Agent Trust

**A human-in-the-loop evaluation workflow for AI-agent submissions, with NEAR Mainnet status visibility and verifiable NEAR AI inference.**

NEAR Agent Trust helps reviewers assess a submission against supplied bounty rules. It produces a structured AI assessment, keeps the final decision with a human reviewer, and provides a clearly labelled simulation-only reward preview.

> **Project status:** Prototype / demonstration. The reward flow is simulated only. The current NEAR Mainnet integration reads network status; it does not submit transactions or move funds.

## Why it exists

AI-assisted judging can make review faster, but an AI score should not silently become the final decision. NEAR Agent Trust separates the initial assessment from the human decision:

1. A reviewer enters a bounty title, its rules, and a submission.
2. The AI evaluator returns a score, criterion-level feedback, and evidence excerpts.
3. The result is stored with a `needs_review` status.
4. A human reviewer chooses **Approved**, **Revision requested**, or **Rejected**.
5. The interface can show a reward-status preview for demonstration; no wallet is connected and no payment is made.

## What is implemented

- **AI-assisted evaluation:** evaluates the supplied submission against the supplied rules and returns structured JSON containing a score, criteria, reasons, evidence excerpts, and feedback.
- **Human-in-the-loop review:** the model is instructed to always return `needs_review`; a human makes and records the final review decision.
- **Evaluation history:** evaluations and review decisions are stored in a local JSON file at `data/evaluations.json`.
- **NEAR Mainnet status:** the backend queries the public NEAR RPC status method and reports the chain ID, latest block height, syncing state, and check time.
- **NEAR AI verification:** the NEAR AI Inference SDK client is configured with TDX quote and GPU evidence verifiers. The app calls `verifyResponse()` for the model completion before accepting the parsed result.
- **Simulation-only reward preview:** demonstrates possible reward states without connecting a wallet or transferring funds.

## Architecture

```text
Browser UI (public/index.html)
        |
        v
Express server (server.js)
        |----------------------> NEAR Mainnet public RPC
        |
        |----> judge.mjs -----> NEAR AI Inference SDK
        |                         |-- TDX quote verification
        |                         |-- GPU evidence verification
        |                         |-- completion signature verification
        |
        v
Local evaluation history (data/evaluations.json)
```

### Main files

| File | Purpose |
| --- | --- |
| `server.js` | Express server, NEAR status endpoint, evaluation API, and human-decision storage |
| `judge.mjs` | NEAR AI inference client, attestation verifier configuration, and evaluation prompt |
| `public/index.html` | Browser dashboard and review interface |
| `package.json` | Node.js dependencies and project metadata |
| `.gitignore` | Excludes local dependencies, environment secrets, and local evaluation history |

## Requirements

- Node.js with built-in `fetch` support (Node.js 18 or newer recommended)
- npm
- A NEAR AI API key for the AI evaluation feature
- Internet access for NEAR RPC and NEAR AI verification requests

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/CharlesMatrix350/near-agent-trust.git
   cd near-agent-trust
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a file named `.env` in the project root and add your key:

   ```env
   NEARAI_API_KEY=your_near_ai_api_key
   ```

   Keep this value private. Do not commit or share your `.env` file.

4. Start the server:

   ```bash
   node server.js
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

The server listens on port `3000`. The AI evaluation route requires a valid `NEARAI_API_KEY`. The NEAR status endpoint can be checked independently.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/near/status` | Read current NEAR Mainnet RPC status |
| `POST` | `/judge` | Evaluate a submission using `bountyTitle`, `rules`, and `submission` |
| `GET` | `/evaluations` | Retrieve locally stored evaluations |
| `POST` | `/evaluations/:id/decision` | Save a human decision: `approved`, `revision_requested`, or `rejected` |

Example request body for `POST /judge`:

```json
{
  "bountyTitle": "Example bounty",
  "rules": "Describe the evaluation requirements here.",
  "submission": "Paste the submission being reviewed here."
}
```

## Trust boundaries and current limitations

Transparency matters. The current implementation is a prototype, not a production bounty-payment system.

- **No on-chain actions:** NEAR Mainnet is queried for status only. The app does not call a smart contract, connect a wallet, or transfer tokens.
- **No automatic final verdict:** the AI output is advisory and marked `needs_review`. A human must choose the final review decision.
- **No end-to-end encryption in this configuration:** the NEAR AI client is configured with `e2ee: false`. The code configures TDX and GPU evidence verification and verifies the completion response signature; this should not be described as end-to-end encrypted inference.
- **Local storage:** evaluation history is stored in a JSON file on the machine running the server. It is not a shared database.
- **Prototype access control:** the current Express routes do not implement user authentication or role-based authorization. Do not expose this server publicly with real user or bounty data without adding appropriate access controls and production storage.
- **AI limitations:** scores and evidence excerpts are model-generated assessments, not proof that a submission is correct. Reviewers should inspect the original submission and evidence before deciding.

## Security

- Store `NEARAI_API_KEY` in a local `.env` file.
- Never paste API keys into source code, screenshots, issues, or public messages.
- The repository ignores `.env`, `node_modules/`, and the local evaluation history file.
- Rotate the API key if it is ever exposed.

## Technology

- Node.js (ES modules)
- Express
- NEAR AI Inference SDK
- NEAR Mainnet public JSON-RPC

## References

- [NEAR AI Inference SDK](https://github.com/nearai/inference-sdk)
- [NEAR AI SDK verification guide](https://github.com/nearai/inference-sdk/blob/main/js/docs/verification-guide.md)
- [NEAR Mainnet RPC](https://rpc.mainnet.near.org)

---

Built as a prototype exploring transparent AI-assisted evaluation with a human reviewer in control.
