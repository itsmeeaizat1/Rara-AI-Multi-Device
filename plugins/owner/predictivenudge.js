// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Predictive Life-Nudge — Bot belajar kebiasaan user, kirim pengingat proaktif
// Track: pola chat, jam aktif, durasi aktivitas, emosi -> prediksi kebutuhan
// .predictivenudge on/off — Toggle (default OFF saat pairing)
// .predictivenudge status — Lihat pola yang sudah dipelajari
// .predictivenudge nudge now — Test kirim nudge manual
// .predictivenudge reset — Reset data pola
// .predictivenudge voice on/off — Nudge pakai VN suara neural atau teks
import { getDatabase } from "../../src/lib/nova-database.js";
import { getApiKey, hasApiKey } from "../../src/lib/nova-api-keys.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { callAI } from "../../src/lib/nova-ai-service.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(prefix, ext) {
  ensureTmp();
  return path.join(TMP_DIR, `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const pluginConfig = {
  name: "predictivenudge",
  alias: ["lifenudge", "smartnudge", "behaviornudge", "autopredictnudge"],
  category: "owner",
  description: "Toggle Predictive Life-Nudge — Bot belajar pola user, kirim pengingat proaktif",
  usage: ".predictivenudge on/off — Toggle\n.predictivenudge status — Lihat pola\n.predictivenudge nudge now — Test nudge\n.predictivenudge reset — Reset data\n.predictivenudge voice on/off — Nudge VN atau teks",
  example: ".predictivenudge on\n.predictivenudge status",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
  defaultOff: true,
};

const NUDGE_SYSTEM_PROMPT = `Kamu adalah Nova, teman yang sangat perhatian dan peduli. Kamu sudah mempelajari pola kebiasaan user dan akan mengirim "nudge" — pengingat proaktif yang terasa kayak teman dekat yang peduli, bukan robot.

Aturan nudge:
1. Natural, kasual, santai. Kayak teman deket yang peduli, bukan asisten formal
2. SINGKAT (1-3 kalimat). Ini nudge, bukan ceramah
3. Boleh pakai bahasa gaul. Jangan kaku
4. JANGAN mengaku AI/bot. Kamu teman biasa
5. Jangan pakai markdown, poin-poin, atau format formal
6. Sesuaikan dengan konteks:
   - User aktif terlalu lama -> "Eh lu udah 4 jam nonstop, istirahat dulu 10 menit"
   - User lagi malam -> "Udah jam 2 pagi nih, tidur dong, besok bisa lanjut"
   - User kelihatan capek -> "Lu kayaknya capek, mau gua pesenin kopi?"
   - User belum makan -> "Udah makan belum? Jangan sampe lupa ya"
   - User produktif -> "Mantap, semangat terus! Tapi jangan lupa minum air"
7. Personal. Pakai data pola yang dikasih. Jangan generic`;

// === NUDGE TEMPLATES (fallback tanpa API) ===
const NUDGE_TEMPLATES = {
  overwork: [
    "Eh lu udah aktif {hours} jam nonstop nih. Istirahat dulu 10 menit, minum air, regangin badan.",
    "Waduuh {hours} jam terus tanpa break? Lu bukan robot ya. Rest dulu bentar.",
    "Guys, {hours} jam nonstop itu gak sehat. Ambil jeda 10 menit, liat ke luar jendela, minum air.",
  ],
  lateNight: [
    "Udah jam {time} nih. Masih aktif terus? Tidur dong, besok bisa lanjut pagi.",
    "Jam {time} masih online? Lu nanti sakit tau. Tidur sekarang, besok lebih produktif.",
    "Eh, jam {time} masih begadang? Badan lu butuh istirahat, jangan maksa.",
  ],
  hungry: [
    "Udah {hours} jam lu online tapi gak ada chat soal makan. Udah makan belum? Jangan lupa ya.",
    "Eh, lupa makan nih kayaknya. {hours} jam aktif terus. Makan dulu, perut kosong bikin gak fokus.",
  ],
  dehydrated: [
    "Lu udah aktif {hours} jam, minum air dulu ya. Dehidrasi bikin pusing dan gak fokus.",
    "Eh jangan lupa minum air. {hours} jam nonstop tuh, tubuh lu butuh cairan.",
  ],
  productive: [
    "Mantap, lu lagi on fire nih! {messages} pesen dalam {hours} jam. Semangat, tapi jangan lupa minum air ya.",
    "Wih produktif banget hari ini! Tapi ingat, istirahat itu juga bagian dari produktivitas.",
  ],
  inactive: [
    "Eh lu udah {gap} jam gak online. Semua baik-baik aja kan? Kalau butuh apa-apa, sini cerita.",
    "Lu tadi hilang {gap} jam, pa kabar? Jangan lupa makan dan istirahat ya.",
  ],
  morning: [
    "Pagi! Lu udah aktif nih. Jangan lupa sarapan ya, biar energi penuh buat hari ini.",
    "Selamat pagi! Awali hari dengan minum air putih dulu, baru lanjut aktivitas.",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// === EDGE NEURAL TTS untuk nudge VN ===
async function edgeTTS(text, voiceLang = "id-ID-GadisNeural") {
  try {
    const outFile = tempPath("nudgetts", ".mp3");
    const cleanText = text.replace(/["`']/g, "").replace(/\n/g, " ").slice(0, 300);

    const cmd = `python3 -c "
import edge_tts, asyncio
async def gen():
    comm = edge_tts.Communicate('${cleanText.replace(/'/g, "\\'")}', '${voiceLang}')
    await comm.save('${outFile}')
asyncio.run(gen())
" 2>/dev/null`;

    await execAsync(cmd, { timeout: 20000 });

    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      return fs.readFileSync(outFile);
    }
    return null;
  } catch {
    return null;
  }
}

