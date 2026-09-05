// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA

import { novaError, novaEmpty, novaGuide, novaNoInput,  tipText,  claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "summarize",
  alias: ["summarize"],
  category: "ai",
  description: "Ringkas teks panjang menjadi inti",
  usage: ".summarize <teks> | reply teks",
  example: ".summarize <teks panjang>",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function callAI(prompt, aiConfig) {
  const { apiKey, apiEndpoint, model, systemPrompt } = aiConfig || {};
  
  // Mood-Driven Theme: inject mood context
  let _systemPrompt = systemPrompt || "Kamu adalah asisten bot WhatsApp.";
  try {
    const sender = global.__novaMoodSender || "";
    if (sender) {
      const { getMoodSystemPrompt } = await import("../owner/moodtheme.js");
      if (typeof getMoodSystemPrompt === "function") {
        const moodPrompt = getMoodSystemPrompt(sender);
        if (moodPrompt) _systemPrompt = _systemPrompt + moodPrompt;
      }
    }
  } catch (e) { console.error('[summarize.js]:', e.message); }

  // Time-Warp: inject temporal persona
  try {
    const sender = global.__novaMoodSender || "";
    if (sender) {
      const { getTimewarpPrompt } = await import("./aitimewarp.js");
      if (typeof getTimewarpPrompt === "function") {
        const warpPrompt = getTimewarpPrompt(sender);
        if (warpPrompt) _systemPrompt = _systemPrompt + warpPrompt;
      }
    }
  } catch (e) { console.error('[summarize.js]:', e.message); }
  if (!apiKey || !apiEndpoint || !model) {
    return "AI belum dikonfigurasi. Minta owner mengisi API key dan endpoint di config.";
  }

  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: _systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Tidak ada respon dari AI.";
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
  await m.react("🕒");
    const raw = m.text?.trim() || "";
    const text = m.quoted?.text ? m.quoted.text : raw.replace(/^\.summarize\s+/i, "").trim();

    if (!text) {
      const out =
        novaCaption({
  emoji: "🤖",
  name: "summarize",
  description: "Ringkas teks panjang menjadi inti",
  usage: `${prefix}summarize <teks> | reply teks`,
  example: `${prefix}summarize <teks panjang>`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.react("🐣");
      await m.reply(out);
      return { handled: true };
    }

    const prompt = `Ringkas teks berikut menjadi 3-5 poin utama dalam bahasa Indonesia:\n\n${text.slice(0, 4000)}`;
    const reply = await callAI(prompt, botConfig.aiHelp);

    const out =
      claraWrap("Ringkasan", [`Hasil: *${reply}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}summarize <teks> untuk ringkas lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(out);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`Status: *Gagal*`,
        `Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(novaError("Summarize", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
