// Local/CI harness for the llm-proxy Edge Function.
//
// Boots three servers in one process:
//   1. PROXY_PORT   (default 3000) — serves the REAL handlers from
//      api/llm-proxy/index.ts over HTTP (GET/POST/OPTIONS).
//   2. MOCK_LLM_PORT (default 9101) — OpenAI-compatible chat/completions
//      stub standing in for openrouter.ai.
//   3. MOCK_KV_PORT  (default 9102) — Upstash-REST-compatible stub backing
//      @upstash/redis (incr/pexpire/pttl) with an in-memory store.
//
// Env wiring happens before the handler module is imported so module-level
// env reads pick everything up. Used by `npm run test:integration` and the
// CI integration-test job (#29).

const PROXY_PORT = Number(process.env.PROXY_PORT || 3000);
const MOCK_LLM_PORT = Number(process.env.MOCK_LLM_PORT || 9101);
const MOCK_KV_PORT = Number(process.env.MOCK_KV_PORT || 9102);

process.env.API_KEY ||= "harness-test-key";
process.env.LLM_BASE_URL = `http://localhost:${MOCK_LLM_PORT}/v1`;
process.env.KV_REST_API_URL = `http://localhost:${MOCK_KV_PORT}`;
process.env.KV_REST_API_TOKEN ||= "harness-kv-token";

import http from "node:http";

type StoreValue = { value: number; expireAt: number | null };
const kvStore = new Map<string, StoreValue>();

// @upstash/redis POSTs JSON command arrays (e.g. ["incr", "rl:x"]) to the
// configured baseUrl. Also accept GET /incr/<key> style paths for manual
// curl debugging.
function applyKvCommand(command: string, args: string[]): unknown {
  switch (command) {
    case "incr": {
      const key = args[0] ?? "";
      const existing = kvStore.get(key);
      // Redis semantics: an expired key is treated as missing, so drop it
      // before reading or incrementing (otherwise a stale count would
      // survive its window and mint one spurious 429).
      if (existing && existing.expireAt !== null && existing.expireAt <= Date.now()) {
        kvStore.delete(key);
      }
      const entry = kvStore.get(key) ?? { value: 0, expireAt: null };
      entry.value += 1;
      kvStore.set(key, entry);
      return entry.value;
    }
    case "pexpire": {
      const key = args[0] ?? "";
      const ms = Number(args[1]);
      const entry = kvStore.get(key);
      if (!entry) return 0;
      entry.expireAt = Date.now() + ms;
      return 1;
    }
    case "expire": {
      const key = args[0] ?? "";
      const secs = Number(args[1]);
      const entry = kvStore.get(key);
      if (!entry) return 0;
      entry.expireAt = Date.now() + secs * 1000;
      return 1;
    }
    case "pttl": {
      const key = args[0] ?? "";
      const entry = kvStore.get(key);
      if (!entry) return -2;
      if (entry.expireAt === null) return -1;
      if (entry.expireAt <= Date.now()) {
        kvStore.delete(key);
        return -2;
      }
      return Math.max(0, Math.ceil(entry.expireAt - Date.now()));
    }
    case "ttl": {
      const pttl = applyKvCommand("pttl", args) as number;
      return pttl < 0 ? pttl : Math.ceil(pttl / 1000);
    }
    case "del":
    case "unlink":
      return kvStore.delete(args[0] ?? "") ? 1 : 0;
    case "ping":
      return "PONG";
    default:
      throw new Error(`unsupported command: ${command}`);
  }
}

function startMockKv(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      let commands: string[][] = [];
      try {
        const parsed = body ? JSON.parse(body) : null;
        // Single command array (["incr","k"]) or pipeline ([[..],[..]])
        commands = Array.isArray(parsed?.[0]) ? parsed : [parsed];
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json body" }));
        return;
      }

      if (req.method === "GET") {
        const parts = (req.url || "/").split("/").filter(Boolean).map(decodeURIComponent);
        commands = [parts];
      }

      try {
        const results = commands.map((cmd) => ({
          result: applyKvCommand(String(cmd[0]).toLowerCase(), cmd.slice(1).map(String)),
        }));
        const payload = Array.isArray(body && JSON.parse(body)) && Array.isArray(JSON.parse(body)[0])
          ? results
          : results[0];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
    });
  });
  return listen(server, MOCK_KV_PORT, "mock-kv");
}

function startMockLlm(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || !(req.url || "").endsWith("/chat/completions")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      let parsed: { model?: string; messages?: unknown[] } = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
        return;
      }
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ") || auth.length < 12) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "missing bearer token" }));
        return;
      }
      const content = JSON.stringify({ ok: true, model: parsed.model ?? null });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-harness",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: parsed.model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        })
      );
    });
  });
  return listen(server, MOCK_LLM_PORT, "mock-llm");
}

async function startProxy(): Promise<http.Server> {
  // Dynamic import AFTER env wiring so module-level env reads see the
  // harness configuration.
  const handlers = await import("../api/llm-proxy/index.js");
  const allowedModels = await import("../api/llm-proxy/allowed-models.js");
  const server = http.createServer(async (req, res) => {
    const method = (req.method || "GET").toUpperCase();
    const url = `http://localhost:${PROXY_PORT}${req.url || "/"}`;
    const pathname = new URL(url).pathname;
    const mod = pathname.endsWith("/allowed-models") ? allowedModels : handlers;

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks);

    const request = new Request(url, {
      method,
      headers: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]): [string, string] => [
            k,
            Array.isArray(v) ? v.join(",") : String(v),
          ]),
      ),
      ...(method !== "GET" && method !== "HEAD" && body.length > 0
        ? { body }
        : {}),
    });

    let response: Response;
    try {
      // index.ts exports lowercase `options`; other routes export `OPTIONS`.
      const handlersByName = mod as unknown as Record<
        string,
        ((request: Request) => Promise<Response>) | undefined
      >;
      const handler = handlersByName[method] ?? handlersByName[method.toLowerCase()];
      if (!handler) {
        response = new Response(JSON.stringify({ error: "method not allowed" }), {
          status: 405,
        });
      } else {
        response = await handler(request.clone());
      }
    } catch (err) {
      console.error("[harness] handler crashed:", err);
      response = new Response(
        JSON.stringify({ error: "internal harness error" }),
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    res.writeHead(response.status, headers);
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  });
  return listen(server, PROXY_PORT, "proxy");
}

function listen(server: http.Server, port: number, label: string): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      console.log(`[harness] ${label} listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

const servers = await Promise.all([startMockKv(), startMockLlm(), startProxy()]);

function shutdown() {
  for (const s of servers) s.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[harness] ready — proxy :${PROXY_PORT}, llm :${MOCK_LLM_PORT}, kv :${MOCK_KV_PORT}`);
