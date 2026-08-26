// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { toVoiceNote } from "../../src/lib/nova-ffmpeg.js";
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "animevoice",
  alias: ["animevoice"],
  category: "tools",
  description: "Text to speech dengan suara karakter anime (VITS - gratis)",
  usage: ".animevoice <karakter> <text>",
  example: ".animevoice paimon hello everyone",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

const HF_SPACE = "https://plachta-vits-umamusume-voice-synthesizer.hf.space";
const API_CALL = `${HF_SPACE}/gradio_api/call/tts_fn`;

// Popular characters grouped by franchise
const CHARACTERS = {
  // Genshin Impact (most popular)
  paimon: "派蒙 Paimon (Genshin Impact)",
  raiden: "雷电将军 Raiden Shogun (Genshin Impact)",
  hutao: "胡桃 Hu Tao (Genshin Impact)",
  ganyu: "甘雨 Ganyu (Genshin Impact)",
  nahida: "纳西妲 Nahida (Genshin Impact)",
  keqing: "刻晴 Keqing (Genshin Impact)",
  ayaka: "神里绫华 Kamisato Ayaka (Genshin Impact)",
  zhongli: "钟离 Zhongli (Genshin Impact)",
  xiao: "魈 Xiao (Genshin Impact)",
  venti: "温迪 Venti (Genshin Impact)",
  klee: "可莉 Klee (Genshin Impact)",
  diluc: "迪卢克 Diluc (Genshin Impact)",
  yelan: "夜兰 Yelan (Genshin Impact)",
  yae: "八重神子 Yae Miko (Genshin Impact)",
  kokomi: "珊瑚宫心海 Sangonomiya Kokomi (Genshin Impact)",
  yoimiya: "宵宫 Yoimiya (Genshin Impact)",
  mona: "莫娜 Mona (Genshin Impact)",
  shenhe: "申鹤 Shenhe (Genshin Impact)",
  layla: "莱依拉 Layla (Genshin Impact)",
  fishl: "菲谢尔 Fishl (Genshin Impact)",
  jean: "琴 Jean (Genshin Impact)",
  amber: "安柏 Amber (Genshin Impact)",
  lisa: "丽莎 Lisa (Genshin Impact)",
  barbara: "芭芭拉 Barbara (Genshin Impact)",
  noelle: "诺艾尔 Noelle (Genshin Impact)",
  diona: "迪奥娜 Diona (Genshin Impact)",
  fischl: "菲谢尔 Fishl (Genshin Impact)",
  qiqi: "七七 Qiqi (Genshin Impact)",
  sucrose: "砂糖 Sucrose (Genshin Impact)",
  xiangling: "香菱 Xiangling (Genshin Impact)",
  sayu: "早柚 Sayu (Genshin Impact)",
  chongyun: "重云 Chongyun (Genshin Impact)",
  bennett: "班尼特 Bennett (Genshin Impact)",
  kaeya: "凯亚 Kaeya (Genshin Impact)",
  razor: "雷泽 Razor (Genshin Impact)",
  albedo: "阿贝多 Albedo (Genshin Impact)",
  itto: "荒泷一斗 Arataki Itto (Genshin Impact)",
  kazuha: "枫原万叶 Kaedehara Kazuha (Genshin Impact)",
  cyno: "赛诺 Cyno (Genshin Impact)",
  heizou: "鹿野院平藏 Shikanoin Heizou (Genshin Impact)",
  thoma: "托马 Thoma (Genshin Impact)",
  ayato: "神里绫人 Kamisato Ayato (Genshin Impact)",
  alhaitham: "艾尔海森 Alhaitham (Genshin Impact)",
  nilou: "妮露 Nilou (Genshin Impact)",
  wanderer: "流浪者 Wanderer (Genshin Impact)",
  eula: "优菈 Eula (Genshin Impact)",
  ningguang: "凝光 Ningguang (Genshin Impact)",
  sara: "九条裟罗 Kujou Sara (Genshin Impact)",
  beidou: "北斗 Beidou (Genshin Impact)",
  yanfei: "烟绯 Yanfei (Genshin Impact)",
  shinobu: "久岐忍 Kuki Shinobu (Genshin Impact)",
  gorou: "五郎 Gorou (Genshin Impact)",
  rosaria: "罗莎莉亚 Rosaria (Genshin Impact)",
  yunjin: "云堇 Yun Jin (Genshin Impact)",
  candace: "坎蒂丝 Candace (Genshin Impact)",
  xinyan: "辛焱 Xinyan (Genshin Impact)",
  collei: "柯莱 Collei (Genshin Impact)",
  dori: "多莉 Dori (Genshin Impact)",
  tighnari: "提纳里 Tighnari (Genshin Impact)",
  tartalia: "达达利亚 Tartalia (Genshin Impact)",
  aloy: "埃洛伊 Aloy (Genshin Impact)",
  oz: "奥兹 Oz (Genshin Impact)",
  // Umamusume (popular ones)
  specialweek: "特别周 Special Week (Umamusume Pretty Derby)",
  suzuka: "无声铃鹿 Silence Suzuka (Umamusume Pretty Derby)",
  teio: "东海帝王 Tokai Teio (Umamusume Pretty Derby)",
  goldship: "黄金船 Gold Ship (Umamusume Pretty Derby)",
  vodka: "伏特加 Vodka (Umamusume Pretty Derby)",
  scarlet: "大和赤骥 Daiwa Scarlet (Umamusume Pretty Derby)",
  goldcity: "黄金城市 Gold City (Umamusume Pretty Derby)",
  harurara: "春乌拉拉 Haru Urara (Umamusume Pretty Derby)",
  kitasan: "北部玄驹 Kitasan Black (Umamusume Pretty Derby)",
  rice: "米浴 Rice Shower (Umamusume Pretty Derby)",
  // Sanoba Witch
  nene: "綾地 寧々 Ayachi Nene (Sanoba Witch)",
  meguru: "因幡 めぐる Inaba Meguru (Sanoba Witch)",
};

