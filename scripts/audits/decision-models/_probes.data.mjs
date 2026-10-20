

/**
 * @module scripts/audits/decision-models/probes
 *
 * The three states this audit asks every decision model about, the questions
 * batched onto each, and the one label per state an auditor can defend.
 *
 * A decision model returns a probability per option, so "correct" is only
 * meaningful where the answer is not a matter of taste. `route` is that label:
 * each state names the billing, shipping or technical team in its first
 * sentence. Urgency and anger are recorded as observations, not scored, because
 * no authoritative answer exists for them.
 *
 * The questions follow the System One shapes from the llama.cpp server docs:
 * `choice` with `criteria` options, `score` with 2 to 10 levels lowest first,
 * and `noul` for a yes/no probability.
 */

const ROUTE = {
  type: "choice",
  instructions: "Which team should handle this?",
  criteria: {
    billing: "payments, charges, refunds, invoices, subscription",
    shipping: "delivery, tracking, lost or late parcels",
    technical: "bugs, errors, login problems, crashes",
  },
};

/** The same question with bare labels, the comparison the blog reports. */
export const BARE_ROUTE = {
  type: "choice",
  instructions: "Which team should handle this?",
  criteria: { billing: null, shipping: null, technical: null },
};

export const URGENCY = {
  type: "score",
  instructions: "How urgent is this?",
  criteria: ["can wait", "this week", "today", "right now"],
};

export const ANGRY = { type: "noul", instructions: "Is the customer angry?" };

export const PROBES = [
  {
    id: "billing",
    state: "Customer message: I was charged twice for my order last week and nobody has replied.",
    questions: { route: ROUTE, angry: ANGRY, urgency: URGENCY },
    expectedRoute: "billing",
  },
  {
    id: "shipping",
    state: "Customer message: the parcel was due three days ago and the tracking has not moved since.",
    questions: { route: ROUTE, angry: ANGRY, urgency: URGENCY },
    expectedRoute: "shipping",
  },
  {
    id: "technical",
    state: "Customer message: the login button returns a 500 error after I reset my password.",
    questions: { route: ROUTE, angry: ANGRY, urgency: URGENCY },
    expectedRoute: "technical",
  },
];

/** The state the batching control and the bare-label comparison reuse. */
export const CONTROL_STATE = PROBES[0].state;

/** The models this audit looks for in the router, by id prefix. */
export const TARGETS = ["ggml-org/Laya-GGUF", "APUS-OpenJev"];
