// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═══════════════════════════════════════════════
// Nova AI Grup - Proactive messaging (ANTI-BAN)
// Bot ngomong sendiri dengan jeda aman & random
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
    endpoint: "https://kktoken.cc/v1/chat/completions",
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
    endpoint: "https://kktoken.cc/v1/messages",
    providerKey: "tio_anthropic",
  },
};

// ═══════════════════════════════════════════════
// ANTI-BAN SETTINGS
// ═══════════════════════════════════════════════
// Default interval (default 45 menit, bukan 5!)
const DEFAULT_INTERVAL_MIN = 10; // request owner 10 Sep 2026: default 10 menit

// Jam aktif (bot ga proactive di luar jam ini)
const ACTIVE_HOURS = { start: 8, end: 22 }; // 08:00 - 22:00

// Maks grup per cycle (jangan kirim ke semua grup sekaligus)
const MAX_GROUPS_PER_CYCLE = 2;

// Maks proactive message per grup per hari
const MAX_PROACTIVE_PER_GROUP_DAILY = 4;

// Jeda antar grup dalam satu cycle (10-30 detik random)
const INTER_GROUP_DELAY_MIN = 30000;
const INTER_GROUP_DELAY_MAX = 60000;

// Random jitter untuk interval (±30%)
// Contoh: 45 menit → bisa 31-59 menit
const JITTER_PERCENT = 30;

// Cek aktivitas grup: hanya proactive di grup yang ada aktivitas
// dalam 30 menit terakhir (biar ga ngomong di grup mati)
const REQUIRE_RECENT_ACTIVITY = true;
const RECENT_ACTIVITY_WINDOW_MS = 15 * 60 * 1000; // 30 menit

// Proactive timer state
let proactiveTimer = null;
let proactiveSock = null;

// Track proactive count per group per day
const groupDailyCount = new Map(); // groupId → date string + count

// Track last message time per group (dari handler)
const groupLastActivity = new Map(); // groupId → timestamp

// Conversation starters (template)
const CONVERSATION_STARTERS = [
  "Lagi pada ngapain nih",
  "Ada yang lagi seru ga nih",
  "Eh lagi pada sibuk ya",
  "Ngomong-ngomong, udah makan belum",
  "Halo, gimana kabarnya semua",
  "Ada rencana apa hari ini",
  "Btw ada yang tau ga, hari ini hari apa",
  "Grup lagi sepi nih, bangunin dong",
  "Ada yang mau cerita apa hari ini",
  "Lagi pada santai nih kayanya",
  "Ada yang sudah ngopi belum",
  "Halo, aku iseng mampir aja",
  "Ada hal menarik hari ini",
  "Kalian lagi pada main apa nih",
  "Btw cuaca hari ini gimana di tempat kalian",
];

