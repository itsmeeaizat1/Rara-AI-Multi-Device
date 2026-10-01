// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// conciseaiv2 — ConciseAI v2 (toki heroku, HMAC)
import crypto from "crypto";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
  name: "conciseaiv2", alias: ["conciseaiv2"], aliases: ["conciseaiv2", "cisaiv2"],
  category: "ai", description: "ConciseAI v2 — AI ringan & cepat",
  usage: ".conciseaiv2 <pertanyaan>", example: ".conciseaiv2 apa itu fotosintesis",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = (m.args || []).join(" ").trim();
  try {
    if (!text) return m.reply(novaWrap("conciseaiv2", `Mau nanya apa?\nContoh: ${m.prefix}conciseaiv2 apa itu fotosintesis`, "guide"));
    await m.react("🕒");
    const user_id = crypto.randomUUID().replace(/-/g, "");
    const lastMsg = `USER: ${text}`;
    const signature = crypto.createHmac("sha256", "CONSICESIGAIMOVIESkjkjs32120djwejk2372kjsajs3u293829323dkjd8238293938wweiuwe")
      .update(user_id + lastMsg + "normal").digest("hex");
    const form = new URLSearchParams({
      question: lastMsg, conciseaiUserId: user_id, signature,
      previousChats: JSON.stringify([{ a: "", b: lastMsg, c: false }]), model: "normal",
    });
    const res = await fetch("https://toki-41b08d0904ce.herokuapp.com/api/conciseai/chat", {
      method: "POST",
      headers: { "User-Agent": "okhttp/4.10.0", "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json();
    const answer = typeof data === "string"
      ? data.trim()
      : String(data?.answer || data?.result || data?.response || "").trim();
    // ConciseAI kadang HTTP 200 tetapi hanya mengembalikan [] atau object kosong.
    // Itu bukan jawaban sukses, jadi lempar ke fallback AI, bukan mengirim pesan kosong.
    if (!res.ok || !answer) throw new Error(`ConciseAI empty/HTTP ${res.status}`);
    await m.reply(answer);
    await m.react("🐣");
  } catch (e) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, { sessionKey: "satuan:" + m.sender });
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[conciseaiv2.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    console.error("conciseaiv2 error:", e.message);
    await m.react("❌");
    return m.reply(novaWrap("conciseaiv2", te(m.prefix, m.command, m.pushName), "error"));
  }
}
export { pluginConfig as config, handler };
