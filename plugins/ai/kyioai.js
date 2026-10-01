// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kyioai.js — KyioAPI kategori AI (69 endpoint) — api.kyio.web.id.
// FREE TIER TANPA KEY (10 RPM). Key opsional: .setkey kyio <api_key> -> 120 RPM + premium.
// Semua cmd pakai prefix .kyio biar gak bentrok fitur lain. TABEL endpoint ada di file ini,
// engine generik di src/lib/rara-kyio.js — tiap kategori bisa diedit sendiri-sendiri.
import { runKyioTable } from "../../src/lib/rara-kyio.js";

const TABLE = [
  { cmd: "kyiodeepseekai", path: "/api/v2/ai/deepseek-ai", param: "q", method: "GET", hint: ".kyiodeepseekai <pertanyaan>" },
  { cmd: "kyiouiprompt", path: "/api/v2/ai/ui-prompt", param: "q", method: "GET", hint: ".kyiouiprompt <jenis desain UI>" },
  { cmd: "kyiotwentyfirst", path: "/api/v2/ai/twenty-first", param: "q", method: "GET", hint: ".kyiotwentyfirst <komponen shadcn/tailwind>" },
  { cmd: "kyionanobanana", path: "/api/v2/ai/nanobanana", param: "q", method: "GET", hint: ".kyionanobanana <prompt>" },
  { cmd: "kyionemotron", path: "/api/v2/ai/nemotron-super", param: "q", method: "GET", hint: ".kyionemotron <pertanyaan>" },
  { cmd: "kyiominimax", path: "/api/v2/ai/minimax-m3", param: "q", method: "GET", hint: ".kyiominimax <pertanyaan>" },
  { cmd: "kyiolaguna", path: "/api/v2/ai/laguna", param: "q", method: "GET", hint: ".kyiolaguna <pertanyaan penalaran>" },
  { cmd: "kyiocoherecode", path: "/api/v2/ai/cohere-code", param: "q", method: "GET", hint: ".kyiocoherecode <pertanyaan coding>" },
  { cmd: "kyiodotsai", path: "/api/v2/ai/dots-ai", param: "q", method: "GET", hint: ".kyiodotsai <pertanyaan>" },
  { cmd: "kyioqwenhermes", path: "/api/v2/ai/qwen-hermes", param: "q", method: "GET", hint: ".kyioqwenhermes <pertanyaan>" },
  { cmd: "kyiogpt5", path: "/api/v2/ai/gpt-5", param: "q", method: "GET", hint: ".kyiogpt5 <pertanyaan>" },
  { cmd: "kyioedubrain", path: "/api/v2/ai/edubrain", param: "q", method: "GET", hint: ".kyioedubrain <soal>" },
  { cmd: "kyioaichat", path: "/api/v2/ai/ai", param: "q", method: "GET", hint: ".kyioaichat <pertanyaan>" },
  { cmd: "kyiogemma", path: "/api/v2/ai/google-gemma", param: "q", method: "GET", hint: ".kyiogemma <pertanyaan>" },
  { cmd: "kyiogpt52", path: "/api/v2/ai/gpt52", param: "q", method: "GET", hint: ".kyiogpt52 <pertanyaan>" },
  { cmd: "kyiochatgptanon", path: "/api/v2/chatgpt", param: "q", method: "GET", hint: ".kyiochatgptanon <pertanyaan>" },
  { cmd: "kyioclaudefree", path: "/api/v2/claude", param: "q", method: "GET", hint: ".kyioclaudefree <pertanyaan>" },
  { cmd: "kyiohalodoc", path: "/api/v2/ai/halodoc", param: "q", method: "GET", hint: ".kyiohalodoc <keluhan kesehatan>" },
  { cmd: "kyiodeepseekv4", path: "/api/v2/ai/deepseek-v4", param: "q", method: "GET", hint: ".kyiodeepseekv4 <pertanyaan>" },
  { cmd: "kyiouncensored", path: "/api/v2/uncensored", param: "q", method: "GET", hint: ".kyiouncensored <pertanyaan> (tanpa filter)" },
  { cmd: "kyiochat", path: "/api/v2/ai/ch-at", param: "q", method: "GET", hint: ".kyiochat <pertanyaan>" },
  { cmd: "kyiomathgpt", path: "/api/v2/ai/math-gpt", param: "q", method: "GET", hint: ".kyiomathgpt <soal matematika>" },
  { cmd: "kyiomuslimai", path: "/api/v2/muslimai", param: "q", method: "GET", hint: ".kyiomuslimai <pertanyaan islami>" },
  { cmd: "kyioaibanana", path: "/api/v2/aibanana", param: "q", method: "GET", hint: ".kyioaibanana <prompt gambar>" },
  { cmd: "kyiogpt5terra", path: "/api/v2/ai/gpt-5-6-terra", param: "q", method: "GET", hint: ".kyiogpt5terra <pertanyaan>" },
  { cmd: "kyiollmproxy", path: "/api/v2/ai/llmproxy", param: "q", method: "GET", hint: ".kyiollmproxy <pertanyaan>" },
  { cmd: "kyiomimo", path: "/api/v2/ai/mimo", param: "q", method: "GET", hint: ".kyiomimo <pertanyaan>" },
  { cmd: "kyiomimo25", path: "/api/v2/ai/mimo-v2-5", param: "q", method: "GET", hint: ".kyiomimo25 <pertanyaan>" },
  { cmd: "kyiomimo25pro", path: "/api/v2/ai/mimo-v2-5-pro", param: "q", method: "GET", hint: ".kyiomimo25pro <pertanyaan>" },
  { cmd: "kyiochatai", path: "/api/v2/ai/chatai", param: "q", method: "GET", hint: ".kyiochatai <pertanyaan>" },
  { cmd: "kyiodeepseek", path: "/api/v2/deepseek", param: "q", method: "GET", hint: ".kyiodeepseek <pertanyaan>" },
  { cmd: "kyiofelov2", path: "/api/v2/ai/felo-v2", param: "q", method: "GET", hint: ".kyiofelov2 <pertanyaan>" },
  { cmd: "kyiofelosearch", path: "/api/v2/felo", param: "q", method: "GET", hint: ".kyiofelosearch <topik riset>" },
  { cmd: "kyiogeminitts", path: "/api/v2/ai/gemini-tts", param: "voice-text", method: "GET", hint: ".kyiogeminitts [suara]|<teks>" },
  { cmd: "kyiogemini", path: "/api/v2/ai/gemini", param: "q", method: "GET", hint: ".kyiogemini <pertanyaan>" },
  { cmd: "kyiogeminichat", path: "/api/v2/ai/geminichat", param: "q", method: "GET", hint: ".kyiogeminichat <pertanyaan>" },
  { cmd: "kyiogpt3", path: "/api/v2/ai/gpt3", param: "q", method: "GET", hint: ".kyiogpt3 <pertanyaan>" },
  { cmd: "kyiokimi", path: "/api/v2/ai/kimi", param: "q", method: "GET", hint: ".kyiokimi <pertanyaan>" },
  { cmd: "kyiosentiment", path: "/api/v2/ai/sentiment", param: "q", method: "GET", hint: ".kyiosentiment <teks>" },
  { cmd: "kyioperplexity", path: "/api/v2/ai/perplexity-v2", param: "q", method: "GET", hint: ".kyioperplexity <pertanyaan>" },
  { cmd: "kyiopublicai", path: "/api/v2/ai/publicai", param: "q", method: "GET", hint: ".kyiopublicai <pertanyaan>" },
  { cmd: "kyiotalkai", path: "/api/v2/talkai", param: "q", method: "GET", hint: ".kyiotalkai <pertanyaan>" },
  { cmd: "kyiomagicstudio", path: "/api/v2/ai/magic-studio", param: "q", method: "GET", hint: ".kyiomagicstudio <prompt>" },
  { cmd: "kyioturboseek", path: "/api/v2/ai/turboseek", param: "q", method: "GET", hint: ".kyioturboseek <pertanyaan>" },
  { cmd: "kyiohumanizer", path: "/api/v2/ai/unaimytext", param: "q", method: "GET", hint: ".kyiohumanizer <teks AI biar kaya manusia>" },
  { cmd: "kyiowritecream", path: "/api/v2/ai/writecream", param: "q", method: "GET", hint: ".kyiowritecream <teks>" },
  { cmd: "kyioyou", path: "/api/v2/you", param: "q", method: "POST", hint: ".kyioyou <pertanyaan>" },
  { cmd: "kyioremovebg", path: "/api/v2/removebg", param: "url", method: "POST", hint: ".kyioremovebg <reply foto / url foto>" },
  { cmd: "kyioremovebg2", path: "/api/v2/removebg-v2", param: "url", method: "GET", hint: ".kyioremovebg2 <reply foto / url foto>" },
  { cmd: "kyiodreemy", path: "/api/v2/ai/dreemy", param: "q", method: "POST", hint: ".kyiodreemy <prompt>" },
  { cmd: "kyiovision", path: "/api/v2/ai/vision", param: "url", method: "GET", hint: ".kyiovision <reply foto / url foto>" },
  { cmd: "kyiogpt4", path: "/api/v2/ai/gpt4", param: "q", method: "GET", hint: ".kyiogpt4 <pertanyaan>" },
  { cmd: "kyiogpt35", path: "/api/v2/ai/gpt35", param: "q", method: "GET", hint: ".kyiogpt35 <pertanyaan>" },
  { cmd: "kyiounlimitedai", path: "/api/v2/ai/unlimitedai", param: "q", method: "GET", hint: ".kyiounlimitedai <pertanyaan>" },
  { cmd: "kyiolangchain", path: "/api/v2/ai/langchain", param: "q", method: "GET", hint: ".kyiolangchain <pertanyaan>" },
  { cmd: "kyiodeepseekflash", path: "/api/v2/ai/deepseek-v4-flash", param: "q", method: "GET", hint: ".kyiodeepseekflash <pertanyaan>" },
  { cmd: "kyioglm", path: "/api/v2/ai/glm-5-2", param: "q", method: "GET", hint: ".kyioglm <pertanyaan>" },
  { cmd: "kyioqwen", path: "/api/v2/ai/qwen-36", param: "q", method: "GET", hint: ".kyioqwen <pertanyaan>" },
  { cmd: "kyiokatcoder", path: "/api/v2/ai/kat-coder", param: "q", method: "GET", hint: ".kyiokatcoder <pertanyaan coding>" },
  { cmd: "kyiostepfun", path: "/api/v2/ai/stepfun", param: "q", method: "GET", hint: ".kyiostepfun <pertanyaan>" },
  { cmd: "kyionvidiavision", path: "/api/v2/ai/nvidia-vision", param: "url", method: "GET", hint: ".kyionvidiavision <reply foto / url foto>" },
  { cmd: "kyionvidia", path: "/api/v2/ai/nvidia", param: "q", method: "GET", hint: ".kyionvidia <pertanyaan>" },
  { cmd: "kyionvidiatranslate", path: "/api/v2/ai/nvidia-translate", param: "q", method: "GET", hint: ".kyionvidiatranslate <teks>" },
  { cmd: "kyionotegpt", path: "/api/v2/ai/notegpt", param: "q", method: "POST", hint: ".kyionotegpt <pertanyaan>" },
  { cmd: "kyiodeepsynth", path: "/api/v2/ai/deep-synthesizer", param: "q", method: "GET", hint: ".kyiodeepsynth <pertanyaan>" },
  { cmd: "kyioqwenedit", path: "/api/v2/ai-editor/qwen", param: "url", method: "GET", hint: ".kyioqwenedit <reply foto / url foto>" },
  { cmd: "kyioclaudeflash", path: "/api/v2/ai/claude-haiku-4.5", param: "q", method: "GET", hint: ".kyioclaudeflash <pertanyaan>" },
  { cmd: "kyiofluxai", path: "/api/v2/ai/fluxai", param: "q", method: "GET", hint: ".kyiofluxai <prompt gambar>" },
  { cmd: "kyiodeepimage", path: "/api/v2/ai/deep-image", param: "q", method: "GET", hint: ".kyiodeepimage <prompt gambar>" },
];

