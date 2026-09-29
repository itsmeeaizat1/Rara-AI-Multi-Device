// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 AI Roleplay Chat — .airoleplaychat
// 🔹 Roleplay AI bareng 17 karakter (Sakura, Gojo Satoru, Anya, Luffy,
//   Doraemon, dll) atau persona custom bebas via fazzcode.eu.cc
// 🔹 Format:
//    .airoleplaychat list                       — daftar karakter
//    .airoleplaychat start <karakter>            — mulai sesi roleplay
//    .airoleplaychat custom <nama> | <persona>   — persona bebas
//    .airoleplaychat <pesan>                     — lanjut obrolan (sesi aktif)
//    .airoleplaychat stop                        — akhiri sesi
//    .airoleplaychat status                      — info sesi
// 🔹 Konteks: API stateless → riwayat disimpan lokal per-user (max 6 giliran)
//   dan di-inject ringkas ke query biar karakter "inget" obrolan.
// ═════════════════════════════════════════════

import { getDatabase } from "../../src/lib/nova-database.js";
import { listRoleplayCharacters, callRoleplay } from "../../src/scraper/fazzroleplay.js";
import { getFazzcodeKey } from "../../src/lib/config/env-loader.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { startAiStatus } from "../../src/lib/nova-ai-status.js";

const SESSION_KEY = "roleplaySession";

