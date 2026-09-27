import { CorpusEntry } from '../types';

import { validateCorpusEntry } from './corpusService';

// v2 reposition spec §4: proposals arrive as free LLM text. This pure parser
// extracts the JSON payload, validates each entry with the shared corpus
// validator, drops invalid ones (collecting why) and dedupes. Validation
// failures never throw — the authoring UI shows them inline.
const MAX_PROPOSALS = 40;

export function parseCorpusProposals(text: string): { proposals: CorpusEntry[]; errors: string[] } {
  const errors: string[] = [];
  const jsonText = extractJson(text);
  if (!jsonText) {
    return { proposals: [], errors: ['No JSON payload found in the AI response.'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      proposals: [],
      errors: [`Response JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const parsedObj = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  const entries: unknown[] = Array.isArray(parsedObj?.entries)
    ? (parsedObj.entries as unknown[])
    : Array.isArray(parsed)
      ? parsed
      : [];

  const proposals: CorpusEntry[] = [];
  const seen = new Set<string>();
  for (const raw of entries) {
    const { entry, errors: entryErrors } = validateCorpusEntry(raw);
    if (!entry) {
      errors.push(...entryErrors);
      continue;
    }
    const key = entry.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    proposals.push(entry);
    if (proposals.length >= MAX_PROPOSALS) break;
  }

  if (!proposals.length && !errors.length) {
    errors.push('The AI returned no usable entries.');
  }
  return { proposals, errors };
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return null;
}
