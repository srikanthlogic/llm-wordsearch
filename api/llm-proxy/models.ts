// Server-side model allowlist for the LLM proxy.
//
// Security invariant (#17): a client must never be able to make the
// community spend money on an operator-unapproved model. The allowlist is
// derived ONLY from server-side configuration:
//   - COMMUNITY_MODEL_NAME            (the default community model)
//   - COMMUNITY_ALLOWED_MODELS        (optional, comma-separated extras)
//   - LANGUAGE_MODEL_MAP              (per-language overrides, their `model`
//                                      fields are trusted server config)
// Client-supplied model names are honored only if they appear in this set.

export interface AllowlistEnv {
  communityModelName?: string;
  communityAllowedModels?: string;
  languageModelMap?: string;
}

const DEFAULT_COMMUNITY_MODEL = 'google/gemini-2.5-flash';

function parseLanguageMapModels(raw?: string): string[] {
  if (!raw) return [];
  try {
    const map = JSON.parse(raw) as Record<string, { model?: string }>;
    if (!map || typeof map !== 'object') return [];
    return Object.values(map)
      .map((entry) => (entry && typeof entry === 'object' ? entry.model : undefined))
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  } catch {
    return [];
  }
}

export function buildAllowedModels(env: AllowlistEnv): Set<string> {
  const allowed = new Set<string>();

  const communityDefault = env.communityModelName?.trim() || DEFAULT_COMMUNITY_MODEL;
  allowed.add(communityDefault);

  if (env.communityAllowedModels) {
    for (const model of env.communityAllowedModels.split(',')) {
      const trimmed = model.trim();
      if (trimmed.length > 0) allowed.add(trimmed);
    }
  }

  for (const model of parseLanguageMapModels(env.languageModelMap)) {
    allowed.add(model);
  }

  return allowed;
}

export function resolveRequestedModel(
  requested: unknown,
  env: AllowlistEnv
): string {
  if (typeof requested !== 'string' || requested.trim().length === 0) {
    return env.communityModelName?.trim() || DEFAULT_COMMUNITY_MODEL;
  }
  return requested.trim();
}

export interface ModelCheckResult {
  allowed: boolean;
  model: string;
}

export function checkModelPermission(requested: unknown, env: AllowlistEnv): ModelCheckResult {
  const model = resolveRequestedModel(requested, env);
  const allowed = buildAllowedModels(env);
  return { allowed: allowed.has(model), model };
}