const pluginConfig = {
  name: "airoleplaychat",
  alias: ["airoleplaychat", "roleplaychat", "rpchat", "aiorp"],
  category: "ai",
  description: "Roleplay AI bareng karakter anime/seleb atau persona custom — inget konteks obrolan",
  usage: ".airoleplaychat list\n.airoleplaychat start <karakter>\n.airoleplaychat custom <nama> | <persona>\n.airoleplaychat <pesan> — lanjut obrolan\n.airoleplaychat stop — akhiri sesi",
  example: ".airoleplaychat start sakura\n.airoleplaychat hai, apa kabar?",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

// ═══ helpers ═══

function getSession(m) {
  try {
    const s = getDatabase().getPlayerData(m.sender, SESSION_KEY);
    if (s?.character) return s;
  } catch {}
  return null;
}

function saveSession(m, s) {
  try { getDatabase().setPlayerData(m.sender, SESSION_KEY, s); } catch {}
}

function clearSession(m) {
  try { getDatabase().setPlayerData(m.sender, SESSION_KEY, null); } catch {}
}

/** Inject konteks ringkas ke query — API stateless jadi harus dibawa sendiri */
function buildQuery(session, pesan) {
  const hist = (session.history || []).slice(-6);
  if (!hist.length) return pesan;
  const ringkas = hist
    .map((h) => `${h.who === "user" ? "User" : session.character}: ${String(h.text || "").slice(0, 120)}`)
    .join("; ");
  return `[context: ${ringkas}] ${pesan}`;
}

async function handler(m, { sock }) {
  try {
    const text = (m.args || []).join(" ").trim();
    const sub = (m.args?.[0] || "").toLowerCase();
    const session = getSession(m);

    // ═══ .airoleplaychat list — daftar karakter
    if (sub === "list" || sub === "karakter" || sub === "characters") {
      await m.react("🧠");
      if (!getFazzcodeKey()) {
        await m.react("❌");
        return m.reply(claraWrap("airoleplaychat", "⚠️ API key fazzcode belum di-set (src/lib/apikey/apikeys.json: aiSatuan → fazzcode)."));
      }
      const r = await listRoleplayCharacters();
      if (!r.ok) {
        await m.react("❌");
        return m.reply(claraWrap("airoleplaychat", `⚠️ Gagal ambil daftar karakter (${r.error === "API_KEY" ? "API key kosong" : r.error}). Coba lagi nanti ya.`));
      }
      await m.react("🐣");
      const lines = r.characters
        .map((c) => `🎭 *${c.name}*\n${String(c.preview || "").slice(0, 90)}...`)
        .join("\n\n");
      return m.reply(claraWrap("airoleplaychat",
        `🎭 *KARAKTER ROLEPLAY (${r.characters.length})*\n\n${lines}\n\n` +
        `💡 Mulai: *${m.prefix}airoleplaychat start <nama>*\n` +
        `✨ Persona bebas: *${m.prefix}airoleplaychat custom <nama> | <persona>*`));
    }

    // ═══ .airoleplaychat stop — akhiri sesi
    if (sub === "stop" || sub === "end" || sub === "keluar" || sub === "selesai") {
      if (!session) return m.reply(claraWrap("airoleplaychat", "Kamu gak punya sesi roleplay yang aktif. Mulai dulu: *.airoleplaychat start <karakter>*"));
      const who = session.character;
      clearSession(m);
      await m.react("🐣");
      return m.reply(claraWrap("airoleplaychat", `👋 Sesi roleplay bareng *${who}* udah berakhir.\n\nKapan-kapan main lagi ya! Mulai baru: *.airoleplaychat start <karakter>*`));
    }

    // ═══ .airoleplaychat status — info sesi
    if (sub === "status" || sub === "info") {
      if (!session) return m.reply(claraWrap("airoleplaychat", "Belum ada sesi roleplay aktif.\n\n💡 Mulai: *.airoleplaychat start <karakter>*\n🎭 Daftar karakter: *.airoleplaychat list*"));
      const turns = (session.history || []).filter((h) => h.who === "user").length;
      return m.reply(claraWrap("airoleplaychat",
        `🎭 Sesi Roleplay Aktif\n\n` +
        `🪪 Karakter : *${session.character}*\n` +
        `👤 Nama kamu : ${session.userName || m.pushName || "Player"}\n` +
        `${session.persona ? `📖 Persona : ${String(session.persona).slice(0, 120)}\n` : ""}` +
        `💬 Giliran chat : ${turns}\n` +
        `🕐 Mulai : ${new Date(session.createdAt || Date.now()).toLocaleString("id-ID")}\n\n` +
        `💡 Ketik *.airoleplaychat <pesan>* buat lanjut ngobrol\n` +
        `🚪 Ketik *.airoleplaychat stop* buat akhiri`));
    }

    // ═══ .airoleplaychat custom <nama> | <persona> — persona bebas
    if (sub === "custom" || sub === "buat") {
      const rest = text.replace(/^custom\s+/i, "").replace(/^buat\s+/i, "").trim();
      const parts = rest.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) {
        return m.reply(claraWrap("airoleplaychat",
          `✨ *Persona Custom*\n\nFormat: *${m.prefix}airoleplaychat custom <nama> | <persona/scene>*\n\n` +
          `Contoh:\n${m.prefix}airoleplaychat custom Miko | tsundere sahabat masa kecil yang diam-diam suka sama kamu\n` +
          `${m.prefix}airoleplaychat custom Kapten Jack | bajak laut kasar tapi setia`));
      }
      const [nama, persona] = parts;
      await m.react("🧠");
      const userName = m.pushName || "Player";
      const r = await callRoleplay("create", {
        character: nama,
        query: "halo",
        name: userName,
        prompt: persona,
      });
      if (!r.ok) {
        await m.react("❌");
        return m.reply(claraWrap("airoleplaychat", `⚠️ Gagal mulai roleplay (${r.error === "API_KEY" ? "API key kosong" : r.error}). Coba lagi nanti ya.`));
      }
      saveSession(m, {
        character: nama, persona, userName,
        history: [{ who: "user", text: "halo" }, { who: "char", text: r.reply }],
        createdAt: Date.now(),
      });
      await m.react("🐣");
      return m.reply(claraWrap(nama,
        `🎭 *ROLEPLAY DIMULAI — ${nama.toUpperCase()}*\n\n` +
        `📖 Persona: ${persona}\n\n` +
        `${nama}: ${r.reply}\n\n` +
        `💡 Balas pesan apa aja buat lanjut ngobrol (tetep pakai *${m.prefix}airoleplaychat <pesan>*)`));
    }

    // ═══ .airoleplaychat start <karakter> [scene]
    if (sub === "start" || sub === "mulai") {
      const rest = text.replace(/^start\s+/i, "").replace(/^mulai\s+/i, "").trim();
      if (!rest) {
        return m.reply(claraWrap("airoleplaychat",
          `🎭 *Mau roleplay sama siapa?*\n\n` +
          `Daftar karakter: *${m.prefix}airoleplaychat list*\n\n` +
          `Contoh: *${m.prefix}airoleplaychat start sakura*\n` +
          `✨ Persona bebas: *${m.prefix}airoleplaychat custom <nama> | <persona>*`));
      }
      const [nama, ...sceneParts] = rest.split("|").map((p) => p.trim());
      const scene = sceneParts.filter(Boolean).join(" | ") || undefined;
      const character = nama.replace(/\s+/g, " ").trim();
      if (!character) return m.reply(claraWrap("airoleplaychat", "Nama karakternya kosong nih 😅 Ketik *.airoleplaychat list* buat liat daftar."));

      await m.react("🧠");
      const userName = m.pushName || "Player";
      const r = await callRoleplay("create", {
        character,
        query: scene || "halo",
        name: userName,
        prompt: scene || `kamu sedang diajak ngobrol santai sama ${userName}`,
      });
      if (!r.ok) {
        await m.react("❌");
        return m.reply(claraWrap("airoleplaychat", `⚠️ Gagal mulai roleplay (${r.error === "API_KEY" ? "API key kosong" : r.error}). Coba lagi nanti ya.`));
      }
      saveSession(m, {
        character, persona: scene, userName,
        history: [{ who: "user", text: scene || "halo" }, { who: "char", text: r.reply }],
        createdAt: Date.now(),
      });
      await m.react("🐣");
      return m.reply(claraWrap(character,
        `🎭 *ROLEPLAY DIMULAI — ${character.toUpperCase()}*\n` +
        `${scene ? `\n🎬 Scene: ${scene}\n` : ""}\n` +
        `${character}: ${r.reply}\n\n` +
        `💡 Balas: *${m.prefix}airoleplaychat <pesan>* buat lanjut ngobrol`));
    }

    // ═══ default: chat (butuh sesi aktif)
    const pesan = text;
    if (!pesan) {
      if (session) {
        return m.reply(claraWrap("airoleplaychat",
          `🎭 Sesi bareng *${session.character}* masih aktif!\n\n` +
          `💡 Lanjut ngobrol: *${m.prefix}airoleplaychat <pesan>*\n` +
          `ℹ️ Info sesi: *${m.prefix}airoleplaychat status*`));
      }
      return m.reply(claraWrap("airoleplaychat",
        `🎭 *AI ROLEPLAY CHAT*\n\n` +
        `Roleplay bareng karakter AI — konteks obrolan diinget!\n\n` +
        `🎭 ${m.prefix}airoleplaychat list — daftar karakter\n` +
        `▶️ ${m.prefix}airoleplaychat start <karakter> — mulai sesi\n` +
        `✨ ${m.prefix}airoleplaychat custom <nama> | <persona> — persona bebas\n` +
        `💬 ${m.prefix}airoleplaychat <pesan> — lanjut obrolan\n` +
        `🚪 ${m.prefix}airoleplaychat stop — akhiri sesi`));
    }

    if (!session) {
      return m.reply(claraWrap("airoleplaychat",
        `Belum ada sesi roleplay aktif — mulai dulu ya!\n\n` +
        `▶️ *${m.prefix}airoleplaychat start <karakter>*\n` +
        `🎭 Daftar karakter: *${m.prefix}airoleplaychat list*`));
    }

    // chat dengan konteks lokal — 🔹 status ala agent (owner 29 Sep):
    // 🧠 Thinking... di-edit jadi balasan karakter di pesan yang sama
    const aiStatus = await startAiStatus(sock, m);
    const r = await callRoleplay("chat", {
      character: session.character,
      query: buildQuery(session, pesan),
      name: session.userName || m.pushName || "Player",
    });
    if (!r.ok) {
      await aiStatus.fail(`${session.character} lagi gak bisa membalas (${r.error === "API_KEY" ? "API key kosong" : r.error})`);
      return;
    }
    // update riwayat lokal (max 6 giliran disimpan)
    const hist = [...(session.history || []), { who: "user", text: pesan }, { who: "char", text: r.reply }].slice(-6);
    saveSession(m, { ...session, history: hist });

    return aiStatus.finish(claraWrap(session.character,
      `🎭 *${session.character.toUpperCase()}*\n\n${r.reply}\n\n` +
      `─\n💡 Lanjut: *${m.prefix}airoleplaychat <pesan>* • Akhiri: *.airoleplaychat stop*`));
  } catch (err) {
    console.error("[airoleplaychat]", err.message);
    await m.react("❌");
    return m.reply(claraWrap("airoleplaychat", "⚠️ Ada error pas roleplay. Coba lagi ya."));
  }
}

export { pluginConfig as config, handler };
