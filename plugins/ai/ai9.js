// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai9.js — NOVA ROUTER (rancangan 9router): chat AI multi-provider
// dengan key pooling, circuit breaker, health tracking & routing transparan.
// Modul: src/lib/nova-ai-router.js — provider registry: ai-chain.js (apikeys.json)
// + VISION : reply/kirim gambar + caption → analisis gambar (Gemini Vision)
// + IMAGEGEN: .ai9 gambar <prompt> → generate gambar (callImageGen + fallback free)
import te from "../../src/lib/nova-error.js";
import { novaBox, novaGuideV2 } from "../../src/lib/nova-menu-style.js";
import { routerChat, getRouterStatus, resetProviderHealth } from "../../src/lib/nova-ai-router.js";
import { getSession, appendTurn, toMessages } from "../../src/lib/nova-ai-session.js";
import { GeminiVision } from "../../src/scraper/geminiVision.js";
import { callImageGen } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "ai9",
  alias: ["ai9", "router9", "novarouter"],
  category: "ai",
  description: "Nova Router — AI multi-provider rancangan 9router (chat + scan gambar + generate gambar)",
  usage: ".ai9 <pesan> | .ai9 gambar <prompt> | .ai9 provider <nama> <pesan> | .ai9 status | .ai9 list | .ai9 reset <nama>",
  example: ".ai9 jelaskan kuantum singkat\n.ai9 gambar kucing astronot\n.ai9 bantu tugas ini (reply/attach foto)\n.ai9 status",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SUB = ["status", "list", "provider", "reset"];
const GEN_WORDS = ["gambar", "image", "img", "buat"];

