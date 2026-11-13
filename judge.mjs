import "dotenv/config";
import {
  InferenceClient,
  createTdxQuoteVerifier,
  createGpuEvidenceVerifier,
} from "@nearai/inference-sdk/node";

const apiKey = process.env.NEARAI_API_KEY;

if (!apiKey) {
  throw new Error("NEAR AI API key is missing");
}

const tdxQuote = createTdxQuoteVerifier({
  pccsUrl: "https://cloud.near.ai/api/proxy/pccs",
});

const gpuEvidence = createGpuEvidenceVerifier({
  nrasUrl: "https://cloud.near.ai/api/proxy/nras/v3/attest/gpu",
});

const client = new InferenceClient({
  apiKey,
  e2ee: false,
  modelVerification: {
    verifiers: {
      tdxQuote,
      gpuEvidence,
    },
  },
});

export async function judgeSubmission({
  bountyTitle,
  rules,
  submission,
}) {
  const completion = await client.chat.completions.create({
    model: "z-ai/glm-5.3-flash",
    messages: [
      {
        role: "system",
        content: `You are a careful bounty submission evaluator.
Judge only against the supplied rules.
Do not invent evidence.
Return valid JSON only, using this structure:
{
  "score": 0,
  "maxScore": 100,
  "decision": "needs_review",
  "feedback": "short explanation",
  "criteria": [
    {
      "name": "criterion name",
      "score": 0,
      "maxScore": 100,
      "reason": "explanation",
      "evidence": "exact words from the submission, or empty string"
    }
  ]
}
The decision must always be "needs_review".
A human must make the final decision.`,
      },
      {
        role: "user",
        content: `BOUNTY:
${bountyTitle}

RULES:
${rules}

SUBMISSION:
${submission}`,
      },
    ],
  });

  const verified = await client.verifyResponse(completion.id);
  const answer = completion.choices[0]?.message.content;

  console.log("Signature verification:", verified.signatureKind);
  console.log("\nAI JUDGMENT:\n");

  try {
    const result = JSON.parse(answer);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch {
    console.log(answer);
    throw new Error("The AI response was not valid JSON");
  }
}