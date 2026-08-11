// ═══════════════════════════════════════════════
// Nova AI Grup - Proactive messaging
// Bot ngomong sendiri tiap X menit di grup
// ═══════════════════════════════════════════════
import { getDatabase } from "./nova-database.js";
import { callAI } from "./nova-ai-service.js";
import config from "../../config.js";

// Format definitions (sync dengan aigrup.js)
const TIO_FORMATS = {
  openai: {
    label: "OpenAI",
    apiKeyField: "openaiApiKey",
    modelField: "openaiModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: "https://ai.tioo.eu.org/v1/chat/completions",
    providerKey: "tio_openai",
  },
  gemini: {
    label: "Gemini",
    apiKeyField: "geminiApiKey",
    modelField: "geminiModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: null,
    providerKey: "tio_gemini",
  },
  anthropic: {
    label: "Anthropic",
    apiKeyField: "anthropicApiKey",
    modelField: "anthropicModel",
    defaultModel: "deepseek-v4-flash:free",
    endpoint: "https://ai.tioo.eu.org/v1/messages",
    providerKey: "tio_anthropic",
  },
};

// Proactive timer state
let proactiveTimer = null;
let proactiveSock = null;

// Random conversation starters yang bot bisa kirim
const CONVERSATION_STARTERS = [
  "Lagi pada ngapain nih? 👀",
  "Ada yang lagi seru ga nih di grup?",
  "Eh lagi pada sibuk ya? Aku gabut nih 😅",
  "Ngomong-ngomong, udah makan belum? 🍚",
  "Halo halo, lagi pada aktif ga nih?",
  "Aku baru nyampe, ada yang missed ga? 🤔",
  "Btw ada rencana apa hari ini?",
  "Lagi pada di mana nih? 👀",
  "Eh ada yang tau ga, hari ini hari apa? 😄",
  "Grup lagi sepi nih, bangunin dong 😴",
  "Halo semuanya, gimana kabarnya? 😊",
  "Ada yang mau cerita apa hari ini?",
  "Lagi pada santai nih kayanya ~",
  "Eh ngomong-ngomong, ada yang nonton ga kemarin?",
  "Kalian lagi pada main apa nih? 🎮",
  "Btw cuaca hari ini gimana di tempat kalian? ☀️",
  "Ada yang sudah ngopi belum? ☕",
  "Hmm grub lagi sepi, kayaknya pada sibuk ya",
  "Halo, aku iseng mampir aja 😄",
  "Ada hal menarik yang kalian alami hari ini? ✨",
];