async function handler(m, { sock, args, botConfig }) {
  const argList = (args || []).map(String);
  const sub = argList[0]?.toLowerCase();
  const aiCfg = botConfig?.aiHelp || {};

  // ── VISION: gambar di-attach (caption = pertanyaan) atau di-reply ──
  const hasImage = (m.quoted && m.quoted.isImage) || m.isImage; // FIX 10 Sep: flags isImage
  if (hasImage && sub !== "status" && sub !== "list" && sub !== "reset") {
    try {
      await m.react("🕒");
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer?.length) {
        await m.react("❌");
        return m.reply(novaBox("AI Router", ["Gagal download gambar — coba kirim ulang."]));
      }
      const prompt =
        (m.isImage && m.message?.imageMessage?.caption?.trim()) || // FIX 10 Sep: caption dari m.message
        m.text?.trim() ||
        "Analisis gambar ini dan jelaskan dengan detail dalam bahasa Indonesia.";
      const result = await GeminiVision({
        imageBuffer: buffer,
        prompt,
        instruction: "Kamu adalah asisten AI vision yang ahli. Analisis gambar dengan detail dan akurat, bantu user menyelesaikan tugasnya. Jawab dalam bahasa Indonesia.",
      });
      if (!result?.status) {
        await m.react("❌");
        return m.reply(novaBox("AI Router", ["Gagal menganalisis gambar: " + (result?.error || "unknown")]));
      }
      const sKey = "satuan:" + m.sender;
      appendTurn(sKey, "[kirim gambar] " + prompt, result.text);
      await m.react("🐣");
      const ans = result.text.length > 3500 ? result.text.slice(0, 3500) + "..." : result.text;
      return m.reply(ans + "\n\n— via gemini vision");
    } catch (e) {
      console.error("[ai9-vision]:", e.message);
      await m.react("❌");
      return m.reply(novaBox("AI Router", ["Analisis gambar gagal: " + String(e.message).slice(0, 120)]));
    }
  }

  // ── IMAGEGEN: .ai9 gambar <prompt> ──
  if (GEN_WORDS.includes(sub)) {
    const prompt = argList.slice(1).join(" ").trim();
    if (!prompt) {
      return m.reply(novaGuideV2("ai9", {
 kaomoji: "(๑˃ᴗ˂)ﻭ",
 sapaan: "bikin gambar apa aja, router AI nyari model terbaik buatmu! (≧∇≦)ﾉ",
        cara: "ketik deskripsi gambar yang mau dibuat",
        contoh: `${m.prefix}ai9 gambar kucing astronot realistis`,
        spec: ["⏱ 5dtk", "💸 gratis"],
      }));
    }
    try {
      await m.react("🕒");
      const img = await callImageGen("gemini", prompt, { aiConfig: aiCfg });
      const buf = img?.buffer
        ? img.buffer
        : img?.base64
          ? Buffer.from(img.base64, "base64")
          : img;
      if (!buf?.length) throw new Error("hasil gambar kosong");
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        image: buf,
        caption: prompt + "\n\n— via " + (img?.via || "nova router imagegen"),
      }, { quoted: m });
      return;
    } catch (e) {
      console.error("[ai9-imggen]:", e.message);
      await m.react("❌");
      return m.reply(novaBox("AI Router", ["Generate gambar gagal: " + String(e.message).slice(0, 120)]));
    }
  }

  // ── .ai9 status / .ai9 list — dashboard health (box standar) ──
  if (sub === "status" || sub === "list") {
    const st = getRouterStatus();
    const lines = [
      `Total permintaan hari ini: ${st.day.totalReq || 0}`,
      "---",
    ];
    for (const p of st.providers) {
      const icon = p.status === "ok" ? "✅" : p.status === "cooldown" ? "⏸" : p.status === "fail" ? "❌" : "•";
      const keyTag = p.free ? "free" : p.hasKey ? (p.pool > 1 ? `key x${p.pool}` : "key") : "no-key";
      const lat = p.latency ? `${p.latency}ms` : "-";
      const cd = p.cooldownLeft ? ` • cooldown ${p.cooldownLeft}mnt` : "";
      lines.push(`${icon} ${p.name} — ${keyTag} • ${lat} • ${p.reqToday}x hari ini${cd}`);
    }
    lines.push("---", `Isi key/pool: src/lib/apikey/apikeys.json (aiMultiprovider)`);
    return m.reply(novaBox("AI Router — Status", lines));
  }

  // ── .ai9 reset <nama> — bersihin health 1 provider ──
  if (sub === "reset") {
    const name = argList[1];
    if (!name) return m.reply(novaBox("AI Router", ["Sebut nama provider yang mau di-reset.", "Contoh: .ai9 reset groq", "Daftar nama: .ai9 list"]));
    resetProviderHealth(name);
    return m.reply(novaBox("AI Router", [`Health "${name}" di-reset — fails & cooldown dibersihin.`]));
  }

  // ── .ai9 provider <nama> <pesan> — paksa 1 provider ──
  let forced = null;
  let text = argList.join(" ");
  if (sub === "provider") {
    forced = argList[1]?.toLowerCase();
    text = argList.slice(2).join(" ");
    if (!forced || !text) {
      return m.reply(novaBox("AI Router", [
        "Format: .ai9 provider <nama> <pesan>",
        "Contoh: .ai9 provider ikyy_gemma bikin pantun",
        "Daftar nama: .ai9 list",
      ]));
    }
  }

  // quoted context — AI paham pesan yang di-reply
  const quotedText = m.quoted?.text?.trim() || "";
  const userMsg = quotedText
    ? `${text}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
    : text;

  if (!userMsg?.trim()) {
    return m.reply(novaBox("AI Router", [
      "Ketik pesannya setelah .ai9",
      "---",
      "Contoh    : .ai9 jelaskan kuantum",
      "Gambar    : .ai9 gambar kucing astronot",
      "Scan foto : kirim/reply foto + caption pertanyaan",
      "Paksa     : .ai9 provider ikyy_gemma pantun",
      "Dashboard : .ai9 status",
    ]));
  }

  try {
    await m.react("🕒");

    // session keluarga satuan:<sender> — nyambung dengan AI satuan lain
    const sKey = "satuan:" + m.sender;
    const history = toMessages(sKey);

    const r = await routerChat({
      user: userMsg,
      history,
      forcedProvider: forced,
    });

    appendTurn(sKey, userMsg, r.text);

    await m.react("🐣");
    const replyText = r.text.length > 3500 ? r.text.slice(0, 3500) + "..." : r.text;
    // footer transparansi routing — ciri khas 9router
    await m.reply(`${replyText}\n\n— via ${r.provider} • ${r.latencyMs}ms`);
  } catch (e) {
    console.error("[ai9]:", e.message);
    await m.react("❌");
    return m.reply(novaBox("AI Router", [
      "Semua provider di rantai gagal 😔",
      `Info: ${String(e.message).slice(0, 160)}`,
      "---",
      "Cek dashboard: .ai9 status",
    ]));
  }
}

export { pluginConfig as config, handler };