const pluginConfig = {
  name: "kyioai",
  alias: ["kyioai", "kyiodeepseekai", "kyiouiprompt", "kyiotwentyfirst", "kyionanobanana", "kyionemotron", "kyiominimax", "kyiolaguna", "kyiocoherecode", "kyiodotsai", "kyioqwenhermes", "kyiogpt5", "kyioedubrain", "kyioaichat", "kyiogemma", "kyiogpt52", "kyiochatgptanon", "kyioclaudefree", "kyiohalodoc", "kyiodeepseekv4", "kyiouncensored", "kyiochat", "kyiomathgpt", "kyiomuslimai", "kyioaibanana", "kyiogpt5terra", "kyiollmproxy", "kyiomimo", "kyiomimo25", "kyiomimo25pro", "kyiochatai", "kyiodeepseek", "kyiofelov2", "kyiofelosearch", "kyiogeminitts", "kyiogemini", "kyiogeminichat", "kyiogpt3", "kyiokimi", "kyiosentiment", "kyioperplexity", "kyiopublicai", "kyiotalkai", "kyiomagicstudio", "kyioturboseek", "kyiohumanizer", "kyiowritecream", "kyioyou", "kyioremovebg", "kyioremovebg2", "kyiodreemy", "kyiovision", "kyiogpt4", "kyiogpt35", "kyiounlimitedai", "kyiolangchain", "kyiodeepseekflash", "kyioglm", "kyioqwen", "kyiokatcoder", "kyiostepfun", "kyionvidiavision", "kyionvidia", "kyionvidiatranslate", "kyionotegpt", "kyiodeepsynth", "kyioqwenedit", "kyioclaudeflash", "kyiofluxai", "kyiodeepimage"],
  category: "ai",
  desc: "KyioAPI AI — 69 endpoint (.kyio* dkk, sumber api.kyio.web.id)",
  usage: ".kyiodeepseekai <pertanyaan>",
  isOwner: false,
};

async function handler(m, { sock, db }) {
  return runKyioTable(m, sock, TABLE, { title: "Kyio AI" });
}

export { handler, pluginConfig, TABLE, pluginConfig as config };
export default handler;
