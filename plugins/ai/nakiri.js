// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "nakiri",
  alias: ["nakiriai", "nakiri-ai"],
  category: "ai",
  description: "Chat dengan Nakiri AI via Velixs API",
  usage: ".nakiri <pertanyaan>",
  example: ".nakiri Hai siapa kamu?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

async function callNakiriAI(text) {
  const apikey = config.APIkey?.velixs || "";
  if (!apikey) {
    return { status: false, error: "API key Velixs belum dikonfigurasi. Owner bisa set via config.js (APIkey.velixs)" };
  }

  // Coba GET dengan query params dulu
  const url = `https://api.velixs.com/nakiri?text=${encodeURIComponent(text)}&apikey=${apikey}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    // Coba POST fallback
    const postRes = await fetch("https://api.velixs.com/nakiri", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, apikey }),
    });

    if (!postRes.ok) {
      return { status: false, error: `Server Velixs sedang sibuk (${res.status}). Coba lagi nanti.` };
    }

    const postData = await postRes.json().catch(() => null);
    if (postData && postData.status === 200 && postData.result) {
      return { status: true, answer: postData.result };
    }
    if (postData && postData.message) {
      return { status: false, error: postData.message };
    }
    return { status: false, error: "Respons tidak valid dari server Velixs" };
  }

  const data = await res.json().catch(() => null);

  // Velixs API response format: { status: 200, result: "..." } atau { status: 200, data: "..." }
  if (!data) {
    return { status: false, error: "Gagal parse respons dari Velixs API" };
  }

  if (data.status === 200 && data.result) {
    return { status: true, answer: data.result };
  }

  if (data.status === 200 && data.data) {
    return { status: true, answer: typeof data.data === "string" ? data.data : JSON.stringify(data.data) };
  }

  if (data.status === false || data.status === "error") {
    return { status: false, error: data.message || data.error || "Error dari Velixs API" };
  }

  // Fallback: coba ambil field apapun yang ada
  const answer = data.result || data.data || data.response || data.answer || data.message;
  if (answer && typeof answer === "string") {
    return { status: true, answer };
  }

  return { status: false, error: "Format respons tidak dikenali dari Velixs API" };
}

async function handler(m, { sock }) {
  const text = m.args.join(" ");

  if (!text) {
    return sendReplyWithNav(sock, m, claraWrap("Nakiri AI", [
      "Chat dengan Nakiri AI via Velixs API",
      "",
      "PENGGUNAAN:",
      m.prefix + "nakiri <pertanyaan>",
      "",
      "CONTOH:",
      m.prefix + "nakiri Hai siapa kamu?",
    ]), "nakiri");
  }

  await m.react("🕐");

  try {
    const result = await callNakiriAI(text);

    if (!result.status) {
      await m.react("❌");
      return m.reply(claraWrap("Nakiri AI Error", "❌ " + (result.error || "Gagal mendapatkan respons")));
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(claraWrap("Nakiri AI", reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply));
  } catch (e) {
    console.error("[Nakiri AI]", e);
    await m.react("❌");
    m.reply(claraWrap("nakiri", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