// Topic prompts untuk AI-generated conversation starters
const TOPIC_PROMPTS = [
  "Mulai percakapan santai tentang cuaca hari ini",
  "Tanya kabar semua member dengan santai",
  "Mulai obrolan tentang makanan yang enak hari ini",
  "Tanya tentang rencana weekend member",
  "Mulai obrolan ringan tentang hal lucu yang terjadi",
  "Cerita sedikit tentang dirimu dan tanya kabar member",
  "Mulai obrolan tentang hobi atau kesukaan",
  "Tanya member lagi sibuk apa tidak",
  "Mulai obrolan ringan tentang lagu atau film",
  "Tanya member tentang rencana hari ini",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getKeyForFormat(aiHelp, fmtKey) {
  const fmt = TIO_FORMATS[fmtKey];
  const fmtKey2 = aiHelp[fmt.apiKeyField] || "";
  const fallback = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
  return fmtKey2 || fallback;
}

async function generateProactiveMessage(aiHelp, fmtKey, model, apiKey, groupName, memberNames) {
  const fmt = TIO_FORMATS[fmtKey] || TIO_FORMATS.openai;
  const apiEndpoint = fmtKey === "gemini"
    ? `https://ai.tioo.eu.org/v1beta/models/${model}:generateContent`
    : fmt.endpoint;

  const topicPrompt = getRandomItem(TOPIC_PROMPTS);
  const useAI = Math.random() < 0.5; // 50% AI, 50% template

  if (!useAI || !apiKey) {
    return getRandomItem(CONVERSATION_STARTERS);
  }

  try {
    const systemPrompt = aiHelp.aigrupSystemPrompt ||
      `Kamu adalah teman dalam grup WhatsApp. Namamu Nova. ` +
      `Jawab santai, singkat, dan natural seperti chat biasa. ` +
      `Maksimal 1-2 kalimat. Pakai bahasa gaul/sehari-hari. ` +
      `JANGAN mengaku sebagai AI/bot. Kamu teman biasa.`;

    const userPrompt = `Kamu ada di grup "${groupName}". Member: ${memberNames}. ${topicPrompt}. Buat pesan singkat untuk memulai percakapan, langsung to the point, jangan pakai prefix atau label.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const reply = await callAI({
      providerKey: fmt.providerKey,
      model: model,
      messages: messages,
      apiKey: apiKey,
      apiEndpoint: apiEndpoint,
      temperature: 0.9,
      maxTokens: 100,
    });

    if (reply && reply.length > 3 && reply.length < 300) {
      return reply.trim();
    }
  } catch (e) {
    console.error("[aigrup-proactive]", e.message);
  }

  return getRandomItem(CONVERSATION_STARTERS);
}

async function runProactive() {
  try {
    if (!proactiveSock) return;

    const db = getDatabase();
    if (!db?.db?.data?.aigrup) return;
    const aigrup = db.db.data.aigrup;
    if (!aigrup.enabled) return;

    // Cek interval dari config/database (default 5 menit)
    const intervalMin = aigrup.proactiveInterval || 5;

    // Resolve format & model
    const fmtKey = aigrup.format || "openai";
    const fmt = TIO_FORMATS[fmtKey] || TIO_FORMATS.openai;
    const model = aigrup.model || fmt.defaultModel;

    const aiHelp = config.aiHelp || {};
    const apiKey = getKeyForFormat(aiHelp, fmtKey);
    if (!apiKey) return;

    // Ambil semua grup yang bot join
    let groups = [];
    try {
      const allGroups = await proactiveSock.groupFetchAllParticipating();
      groups = Object.values(allGroups || {});
    } catch (e) {
      console.error("[aigrup-proactive] groupFetch:", e.message);
      return;
    }

    if (!groups.length) return;

    // Kirim ke SEMUA grup (atau bisa difilter ke yang di-allowlist)
    for (const group of groups) {
      try {
        const groupId = group.id;
        const groupName = group.subject || "Grup";

        // Cek apakah grup ini di-allowlist (kalau ada)
        // Kalau groups empty = semua grup aktif
        if (aigrup.groups && Object.keys(aigrup.groups).length > 0) {
          if (!aigrup.groups[groupId]) continue;
        }

        // Ambil beberapa nama member untuk konteks
        const participants = group.participants || [];
        const memberNames = participants
          .slice(0, 5)
          .map((p) => p.id?.split("@")[0] || "seseorang")
          .join(", ");

        // Generate pesan
        const message = await generateProactiveMessage(
          aiHelp, fmtKey, model, apiKey, groupName, memberNames
        );

        if (!message || message.length < 2) continue;

        // Typing indicator
        await proactiveSock.sendPresenceUpdate("composing", groupId);

        // Natural delay
        const delay = Math.min(message.length * 15, 2000);
        await new Promise((r) => setTimeout(r, delay));

        await proactiveSock.sendPresenceUpdate("paused", groupId);
        await proactiveSock.sendMessage(groupId, { text: message });

        // Delay antar grup (5 detik)
        await new Promise((r) => setTimeout(r, 5000));
      } catch (e) {
        console.error("[aigrup-proactive] group:", group.id, e.message);
      }
    }
  } catch (error) {
    console.error("[aigrup-proactive]", error.message);
  }
}

export function startProactiveTimer(sock) {
  proactiveSock = sock;

  // Stop timer lama kalau ada
  if (proactiveTimer) {
    clearInterval(proactiveTimer);
    proactiveTimer = null;
  }

  // Cek interval dari database
  const db = getDatabase();
  const intervalMin = db?.db?.data?.aigrup?.proactiveInterval || 5;
  const intervalMs = intervalMin * 60 * 1000;

  // Start timer
  proactiveTimer = setInterval(runProactive, intervalMs);

  console.log(`[aigrup] Proactive timer started: every ${intervalMin} minutes`);
}

export function stopProactiveTimer() {
  if (proactiveTimer) {
    clearInterval(proactiveTimer);
    proactiveTimer = null;
  }
  proactiveSock = null;
  console.log("[aigrup] Proactive timer stopped");
}

export function restartProactiveTimer(sock) {
  stopProactiveTimer();
  startProactiveTimer(sock);
}
