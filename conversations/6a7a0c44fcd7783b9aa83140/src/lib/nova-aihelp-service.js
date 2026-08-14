/**
 * AI Help Service
 * - Offline: local plugin/intent matching
 * - Online: call configured API endpoint with API key
 */

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

async function callOnlineAI({ prompt, apiKey, endpoint = DEFAULT_ENDPOINT, model = "gpt-4o-mini", systemPrompt }) {
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }

  const url = String(endpoint || DEFAULT_ENDPOINT).trim();
  const body = {
    model: String(model || "gpt-4o-mini"),
    messages: [
      { role: "system", content: systemPrompt || "Kamu adalah asisten bot WhatsApp yang membantu mencari fitur dan cara pakai command." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 600,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, reason: "http_error", status: res.status };
  }

  const data = await res.json().catch(() => ({}));
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { ok: false, reason: "empty_response" };
  }

  return { ok: true, text };
}

export { callOnlineAI, DEFAULT_ENDPOINT };