async function convertToOgg(inputBuffer, inputExt = ".mp3") {
  const inFile = tempPath("vnin", inputExt);
  const outFile = tempPath("vnout", ".ogg");

  try {
    fs.writeFileSync(inFile, inputBuffer);
    await execAsync("ffmpeg -y -i " + inFile + " -codec:a libopus -b:a 32k -ar 48000 " + outFile + " 2>/dev/null");
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 500) {
      return fs.readFileSync(outFile);
    }
    return null;
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(inFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}

// === PATTERN ANALYSIS ===
function analyzePatterns(userData) {
  if (!userData || !userData.messages || userData.messages.length < 5) {
    return { hasEnoughData: false };
  }

  const messages = userData.messages;
  const now = new Date();
  const today = now.toDateString();

  // Filter today's messages
  const todayMsgs = messages.filter(m => new Date(m.time).toDateString() === today);

  // Hour distribution (all time)
  const hourCounts = new Array(24).fill(0);
  messages.forEach(m => {
    hourCounts[new Date(m.time).getHours()]++;
  });

  // Find peak hours
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Active duration today
  let firstMsgTime = null;
  let lastMsgTime = null;
  if (todayMsgs.length > 0) {
    firstMsgTime = new Date(todayMsgs[0].time);
    lastMsgTime = new Date(todayMsgs[todayMsgs.length - 1].time);
  }

  const activeHours = firstMsgTime && lastMsgTime
    ? (lastMsgTime - firstMsgTime) / (1000 * 60 * 60)
    : 0;

  // Message gap (time since last message)
  const lastMsg = messages[messages.length - 1];
  const lastMsgDate = new Date(lastMsg.time);
  const gapHours = (now - lastMsgDate) / (1000 * 60 * 60);

  // Late night activity (after 11 PM or before 5 AM)
  const currentHour = now.getHours();
  const isLateNight = currentHour >= 23 || currentHour <= 4;

  // Morning activity (5-9 AM)
  const isMorning = currentHour >= 5 && currentHour <= 9;

  // Average message length
  const avgMsgLen = messages.reduce((sum, m) => sum + (m.length || 0), 0) / messages.length;

  // VN ratio
  const vnCount = messages.filter(m => m.type === "vn").length;
  const vnRatio = vnCount / messages.length;

  // Activity level
  const msgCountToday = todayMsgs.length;
  const activityLevel = msgCountToday < 10 ? "low" : msgCountToday < 50 ? "medium" : "high";

  return {
    hasEnoughData: true,
    peakHour,
    activeHours: Math.round(activeHours * 10) / 10,
    gapHours: Math.round(gapHours * 10) / 10,
    isLateNight,
    isMorning,
    msgCountToday,
    avgMsgLen: Math.round(avgMsgLen),
    vnRatio: Math.round(vnRatio * 100),
    activityLevel,
    hourCounts,
    lastMsgTime: lastMsgDate,
  };
}

// === NUDGE DECISION ENGINE ===
function decideNudge(pattern, userData) {
  if (!pattern.hasEnoughData) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const nudges = userData.nudges || [];
  const lastNudgeTime = nudges.length > 0 ? new Date(nudges[nudges.length - 1].time) : null;
  const hoursSinceLastNudge = lastNudgeTime
    ? (now - lastNudgeTime) / (1000 * 60 * 60)
    : 999;

  // Don't nudge more than once every 2 hours
  if (hoursSinceLastNudge < 2) return null;

  // 1. Overwork detection (active 4+ hours, 20+ messages)
  if (pattern.activeHours >= 4 && pattern.msgCountToday >= 20) {
    const nudge = pickRandom(NUDGE_TEMPLATES.overwork).replace("{hours}", Math.round(pattern.activeHours));
    return { type: "overwork", text: nudge };
  }

  // 2. Late night (11 PM - 4 AM, still active)
  if (pattern.isLateNight && pattern.msgCountToday >= 5) {
    const time = formatTime(now);
    const nudge = pickRandom(NUDGE_TEMPLATES.lateNight).replace("{time}", time);
    return { type: "lateNight", text: nudge };
  }

  // 3. Long gap (inactive 3+ hours after being active)
  if (pattern.gapHours >= 3 && pattern.msgCountToday >= 10) {
    const nudge = pickRandom(NUDGE_TEMPLATES.inactive).replace("{gap}", Math.round(pattern.gapHours));
    return { type: "inactive", text: nudge };
  }

  // 4. Morning nudge (first activity of the day, 5-9 AM)
  if (pattern.isMorning && pattern.msgCountToday <= 3 && pattern.msgCountToday > 0) {
    const nudge = pickRandom(NUDGE_TEMPLATES.morning);
    return { type: "morning", text: nudge };
  }

  // 5. High productivity (50+ messages today)
  if (pattern.msgCountToday >= 50 && pattern.activeHours >= 2) {
    const nudge = pickRandom(NUDGE_TEMPLATES.productive)
      .replace("{messages}", pattern.msgCountToday)
      .replace("{hours}", Math.round(pattern.activeHours));
    return { type: "productive", text: nudge };
  }

  // 6. Hungry detection (active 5+ hours, no food-related keywords, 11-14 or 17-20)
  const mealHours = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 20);
  if (mealHours && pattern.activeHours >= 5 && pattern.msgCountToday >= 15) {
    const hasFoodChat = (userData.messages || []).some(m =>
      /makan|lapar|makanan|nasi|ayam|minum|kopi|kafe|warung/i.test(m.text || "")
    );
    if (!hasFoodChat) {
      const nudge = pickRandom(NUDGE_TEMPLATES.hungry).replace("{hours}", Math.round(pattern.activeHours));
      return { type: "hungry", text: nudge };
    }
  }

  // 7. Dehydration (active 3+ hours, no water mention)
  if (pattern.activeHours >= 3 && pattern.msgCountToday >= 10) {
    const hasWaterChat = (userData.messages || []).some(m =>
      /minum|air|dehydra|haus/i.test(m.text || "")
    );
    if (!hasWaterChat) {
      const nudge = pickRandom(NUDGE_TEMPLATES.dehydrated).replace("{hours}", Math.round(pattern.activeHours));
      return { type: "dehydrated", text: nudge };
    }
  }

  return null;
}

