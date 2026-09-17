// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai9v2.js — 9ROUTER V2 CLOUD (17 Sep 2026, request owner "cba buat fitur
// 9router v2 jgn gnttin yg udh ada"): chat AI via hosted gateway
// 9router.cloudku.us.kg (21 model: gemini-3.8/claude/gpt-oss/agent).
// MODUL: src/scraper/router9v2.js — key pusat apikeys.json providers.router9v2.
// FITUR .ai9 LAMA TETAP UTUH (gak digantiin) — ini tambahan baru.
import { novaBox } from "../../src/lib/nova-menu-style.js";
import { splitChatChunks } from "../../src/lib/aiagent.js";
import { appendTurn, toMessages } from "../../src/lib/nova-ai-session.js";
import {
  router9v2Chat, router9v2Models, router9v2Key,
  getRouter9v2Pref, setRouter9v2Pref,
  ROUTER9V2_DEFAULT_MODEL,
} from "../../src/scraper/router9v2.js";

const pluginConfig = {
  name: "ai9v2",
  alias: ["9routerv2", "routerv2"],
  category: "ai",
  description: "9Router V2 Cloud — chat AI multi-model via gateway 9router.cloudku.us.kg (21 model)",
  usage: ".ai9v2 <pesan> | .ai9v2 list | .ai9v2 model | .ai9v2 model <id> | .ai9v2 model <id> <pesan>",
  example: ".ai9v2 jelaskan kuantum singkat\n.ai9v2 list\n.ai9v2 model ag/claude-sonnet-4-6\n.ai9v2 model ag/gpt-oss-120b-medium buat pantun",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 5, energi: 0, isEnabled: true,
};

const HELP = [
  "Ketik pesannya setelah .ai9v2",
  "---",
  "Contoh    : .ai9v2 jelaskan kuantum",
  "Daftar AI : .ai9v2 list",
  "Model     : .ai9v2 model <id> <pesan>",
  "Default   : .ai9v2 model <id>",
];

async function handler(m, { sock, args }) {
  const argList = (args || []).map(String);
  const sub = argList[0]?.toLowerCase();
  if (!router9v2Key()) {
    return m.reply(novaBox("9Router V2", ["Key belum di-set — isi di apikeys.json (router9v2) atau env ROUTER_API_KEY."]));
  }

  // ── .ai9v2 list — daftar model live ──
  if (sub === "list") {
    try {
      await m.react("🧠");
      const { models, total } = await router9v2Models();
      const pref = getRouter9v2Pref(m.chat) || ROUTER9V2_DEFAULT_MODEL;
      await m.react("🐣");
      const lines = [`Total model: ${total}`, `Default chat ini: ${pref}`, "---"];
      for (const id of models) lines.push((id === pref ? "→ " : "• ") + id);
      lines.push("---", "Ganti: .ai9v2 model <id>");
      return m.reply(novaBox("9Router V2 — Model", lines.slice(0, 40)));
    } catch (e) {
      await m.react("❌");
      return m.reply(novaBox("9Router V2", ["Gagal ambil daftar model: " + String(e.message).slice(0, 140)]));
    }
  }

  // ── .ai9v2 model ... ──
  if (sub === "model") {
    const target = argList[1];
    const rest = argList.slice(2).join(" ").trim();
    if (!target) {
      const pref = getRouter9v2Pref(m.chat) || ROUTER9V2_DEFAULT_MODEL;
      return m.reply(novaBox("9Router V2", [
        `Model default chat ini: ${pref}`,
        "Model bawaan bot: " + ROUTER9V2_DEFAULT_MODEL,
        "---",
        "Ganti default : .ai9v2 model <id>",
        "Sekali pakai  : .ai9v2 model <id> <pesan>",
        "Daftar model  : .ai9v2 list",
      ]));
    }
    // validasi model live biar gak typo nyasar
    try {
      const { models } = await router9v2Models();
      const found = models.find((x) => x.toLowerCase() === target.toLowerCase())
        || models.find((x) => x.toLowerCase().endsWith("/" + target.toLowerCase()));
      if (!found) {
        return m.reply(novaBox("9Router V2", [
          `Model "${target}" gak ada di gateway.`,
          "Cek nama pas: .ai9v2 list",
        ]));
      }
      if (!rest) {
        setRouter9v2Pref(m.chat, found);
        return m.reply(novaBox("9Router V2", [`Model default chat ini → ${found}`]));
      }
      // one-shot: model <id> <pesan>
      return await chatReply(m, sock, rest, found);
    } catch (e) {
      await m.react("❌");
      return m.reply(novaBox("9Router V2", ["Gagal validasi model: " + String(e.message).slice(0, 140)]));
    }
  }

  // quoted context — AI paham pesan yang di-reply (pola .ai9)
  const quotedText = m.quoted?.text?.trim() || "";
  const text = argList.join(" ").trim();
  const userMsg = quotedText
    ? `${text}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
    : text;
  if (!userMsg.trim()) return m.reply(novaBox("9Router V2", HELP));

  const model = getRouter9v2Pref(m.chat) || ROUTER9V2_DEFAULT_MODEL;
  return await chatReply(m, sock, userMsg, model);
}

// ── satu pintu kirim chat: session satuan: → router9v2Chat → balas berantai ──
async function chatReply(m, sock, userMsg, model) {
  try {
    await m.react("🧠");
    const sKey = "satuan:" + m.sender;
    const history = toMessages(sKey);
    const r = await router9v2Chat({
      model,
      messages: [...history, { role: "user", content: userMsg }],
    });
    appendTurn(sKey, userMsg, r.text);
    await m.react("🐣");
    // jawaban panjang dikirim berantai (aturan chat terusan, tanpa clip 4096)
    const footer = "\n\n— via 9router v2 • " + r.model + " • " + r.latencyMs + "ms";
    const chunks = splitChatChunks(r.text, { chunkChars: 6000 });
    for (let i = 0; i < chunks.length; i++) {
      const last = i === chunks.length - 1;
      await m.reply(chunks[i] + (last ? footer : ""));
    }
  } catch (e) {
    console.error("[ai9v2]:", e.message);
    await m.react("❌");
    return m.reply(novaBox("9Router V2", [
      "Chat gagal: " + String(e.message).slice(0, 160),
      "---",
      "Coba model lain: .ai9v2 list",
      "Fitur router lama tetep ada: .ai9 <pesan>",
    ]));
  }
}

export default { pluginConfig, handler, command: "ai9v2" };
export { pluginConfig as config, handler };
