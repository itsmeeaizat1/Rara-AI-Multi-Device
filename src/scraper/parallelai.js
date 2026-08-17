// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Parallel AI API wrapper - https://api.parallel.ai/v1/responses

const PARALLEL_API = "https://api.parallel.ai/v1/responses";

/**
 * Call Parallel AI API
 * @param {object} opts
 * @param {string} opts.input - User message/prompt
 * @param {string} opts.instructions - System prompt/instructions
 * @param {string} opts.model - Model name (default: "parallel")
 * @param {string} opts.effort - Reasoning effort: "low" | "medium" | "high"
 * @param {string} opts.apiKey - API key
 * @returns {Promise<string>} AI response text
 */
export async function parallelAI({
  input,
  instructions = "Respond in text using Markdown. Use $...$ for inline KaTeX expressions and $$...$$ for display KaTeX expressions.",
  model = "parallel",
  effort = "low",
  apiKey = process.env.PARALLEL_AI_API_KEY || process.env.PARALLEL_API_KEY,
}) {
  if (!apiKey) throw new Error("API key Parallel AI belum diset");
  if (!input?.trim()) throw new Error("Input tidak boleh kosong");

  const body = JSON.stringify({
    model,
    input,
    instructions,
    reasoning: { effort },
  });

  const res = await fetch(PARALLEL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Parallel AI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();

  // OpenAI-style responses API: output array with message items
  if (data.output && Array.isArray(data.output)) {
    const textParts = data.output
      .filter((item) => item.type === "message" && item.content)
      .flatMap((item) =>
        Array.isArray(item.content)
          ? item.content.filter((c) => c.type === "output_text").map((c) => c.text)
          : [typeof item.content === "string" ? item.content : ""]
      )
      .filter(Boolean);
    if (textParts.length) return textParts.join("\n");
  }

  // Fallback: direct text/content field
  if (data.content) return typeof data.content === "string" ? data.content : JSON.stringify(data.content);
  if (data.text) return data.text;
  if (data.response) return data.response;
  if (data.message) return data.message;
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;

  // Last resort: return raw JSON
  return JSON.stringify(data).slice(0, 2000);
}

export { PARALLEL_API };