// === AI-ENHANCED NUDGE (with API key) ===
async function generateAINudge(pattern, userData, botConfig) {
  const geminiKey = getApiKey("gemini");
  const apiKey = getApiKey("aiFallback") || getApiKey("openai");

  const patternSummary = `Pola user:
- Jam aktif hari ini: ${pattern.activeHours} jam
- Pesan hari ini: ${pattern.msgCountToday}
- Jam puncak: ${pattern.peakHour}:00
- Level aktivitas: ${pattern.activityLevel}
- Rata-rata panjang pesan: ${pattern.avgMsgLen} karakter
- VN ratio: ${pattern.vnRatio}%
- Waktu sekarang: ${formatTime(new Date())}
- Waktu terakhir aktif: ${formatTime(pattern.lastMsgTime)}
- Gap dari pesan terakhir: ${pattern.gapHours} jam
- Late night: ${pattern.isLateNight}
- Pagi: ${pattern.isMorning}`;

  // Try Gemini
  if (geminiKey) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: patternSummary + "\n\nKirim nudge sekarang berdasarkan pola di atas." }]}],
            systemInstruction: { parts: [{ text: NUDGE_SYSTEM_PROMPT }] },
            generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 5) return text.trim();
      }
    } catch {}
  }

  return null;
}

