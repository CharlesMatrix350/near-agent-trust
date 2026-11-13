
import "dotenv/config";
import express from "express";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { judgeSubmission } from "./judge.mjs";

const app = express();
const PORT = 3000;
const NEAR_RPC = "https://rpc.mainnet.near.org";

const dataFolder = "data";
const dataFile = join(dataFolder, "evaluations.json");

app.use(express.json());
app.use(express.static("public"));

async function loadEvaluations() {
  await mkdir(dataFolder, { recursive: true });

  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(dataFile, "[]", "utf8");
      return [];
    }
    throw error;
  }
}

async function saveEvaluations(evaluations) {
  await writeFile(dataFile, JSON.stringify(evaluations, null, 2), "utf8");
}

// Check live NEAR Mainnet connection
app.get("/near/status", async (req, res) => {
  try {
    const response = await fetch(NEAR_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "near-agent-trust",
        method: "status",
        params: []
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`NEAR RPC returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error || !data.result) {
      throw new Error(data.error?.message || "Invalid NEAR RPC response");
    }

    res.json({
      connected: true,
      network: data.result.chain_id,
      latestBlockHeight: data.result.sync_info.latest_block_height,
      syncing: data.result.sync_info.syncing,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("NEAR connection error:", error);
    res.status(503).json({
      connected: false,
      error: "Could not connect to NEAR Mainnet."
    });
  }
});

app.get("/evaluations", async (req, res) => {
  try {
    res.json(await loadEvaluations());
  } catch (error) {
    console.error("Storage error:", error);
    res.status(500).json({ error: "Could not load evaluations." });
  }
});

app.post("/judge", async (req, res) => {
  try {
    const { bountyTitle, rules, submission } = req.body;

    if (!bountyTitle || !rules || !submission) {
      return res.status(400).json({
        error: "Please fill in all fields."
      });
    }

    const result = await judgeSubmission({
      bountyTitle,
      rules,
      submission
    });

    const evaluations = await loadEvaluations();

    const evaluation = {
      id: Date.now().toString(),
      bountyTitle,
      rules,
      submission,
      result,
      humanDecision: "pending",
      createdAt: new Date().toISOString()
    };

    evaluations.unshift(evaluation);
    await saveEvaluations(evaluations);

    res.json({
      ...result,
      evaluationId: evaluation.id
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: "Judging failed. Please try again."
    });
  }
});

app.post("/evaluations/:id/decision", async (req, res) => {
  try {
    const { decision } = req.body;
    const allowedDecisions = ["approved", "revision_requested", "rejected"];

    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({
        error: "Invalid review decision."
      });
    }

    const evaluations = await loadEvaluations();
    const evaluation = evaluations.find(item => item.id === req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        error: "Evaluation not found."
      });
    }

    evaluation.humanDecision = decision;
    evaluation.reviewedAt = new Date().toISOString();

    await saveEvaluations(evaluations);

    res.json({ success: true, evaluation });
  } catch (error) {
    console.error("Decision storage error:", error);
    res.status(500).json({
      error: "Could not save review decision."
    });
  }
});

app.listen(PORT, () => {
  console.log(`NEAR Agent Trust running at http://localhost:${PORT}`);
});
