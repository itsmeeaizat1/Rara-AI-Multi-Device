import { separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import te from "../../src/lib/nova-error.js";

/**
 * plugins/ai/aicaption.js
 * Command .aicaption — AI Caption Generator untuk Instagram
 * Reply foto, AI analisis dan kasih caption suggestion
 * Support: IG style, product, funny, aesthetic, motivational
 *
 * API: Tio AI (ai.tioo.eu.org) — OpenAI format dengan vision
 * Fallback: Puter.com (free, no key)
 */

const pluginConfig = {
  name: "aicaption",
  alias: ["aicap", "capgen", "igcaption", "captionai"],
  category: "ai",
  description: "AI Caption Generator untuk Instagram dari foto",
  usage: ".aicaption (reply foto)\n.aicaption product\n.aicaption funny\n.aicaption aesthetic\n.aicaption motivasi\n.aicaption singkat",
  example: ".aicaption\n.aicaption aesthetic",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

const STYLE_PROMPTS = {
  default: `Analisis foto ini dan buatkan 3 caption Instagram yang menarik. Buat caption yang singkat, kreatif, dan engaging. Tambahkan hashtag yang relevan. Format:\n\n1. [Caption 1]\n2. [Caption 2]\n3. [Caption 3]\n\nPisahkan setiap caption dengan jelas.`,

  product: `Analisis foto produk ini dan buatkan 3 caption Instagram yang persuasif untuk jualan. Tonjolkan keunggulan produk, buat call-to-action yang jelas. Tambahkan hashtag marketing. Format:\n\n1. [Caption jualan 1]\n2. [Caption jualan 2]\n3. [Caption jualan 3]`,

  funny: `Analisis foto ini dan buatkan 3 caption Instagram yang lucu, jenaka, dan bisa viral. Buat yang relatable dan bikin ngakak. Tambahkan hashtag lucu. Format:\n\n1. [Caption lucu 1]\n2. [Caption lucu 2]\n3. [Caption lucu 3]`,

  aesthetic: `Analisis foto ini dan buatkan 3 caption Instagram yang aesthetic, minimalis, dan artistic. Gunakan bahasa yang poetic dan vibes yang estetik. Tambahkan hashtag aesthetic. Format:\n\n1. [Caption aesthetic 1]\n2. [Caption aesthetic 2]\n3. [Caption aesthetic 3]`,

  motivasi: `Analisis foto ini dan buatkan 3 caption Instagram yang motivasional dan inspiratif. Buat yang bisa semangatin orang. Tambahkan hashtag motivasi. Format:\n\n1. [Caption motivasi 1]\n2. [Caption motivasi 2]\n3. [Caption motivasi 3]`,

  singkat: `Analisis foto ini dan buatkan 5 caption Instagram yang SANGAT SINGKAT (maksimal 5 kata per caption). Catchy dan to the point. Format:\n\n1. [Caption 1]\n2. [Caption 2]\n3. [Caption 3]\n4. [Caption 4]\n5. [Caption 5]`,
};

function getStylePrompt(style) {
  return STYLE_PROMPTS[style] || STYLE_PROMPTS.default;
}

async function callAIWithImage(imageBase64, prompt, aiConfig) {
  const apiKey = String(aiConfig.openaiApiKey || aiConfig.apiKey || "");
  const endpoint = "https://ai.tioo.eu.org/v1/chat/completions";
  const model = String(aiConfig.openaiModel || aiConfig.model || "deepseek-v4-flash:free");

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AI error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function tryPuterFallback(imageBase64, prompt) {
  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch(
    "https://api.puter.com/puterai/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!response.ok) {
    throw new Error(`Puter error ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    const isImage =
      m.isImage || (m.quoted && (m.quoted.isImage || m.quoted?.type === "imageMessage"));

    if (!isImage) {
      const text =
        claraWrap("AI Caption", [`◦ Reply atau kirim foto dengan caption .aicaption`,
          `◦ AI akan analisis foto dan buat caption Instagram`,
          ``,
          `*Style tersedia:*`,
          `◦ ${prefix}aicaption — Default (mix)`,
          `◦ ${prefix}aicaption product — Jualan`,
          `◦ ${prefix}aicaption funny — Lucu`,
          `◦ ${prefix}aicaption aesthetic — Estetik`,
          `◦ ${prefix}aicaption motivasi — Inspiratif`,
          `◦ ${prefix}aicaption singkat — Max 5 kata`].join("\n")) + "\n" +
        tipText("Reply foto lalu ketik .aicaption");

      await sendReplyWithNav(sock, m, text, "aicaption");
      return { handled: true };
    }

    await m.react("🕐");

    // Download gambar
    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    } else if (m.quoted && m.quoted.msg) {
      const stream = await m.quoted.download();
      mediaBuffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
    } else {
      const text =
        claraWrap("AI Caption", [`◦ Status: *Gagal download gambar*`,
          `◦ Coba reply foto yang valid`].join("\n")) + "\n" +
        tipText("Reply foto lalu ketik .aicaption");

      await sendReplyWithNav(sock, m, text, "aicaption");
      return { handled: true };
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      const text =
        claraWrap("AI Caption", [`◦ Status: *Buffer gambar tidak valid*`].join("\n")) + "\n" +
        tipText("Coba foto lain");

      await sendReplyWithNav(sock, m, text, "aicaption");
      return { handled: true };
    }

    // Parse style dari argumen
    const input = (m.body || "").replace(/^[!.#]\S+\s*/, "").trim().toLowerCase();
    const style = input.split(/\s+/)[0] || "default";
    const validStyles = Object.keys(STYLE_PROMPTS);
    const useStyle = validStyles.includes(style) ? style : "default";

    const base64 = Buffer.from(mediaBuffer).toString("base64");
    const prompt = getStylePrompt(useStyle);

    let captionResult = "";
    let usedProvider = "";

    // Coba Tio AI dulu
    try {
      const aiConfig = botConfig.aiHelp || {};
      captionResult = await callAIWithImage(base64, prompt, aiConfig);
      usedProvider = "Tio AI";
    } catch (err) {
      if (err.message === "NO_API_KEY") {
        // Fallback ke Puter (free, no key)
        try {
          captionResult = await tryPuterFallback(base64, prompt);
          usedProvider = "Puter";
        } catch (err2) {
          throw new Error("Semua provider AI gagal. Cek API key atau coba lagi nanti.");
        }
      } else {
        // Tio gagal, coba Puter
        try {
          captionResult = await tryPuterFallback(base64, prompt);
          usedProvider = "Puter";
        } catch (err2) {
          throw new Error(err.message);
        }
      }
    }

    if (!captionResult || captionResult.trim().length === 0) {
      throw new Error("AI tidak menghasilkan caption. Coba foto lain.");
    }

    await m.react("✅");

    const styleLabel = useStyle === "default" ? "Mix" : useStyle.charAt(0).toUpperCase() + useStyle.slice(1);

    const result =
      claraWrap("AI Caption", [`◦ Style: *${styleLabel}*`,
        `◦ Provider: *${usedProvider}*`,
        `◦ Hasil:`].join("\n")) + "\n\n" +
      `${captionResult}` + "\n\n" +
      separator("━", 22) + "\n" +
      tipText("Copy caption favoritmu untuk Instagram") + "\n" +
      tipText(`${prefix}aicaption product — style jualan`);

    await m.reply(result);
    return { handled: true };
  } catch (error) {
    console.error("[AI Caption Error]", error);
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal generate caption*`,
        `◦ Alasan: *${error.message || "Unknown error"}*`].join("\n")) + "\n" +
      tipText("Coba lagi nanti atau hubungi owner");

    await m.reply(text);
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