const TOPIC_PROMPTS = [
  "Mulai percakapan santai tentang cuaca hari ini",
  "Tanya kabar semua member dengan santai",
  "Mulai obrolan tentang makanan yang enak",
  "Tanya tentang rencana weekend member",
  "Mulai obrolan ringan tentang hal lucu",
  "Tanya member lagi sibuk apa tidak",
  "Mulai obrolan ringan tentang lagu atau film",
  "Tanya member tentang rencana hari ini",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getKeyForFormat(aiHelp, fmtKey) {
  const fmt = TIO_FORMATS[fmtKey];
  const fmtKey2 = aiHelp[fmt.apiKeyField] || "";
  const fallback = aiHelp.apiKey || process.env.OPENAI_API_KEY || "";
  return fmtKey2 || fallback;
}

// Cek apakah sekarang dalam jam aktif
function isWithinActiveHours() {
  const hour = new Date().getHours();
  return hour >= ACTIVE_HOURS.start && hour < ACTIVE_HOURS.end;
}

// Cek apakah grup punya aktivitas recent
function hasRecentActivity(groupId) {
  if (!REQUIRE_RECENT_ACTIVITY) return true;
  const lastActivity = groupLastActivity.get(groupId);
  if (!lastActivity) return false;
  return Date.now() - lastActivity < RECENT_ACTIVITY_WINDOW_MS;
}

// Catat aktivitas grup (dipanggil dari handler saat ada pesan)
export function recordGroupActivity(groupId) {
  groupLastActivity.set(groupId, Date.now());
}

// Cek daily limit per grup
function getGroupDailyCount(groupId) {
  const today = new Date().toDateString();
  const entry = groupDailyCount.get(groupId);
  if (!entry || entry.date !== today) return 0;
  return entry.count;
}

function incrementGroupDailyCount(groupId) {
  const today = new Date().toDateString();
  const entry = groupDailyCount.get(groupId);
  if (!entry || entry.date !== today) {
    groupDailyCount.set(groupId, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

// Hitung interval dengan jitter
function getJitteredInterval(baseMin) {
  const jitter = (baseMin * JITTER_PERCENT) / 100;
  const min = Math.max(5, baseMin - jitter);
  const max = baseMin + jitter;
  return randomBetween(min, max);
}

// Generate pesan proactive
async function generateProactiveMessage(aiHelp, fmtKey, model, apiKey, groupName, memberNames) {
  const fmt = TIO_FORMATS[fmtKey] || TIO_FORMATS.openai;
  const apiEndpoint = fmtKey === "gemini"
    ? `https://kktoken.cc/v1beta/models/${model}:generateContent`
    : fmt.endpoint;

  // 60% template, 40% AI (lebih banyak template = lebih aman)
  const useAI = Math.random() < 0.3;

  if (!useAI || !apiKey) {
    return getRandomItem(CONVERSATION_STARTERS);
  }

  try {
    const systemPrompt = aiHelp.aigrupSystemPrompt ||
      `Kamu adalah teman dalam grup WhatsApp. Namamu Nova. ` +
      `Jawab santai, singkat, dan natural seperti chat biasa. ` +
      `Maksimal 1-2 kalimat. Pakai bahasa gaul/sehari-hari. ` +
      `JANGAN mengaku sebagai AI/bot. Kamu teman biasa. ` +
      `JANGAN mulai pesan dengan emoji. Kalau mau pakai emoji, taruh di akhir kalimat.`;

    const topicPrompt = getRandomItem(TOPIC_PROMPTS);
    const userPrompt = `Kamu ada di grup "${groupName}". ${topicPrompt}. Buat pesan singkat untuk memulai percakapan, langsung to the point.`;

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
      maxTokens: 80,
    });

    if (reply && reply.length > 3 && reply.length < 200) {
      return reply.trim();
    }
  } catch (e) {
    console.error("[aigrup-proactive]", e.message);
  }

  return getRandomItem(CONVERSATION_STARTERS);
}

// Main proactive cycle
async function runProactive() {
  try {
    if (!proactiveSock) return;

    const db = getDatabase();
    if (!db?.db?.data?.aigrup) return;
    const aigrup = db.db.data.aigrup;
    if (!aigrup.enabled) return;

    // ── Cek proactive enabled ──
    if (aigrup.proactiveEnabled === false) return;

    // ── Cek jam aktif ──
    if (!isWithinActiveHours()) {
      console.log("[aigrup] Di luar jam aktif, skip proactive");
      return;
    }

    // ── Resolve format & model ──
    const fmtKey = aigrup.format || "openai";
    const fmt = TIO_FORMATS[fmtKey] || TIO_FORMATS.openai;
    const model = aigrup.model || fmt.defaultModel;

    const aiHelp = config.aiHelp || {};
    const apiKey = getKeyForFormat(aiHelp, fmtKey);
    if (!apiKey) return;

    // ── Ambil semua grup ──
    let groups = [];
    try {
      const allGroups = await proactiveSock.groupFetchAllParticipating();
      groups = Object.values(allGroups || {});
    } catch (e) {
      console.error("[aigrup-proactive] groupFetch:", e.message);
      return;
    }

    if (!groups.length) return;

    // ── Filter grup ──
    const eligibleGroups = [];

    for (const group of groups) {
      const groupId = group.id;

      // Cek allowlist (kalau ada)
      if (aigrup.groups && Object.keys(aigrup.groups).length > 0) {
        if (!aigrup.groups[groupId]) continue;
      }

      // Cek aktivitas recent (grup masih aktif?)
      if (!hasRecentActivity(groupId)) continue;

      // Cek daily limit per grup
      if (getGroupDailyCount(groupId) >= MAX_PROACTIVE_PER_GROUP_DAILY) continue;

      eligibleGroups.push(group);
    }

    if (!eligibleGroups.length) return;

    // ── Pilih max 3 grup random ──
    const selected = eligibleGroups
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_GROUPS_PER_CYCLE);

    console.log(`[aigrup] Proactive cycle: ${selected.length}/${eligibleGroups.length} grup eligible (dari ${groups.length} total)`);

    for (const group of selected) {
      try {
        const groupId = group.id;
        const groupName = group.subject || "Grup";

        // Ambil nama member untuk konteks
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

        // Typing indicator (natural)
        await proactiveSock.sendPresenceUpdate("composing", groupId);

        // Delay natural (semakin panjang semakin lama, max 3s)
        const typingDelay = Math.min(message.length * 15, 3000);
        await new Promise((r) => setTimeout(r, typingDelay));

        // Kirim
        await proactiveSock.sendPresenceUpdate("paused", groupId);
        await proactiveSock.sendMessage(groupId, { text: message });

        // Catat daily count
        incrementGroupDailyCount(groupId);

        console.log(`[aigrup] Proactive sent to ${groupName} (${groupId})`);

        // Jeda random antar grup (10-30 detik)
        const interDelay = randomBetween(INTER_GROUP_DELAY_MIN, INTER_GROUP_DELAY_MAX);
        await new Promise((r) => setTimeout(r, interDelay));
      } catch (e) {
        console.error("[aigrup-proactive] group:", group.id, e.message);
      }
    }
  } catch (error) {
    console.error("[aigrup-proactive]", error.message);
  } finally {
    // ── Schedule next cycle dengan jitter ──
    scheduleNextCycle();
  }
}

// Schedule next cycle dengan interval jitter
function scheduleNextCycle() {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }

  const db = getDatabase();
  const baseInterval = db?.db?.data?.aigrup?.proactiveInterval || DEFAULT_INTERVAL_MIN;
  const jitteredMin = getJitteredInterval(baseInterval);
  const intervalMs = jitteredMin * 60 * 1000;

  proactiveTimer = setTimeout(runProactive, intervalMs);
  console.log(`[aigrup] Next proactive in ~${Math.round(jitteredMin)} minutes`);
}

export function startProactiveTimer(sock) {
  proactiveSock = sock;

  // Stop timer lama
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }

  // Cek apakah proactive di-enable
  const db = getDatabase();
  if (db?.db?.data?.aigrup?.proactiveEnabled === false) {
    console.log("[aigrup] Proactive timer skipped (proactiveEnabled = false)");
    return;
  }

  // Schedule first cycle (tunggu 10 menit setelah connect, bukan langsung)
  const firstDelay = 10 * 60 * 1000; // 10 menit
  proactiveTimer = setTimeout(runProactive, firstDelay);

  console.log(`[aigrup] Proactive timer started. First cycle in 10 min, then every ~${DEFAULT_INTERVAL_MIN} min (with jitter)`);
}

export function stopProactiveTimer() {
  if (proactiveTimer) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  proactiveSock = null;
  console.log("[aigrup] Proactive timer stopped");
}

export function restartProactiveTimer(sock) {
  stopProactiveTimer();
  if (sock) {
    proactiveSock = sock;
    // Restart langsung (tunggu 2 menit)
    proactiveTimer = setTimeout(runProactive, 2 * 60 * 1000);
    console.log("[aigrup] Proactive timer restarted (first cycle in 2 min)");
  }
}
