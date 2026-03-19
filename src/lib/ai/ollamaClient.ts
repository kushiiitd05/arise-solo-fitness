// src/lib/ai/ollamaClient.ts
// Shared Ollama fetch utility — all prompt functions import from here.
// Model: configurable via NEXT_PUBLIC_OLLAMA_MODEL env var, default 'llama3'.
// Timeout: 5000ms via AbortController.
// format: 'json' only when caller explicitly passes options.format = 'json'.

export const OLLAMA_MODEL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OLLAMA_MODEL)
    ? process.env.NEXT_PUBLIC_OLLAMA_MODEL
    : 'llama3';

const OLLAMA_TIMEOUT_MS = 5000;
const OLLAMA_BASE_URL = 'http://localhost:11434/api/generate';

interface OllamaOptions {
  format?: 'json';
}

/**
 * Call Ollama with a plain text prompt.
 * Returns the raw response string, or null on any failure (network, timeout, parse error).
 * For structured JSON output (arenaPrompt only), pass options.format = 'json' and JSON.parse the result.
 */
export async function ollamaGenerate(
  prompt: string,
  options?: OllamaOptions
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    };
    if (options?.format === 'json') {
      body.format = 'json';
    }

    const response = await fetch(OLLAMA_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    return (data.response as string) ?? null;
  } catch {
    clearTimeout(timeoutId);
    // AbortError (timeout) or any network error — silent fallback
    return null;
  }
}