// === TRACK MESSAGE (passive data collection, called from handler.js) ===
export function trackPredictiveNudge(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.predictiveNudge) return;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.predictiveNudge[gid];
    if (!cfg || !cfg.enabled) return;

    if (m.fromMe || m.isCommand) return;

    // Get or create user data
    if (!db.db.data.predictiveNudgeData) db.db.data.predictiveNudgeData = {};
    const allData = db.db.data.predictiveNudgeData;
    const uid = m.sender || m.key?.participant || gid;
    if (!allData[uid]) {
      allData[uid] = { messages: [], nudges: [], createdAt: Date.now() };
    }

    const userData = allData[uid];

    // Record message
    const msgType = m.message?.audioMessage || m.message?.voiceMessage || m.message?.pttMessage ? "vn" : "text";
    const msgText = (m.text || "").slice(0, 200);
    const msgLen = msgText.length;

    userData.messages.push({
      time: new Date().toISOString(),
      type: msgType,
      text: msgText,
      length: msgLen,
    });

    // Keep last 500 messages
    if (userData.messages.length > 500) {
      userData.messages = userData.messages.slice(-500);
    }

    // Write (debounced — only write every 5th message to avoid IO)
    if (userData.messages.length % 5 === 0) {
      db.db.write();
    }

    return true;
  } catch (e) {
    return false;
  }
}

// === CHECK & SEND NUDGE (called from handler.js after track) ===
export async function checkAndSendNudge(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.predictiveNudge || !db.db.data.predictiveNudgeData) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.predictiveNudge[gid];
    if (!cfg || !cfg.enabled) return false;

    if (m.fromMe || m.isCommand) return false;

    const uid = m.sender || m.key?.participant || gid;
    const userData = db.db.data.predictiveNudgeData[uid];
    if (!userData || userData.messages.length < 5) return false;

    // Analyze pattern
    const pattern = analyzePatterns(userData);

    // Decide if nudge needed
    const nudgeDecision = decideNudge(pattern, userData);
    if (!nudgeDecision) return false;

    // Generate nudge text
    let nudgeText = nudgeDecision.text;

    // Try AI-enhanced nudge (if API key available)
    const botConfig = (await import("../../config.js")).default;
    const aiNudge = await generateAINudge(pattern, userData, botConfig);
    if (aiNudge) nudgeText = aiNudge;

    // Clean up
    nudgeText = nudgeText.replace(/[*#_~`]/g, "").replace(/\n{2,}/g, "\n").trim().slice(0, 500);

    // Record nudge
    userData.nudges.push({
      time: new Date().toISOString(),
      type: nudgeDecision.type,
      text: nudgeText,
    });

    // Keep last 100 nudges
    if (userData.nudges.length > 100) {
      userData.nudges = userData.nudges.slice(-100);
    }

    db.db.write();

    // Send nudge
    const useVoice = cfg.voice !== false; // default true

    if (useVoice) {
      // Try VN nudge
      const voiceLang = cfg.voiceLang || "id-ID-GadisNeural";
      const ttsBuffer = await edgeTTS(nudgeText, voiceLang);

      if (ttsBuffer) {
        const oggBuffer = await convertToOgg(ttsBuffer, ".mp3");
        if (oggBuffer) {
          await sock.sendMessage(gid, {
            audio: oggBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
          });
          return true;
        }
      }
    }

    // Fallback: text nudge
    await sock.sendMessage(gid, { text: nudgeText });
    return true;
  } catch (e) {
    console.error("[PredictiveNudge] Check error:", e.message);
    return false;
  }
}