const LANGUAGES = {
  ja: "日本語",
  jp: "日本語",
  en: "English",
  zh: "简体中文",
  cn: "简体中文",
  mix: "Mix",
};

async function handler(m, { sock, args }) {
  const input = (args[0] || "").toLowerCase().trim();

  // Show help if no args
  if (!input) {
    let txt = `Anime Voice TTS\n\n`;
    txt += `Suara karakter anime asli (VITS)\n`;
    txt += `Source: Hugging Face (gratis, no API key)\n\n`;
    txt += `\`${m.prefix}animevoice <karakter> <text>\`\n\n`;
    txt += `Contoh:\n`;
    txt += `1. \`${m.prefix}animevoice paimon hello everyone\`\n`;
    txt += `2. \`${m.prefix}animevoice raiden こんにちは\`\n`;
    txt += `3. \`${m.prefix}animevoice hutao hello world\`\n\n`;
    txt += `Karakter populer:\n`;
    txt += `paimon, raiden, hutao, ganyu, nahida, keqing, ayaka, zhongli, xiao, venti, klee, mona, yae, kokomi, yoimiya, shenhe, specialweek, suzuka, teio, goldship, nene\n\n`;
    txt += `Ketik \`${m.prefix}animevoice list\` untuk semua karakter`;
    return await m.reply( txt, { commandName: "animevoice" });
  }

  // Show full character list
  if (input === "list") {
    let txt = `Anime Voice - Daftar Karakter\n\n`;
    txt += `Total: ${Object.keys(CHARACTERS).length} karakter\n\n`;
    txt += `Genshin Impact:\n`;
    const genshin = Object.entries(CHARACTERS).filter(([k, v]) => v.includes("Genshin"));
    for (let i = 0; i < genshin.length; i++) {
      txt += `${i + 1}. \`${genshin[i][0]}\` - ${genshin[i][1].split("(")[0].trim()}\n`;
    }
    txt += `\nUmamusume:\n`;
    const uma = Object.entries(CHARACTERS).filter(([k, v]) => v.includes("Umamusume"));
    for (let i = 0; i < uma.length; i++) {
      txt += `${i + 1}. \`${uma[i][0]}\` - ${uma[i][1].split("(")[0].trim()}\n`;
    }
    txt += `\nSanoba Witch:\n`;
    const sanoba = Object.entries(CHARACTERS).filter(([k, v]) => v.includes("Sanoba"));
    for (let i = 0; i < sanoba.length; i++) {
      txt += `${i + 1}. \`${sanoba[i][0]}\` - ${sanoba[i][1].split("(")[0].trim()}\n`;
    }
    return await m.reply( txt, { commandName: "animevoice" });
  }

  // Check if first arg is a character name
  let speakerKey = null;
  let textStart = 0;

  if (CHARACTERS[input]) {
    speakerKey = input;
    textStart = 1;
  } else {
    // Try matching partial names
    const match = Object.keys(CHARACTERS).find(
      (k) => k.includes(input) || k.startsWith(input),
    );
    if (match) {
      speakerKey = match;
      textStart = 1;
    }
  }

  // If no character found, default to Paimon
  if (!speakerKey) {
    speakerKey = "paimon";
    textStart = 0;
  }

  // Get text
  let text = args.slice(textStart).join(" ").trim();
  if (!text) {
    let txt = `Karakter: ${CHARACTERS[speakerKey].split("(")[0].trim()}\n\n`;
    txt += `Masukkan teks untuk diucapkan!\n\n`;
    txt += `\`${m.prefix}animevoice ${speakerKey} <text>\``;
    return m.reply(claraWrap("animevoice", txt));
  }

  // Detect language from text
  let lang = "日本語";
  const hasHiragana = /[぀-ゟ]/.test(text);
  const hasKatakana = /[゠-ヿ]/.test(text);
  const hasKanji = /[一-龯]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasHiragana || hasKatakana) {
    lang = "日本語";
  } else if (hasKanji && !hasLatin) {
    lang = "简体中文";
  } else if (hasLatin && !hasKanji && !hasHiragana && !hasKatakana) {
    lang = "English";
  } else if (hasKanji && hasLatin) {
    lang = "Mix";
  }

  await m.react("🕒");

  try {
    const speaker = CHARACTERS[speakerKey];

    // Step 1: Call the API
    const callRes = await axios.post(
      API_CALL,
      { data: [text, speaker, lang, 1, false] },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
        validateStatus: () => true,
      },
    );

    if (callRes.status !== 200 || !callRes.data?.event_id) {
      throw new Error(`API error: HTTP ${callRes.status}`);
    }

    const eventId = callRes.data.event_id;

    // Step 2: Poll for result (SSE)
    let audioUrl = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts && !audioUrl) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;

      const pollRes = await axios.get(`${API_CALL}/${eventId}`, {
        timeout: 30000,
        validateStatus: () => true,
        responseType: "text",
      });

      if (pollRes.status !== 200) continue;

      const lines = pollRes.data.split("\n");
      for (const line of lines) {
        if (line.startsWith("event: complete")) {
          // Next line should have data
          continue;
        }
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data[0] === "Success" && data[1]?.url) {
              audioUrl = data[1].url;
              break;
            } else if (data[0] && data[0] !== "Success") {
              throw new Error(`TTS failed: ${data[0]}`);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }

    if (!audioUrl) {
      throw new Error("Timeout menunggu hasil TTS");
    }

    // Step 3: Download audio
    const audioRes = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      validateStatus: () => true,
    });

    if (audioRes.status !== 200) {
      throw new Error("Gagal download audio");
    }

    const audioBuffer = Buffer.from(audioRes.data);

    await m.react("🐣");

    let caption = `Anime Voice TTS\n`;
    caption += `Karakter: ${speaker.split("(")[0].trim()}\n`;
    caption += `Bahasa: ${lang}\n`;
    caption += `Text: ${text}`;

    await sock.sendMessage(
      m.chat,
      {
        audio: await toVoiceNote(audioBuffer),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      },
      { quoted: m },
    );
  } catch (e) {
    console.error("[ANIMEVOICE] Error:", e.message);
    let txt = `Gagal generate voice!\n\n`;
    txt += `Error: ${e.message}`;
    await m.reply(claraWrap("animevoice", txt));
  }
}

export { pluginConfig as config, handler };
