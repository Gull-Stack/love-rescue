/**
 * Semantic second pass for Real Talk Live Sessions.
 *
 * The deterministic pattern library (conversationAnalysis.js) catches literal
 * phrasings instantly. This module catches what regex can't: sarcasm, implied
 * threats, oblique gaslighting, and manipulation carried by meaning rather
 * than stock phrases. It classifies each utterance against the SAME taxonomy,
 * so every flag maps back to the library's explanation + reframe copy.
 *
 * Design constraints:
 *  - OPTIONAL: enabled only when Anthropic API credentials are configured.
 *  - FAIL-SOFT: any error/timeout returns [] — the deterministic pass is
 *    always the floor, never blocked by this.
 *  - PRIVACY: only the single utterance is sent — never the conversation,
 *    never user identity.
 */

const { CONVERSATION_PATTERNS } = require('./conversationAnalysis');
const logger = require('./logger');

const SEMANTIC_TIMEOUT_MS = parseInt(process.env.LIVE_SEMANTIC_TIMEOUT_MS || '4000', 10);
const SEMANTIC_MODEL = process.env.LIVE_SEMANTIC_MODEL || 'claude-opus-4-8';

let client = null;
function getClient() {
  if (client) return client;
  const Anthropic = require('@anthropic-ai/sdk');
  client = new Anthropic({ maxRetries: 0, timeout: SEMANTIC_TIMEOUT_MS });
  return client;
}

function isSemanticEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.LIVE_SEMANTIC_PASS !== 'off';
}

const PATTERN_BY_ID = new Map(CONVERSATION_PATTERNS.map((p) => [p.id, p]));
const VALID_IDS = CONVERSATION_PATTERNS.map((p) => p.id);

// Strict schema so the model's output is guaranteed parseable.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: VALID_IDS },
          evidence: { type: 'string' },
        },
        required: ['id', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['flags'],
  additionalProperties: false,
};

const TAXONOMY = CONVERSATION_PATTERNS
  .map((p) => `- ${p.id} (${p.category}): ${p.label} — ${p.explanation}`)
  .join('\n');

const SYSTEM_PROMPT = `You classify a single utterance from a couple's argument against a fixed taxonomy of rhetorical fallacies, manipulation tactics, and Gottman horsemen. You catch what literal phrase-matching misses: sarcasm, implication, and oblique phrasings.

Taxonomy:
${TAXONOMY}

Rules:
- Flag ONLY clear instances a couples therapist would point out. When in doubt, do not flag.
- Sarcastic contempt ("Wow, must be nice being perfect") counts as contempt. Implied threats ("keep this up and see what happens") count as threat_ultimatum. Denying the partner's memory or perception in ANY phrasing counts as gaslighting.
- Do NOT flag: healthy statements, "I feel…" statements, reported speech about third parties, self-directed complaints, questions asked in good faith, or positive uses of "always/never".
- "evidence" is the exact substring of the utterance that carries the pattern.
- An utterance can have zero, one, or several flags.`;

/**
 * Classify one utterance semantically. Returns flags in the same shape as
 * analyzeUtterance(), each tagged source: 'semantic'. Fails soft to [].
 */
async function analyzeSemantics(text) {
  const utterance = String(text || '').trim();
  if (!utterance || !isSemanticEnabled()) return [];

  try {
    const response = await getClient().messages.create({
      model: SEMANTIC_MODEL,
      max_tokens: 1024,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Utterance: "${utterance}"` }],
    });

    if (response.stop_reason === 'refusal') return [];
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) return [];
    const parsed = JSON.parse(textBlock.text);

    const seen = new Set();
    const flags = [];
    for (const item of Array.isArray(parsed.flags) ? parsed.flags : []) {
      const pattern = PATTERN_BY_ID.get(item.id);
      if (!pattern || seen.has(item.id)) continue;
      seen.add(item.id);
      flags.push({
        id: pattern.id,
        category: pattern.category,
        label: pattern.label,
        explanation: pattern.explanation,
        reframe: pattern.reframe,
        match: String(item.evidence || '').slice(0, 200),
        source: 'semantic',
      });
    }
    return flags;
  } catch (error) {
    // Timeout, rate limit, network, parse — the live session never waits on us.
    logger.warn('Semantic analysis pass failed (deterministic flags unaffected)', {
      error: error.message,
    });
    return [];
  }
}

module.exports = { isSemanticEnabled, analyzeSemantics, SEMANTIC_MODEL };