// === COMMAND HANDLER ===
async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const db = getDatabase();
    if (!db.db.data.predictiveNudge) db.db.data.predictiveNudge = {};
    const cfg = db.db.data.predictiveNudge;
    const gid = m.key?.remoteJid || "";

    const arg = (m.text || "").trim().toLowerCase();
    const args = arg.split(/\s+/);

    if (args[0] === "on") {
      cfg[gid] = {
        enabled: true,
        voice: cfg[gid]?.voice ?? true,
        voiceLang: cfg[gid]?.voiceLang || "id-ID-GadisNeural",
      };
      db.db.write();
      const text = claraWrap("Predictive Life-Nudge", [
        "Status: ON",
        "Voice: " + (cfg[gid].voice ? "ON (Gadis neural)" : "OFF (teks)"),
        "",
        "Bot sekarang belajar:",
        "1. Jam aktif & puncak aktivitas",
        "2. Durasi nonstop tanpa break",
        "3. Pola makan & minum",
        "4. Jam begadang & produktif",
        "5. Gap aktivitas (hilang mendadak)",
        "",
        "Nudge proaktif:",
        "Overwork -> 'Istirahat dulu'",
        "Begadang -> 'Tidur dong'",
        "Lupa makan -> 'Udah makan belum?'",
        "Produktif -> 'Mantap, semangat!'",
        "Hilang -> 'Pa kabar?'",
        "",
        "Default OFF. Tidak aktif saat pairing.",
      ].join("\n")) + "\n" + tipText("Ketik " + prefix + "predictivenudge off untuk matikan");
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    } else if (args[0] === "off") {
      if (cfg[gid]) cfg[gid].enabled = false;
      db.db.write();
      const text = claraWrap("Predictive Life-Nudge", ["Status: OFF", "Pengingat proaktif dimatikan"].join("\n"));
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    } else if (args[0] === "voice") {
      const voiceOpt = args[1];
      if (!cfg[gid]) cfg[gid] = {};
      if (voiceOpt === "on") {
        cfg[gid].voice = true;
        cfg[gid].voiceLang = "id-ID-GadisNeural";
      } else if (voiceOpt === "off") {
        cfg[gid].voice = false;
      } else {
        const text = claraWrap("Predictive Life-Nudge", "Pilih: on (VN neural) atau off (teks)");
        await sendReplyWithNav(sock, m, text, "predictivenudge");
        return { handled: true };
      }
      cfg[gid].enabled = cfg[gid].enabled ?? true;
      db.db.write();
      const text = claraWrap("Predictive Life-Nudge", [
        "Voice: " + (cfg[gid].voice ? "ON (Gadis neural VN)" : "OFF (teks)"),
        "Status: " + (cfg[gid].enabled ? "ON" : "OFF"),
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    } else if (args[0] === "status") {
      const uid = m.sender || gid;
      const allData = db.db.data.predictiveNudgeData || {};
      const userData = allData[uid];
      const pattern = userData ? analyzePatterns(userData) : null;

      let lines = ["Status: " + (cfg[gid]?.enabled ? "ON" : "OFF")];

      if (pattern && pattern.hasEnoughData) {
        lines.push("");
        lines.push("Pola terdeteksi:");
        lines.push("Jam aktif: " + pattern.activeHours + " jam");
        lines.push("Pesan hari ini: " + pattern.msgCountToday);
        lines.push("Jam puncak: " + pattern.peakHour + ":00");
        lines.push("Level: " + pattern.activityLevel);
        lines.push("Avg pesan: " + pattern.avgMsgLen + " char");
        lines.push("VN ratio: " + pattern.vnRatio + "%");
        lines.push("Nudge terkirim: " + (userData.nudges?.length || 0));
      } else {
        lines.push("");
        lines.push("Data belum cukup (butuh min 5 pesan)");
        lines.push("Pesan terkumpul: " + (userData?.messages?.length || 0) + "/5");
      }

      lines.push("");
      lines.push(prefix + "predictivenudge nudge now — Test nudge");

      const text = claraWrap("Predictive Life-Nudge", lines.join("\n"));
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    } else if (args[0] === "nudge" && args[1] === "now") {
      // Manual test nudge
      const uid = m.sender || gid;
      const allData = db.db.data.predictiveNudgeData || {};
      const userData = allData[uid];

      let nudgeText;
      if (userData && userData.messages.length >= 5) {
        const pattern = analyzePatterns(userData);
        const decision = decideNudge(pattern, userData);
        if (decision) {
          nudgeText = decision.text;
        } else {
          nudgeText = "Eh, lagi apa? Jangan lupa istirahat dan minum air ya. Pola lu lagi bagus kok hari ini.";
        }
      } else {
        nudgeText = "Halo! Aku lagi belajar pola kebiasaan lu. Tunggu beberapa hari ya, nanti aku bisa ngasih pengingat proaktif.";
      }

      const useVoice = cfg[gid]?.voice !== false;
      if (useVoice) {
        const ttsBuffer = await edgeTTS(nudgeText, cfg[gid]?.voiceLang || "id-ID-GadisNeural");
        if (ttsBuffer) {
          const oggBuffer = await convertToOgg(ttsBuffer, ".mp3");
          if (oggBuffer) {
            await sock.sendMessage(gid, {
              audio: oggBuffer,
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            }, { quoted: m });
            return { handled: true };
          }
        }
      }

      await sock.sendMessage(gid, { text: nudgeText }, { quoted: m });
    } else if (args[0] === "reset") {
      const uid = m.sender || gid;
      if (db.db.data.predictiveNudgeData && db.db.data.predictiveNudgeData[uid]) {
        db.db.data.predictiveNudgeData[uid] = { messages: [], nudges: [], createdAt: Date.now() };
        db.db.write();
      }
      const text = claraWrap("Predictive Life-Nudge", ["Data pola direset", "Bot akan belajar ulang dari awal"].join("\n"));
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    } else {
      const status = cfg[gid]?.enabled ? "ON" : "OFF";
      const text = claraWrap("Predictive Life-Nudge", [
        "Status: " + status,
        "Voice: " + (cfg[gid]?.voice !== false ? "ON (Gadis neural)" : "OFF (teks)"),
        "Default: OFF (tidak aktif saat pairing)",
        "",
        "Perintah:",
        prefix + "predictivenudge on/off — Toggle",
        prefix + "predictivenudge status — Lihat pola",
        prefix + "predictivenudge nudge now — Test nudge",
        prefix + "predictivenudge reset — Reset data",
        prefix + "predictivenudge voice on/off — VN atau teks",
      ].join("\n"));
      await sendReplyWithNav(sock, m, text, "predictivenudge");
    }
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}

export function isPredictiveNudgeEnabled(m, sock) {
  try {
    const db = getDatabase();
    if (!db.db.data.predictiveNudge) return false;
    const gid = m.key?.remoteJid || "";
    const cfg = db.db.data.predictiveNudge[gid];
    return cfg && cfg.enabled === true;
  } catch {
    return false;
  }
}

export { pluginConfig as config, handler };
