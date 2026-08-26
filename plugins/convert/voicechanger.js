// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { spawn } from 'child_process'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "voicechanger",
  alias: ["voicechanger"],
  aliases: ["voicechanger", "vc", "ubahsuara", "gantisuara", "voicechange"],
  category: "convert",
  description: "Voice changer 48 model (25 local ffmpeg + 23 anime RVC Genshin Impact API)",
  usage: ".vc <model> (reply audio/vn) | .vc list | .vc anime list | .vc anime <karakter>",
  example: ".vc loli (reply vn) | .vc anime raiden (reply vn) | .vc list | .vc anime list",
  isGroupOnly: false,
  cooldown: 10,
  energi: 3,
};

// === LOCAL FFMPEG VOICE MODELS (25) ===
const LOCAL_MODELS = {
  "loli": {
    desc: "Suara cewek anime imut (high pitch + smooth)",
    filter: "asetrate=44100*1.5,aresample=44100,atempo=1.1,treble=g=3",
    type: "local",
  },
  "shota": {
    desc: "Suara anak cowok anime (pitch up medium)",
    filter: "asetrate=44100*1.25,aresample=44100,atempo=1.05",
    type: "local",
  },
  "animegirl": {
    desc: "Suara cewek anime umum (pitch + chorus)",
    filter: "asetrate=44100*1.35,aresample=44100,atempo=0.98,chorus=0.7:0.9:50:0.4:0.25:2",
    type: "local",
  },
  "animeboy": {
    desc: "Suara cowok anime (pitch up slight + echo)",
    filter: "asetrate=44100*1.1,aresample=44100,atempo=1.0,aecho=0.8:0.7:60:0.3",
    type: "local",
  },
  "tsundere": {
    desc: "Suara tsundere (pitch up + slight distortion)",
    filter: "asetrate=44100*1.3,aresample=44100,atempo=1.05,acrusher=level_in=2:level_out=3:bits=10:mode=log:aa=0.5",
    type: "local",
  },
  "kawaii": {
    desc: "Suara kawaii super imut (very high + chorus)",
    filter: "asetrate=44100*1.6,aresample=44100,atempo=1.1,chorus=0.8:1:40:0.3:0.2:1.5,treble=g=4",
    type: "local",
  },
  "yandere": {
    desc: "Suara yandere (pitch + reverb creepy)",
    filter: "asetrate=44100*1.2,aresample=44100,aecho=0.9:0.8:120:0.4,vibrato=f=5:d=0.5",
    type: "local",
  },
  "villain": {
    desc: "Suara villain anime (deep + bass + reverb)",
    filter: "asetrate=44100*0.8,aresample=44100,bass=g=8,aecho=0.8:0.9:200:0.5",
    type: "local",
  },
  "mascot": {
    desc: "Suara mascot anime (high pitch + vibrato)",
    filter: "asetrate=44100*1.4,aresample=44100,atempo=1.15,vibrato=f=8:d=1",
    type: "local",
  },
  "demon": {
    desc: "Suara iblis (deep + distortion + reverb)",
    filter: "asetrate=44100*0.7,aresample=44100,bass=g=12,acrusher=level_in=4:level_out=5:bits=6:mode=log:aa=1,aecho=0.8:0.9:100:0.4",
    type: "local",
  },
  "ghost": {
    desc: "Suara hantu (low pitch + heavy reverb + vibrato)",
    filter: "asetrate=44100*0.75,aresample=44100,aecho=0.9:0.95:300:0.6,vibrato=f=3:d=2",
    type: "local",
  },
  "alien": {
    desc: "Suara alien (vibrato + flanger)",
    filter: "asetrate=44100*1.2,aresample=44100,flanger=delay=10:depth=2:regen=3:speed=1,treble=g=5",
    type: "local",
  },
  "monster": {
    desc: "Suara monster (very deep + distortion)",
    filter: "asetrate=44100*0.6,aresample=44100,bass=g=15,acrusher=level_in=6:level_out=7:bits=4:mode=log:aa=1,distort=0.3",
    type: "local",
  },
  "robot": {
    desc: "Suara robot (flanger + metalic)",
    filter: "flanger=delay=5:depth=5:regen=5:speed=2,highpass=f=300,lowpass=f=4000,asetrate=44100*0.95",
    type: "local",
  },
  "giant": {
    desc: "Suara raksasa (very deep + slow + reverb)",
    filter: "asetrate=44100*0.65,aresample=44100,atempo=0.85,bass=g=10,aecho=0.7:0.8:250:0.5",
    type: "local",
  },
  "chipmunk": {
    desc: "Suara tupai (very high + fast)",
    filter: "asetrate=44100*1.8,aresample=44100,atempo=1.2",
    type: "local",
  },
  "helium": {
    desc: "Suara helium (super high pitch)",
    filter: "asetrate=44100*1.7,aresample=44100,atempo=1.0",
    type: "local",
  },
  "baby": {
    desc: "Suara bayi (high pitch + vibrato + fast)",
    filter: "asetrate=44100*1.45,aresample=44100,atempo=1.1,vibrato=f=6:d=1.5,treble=g=3",
    type: "local",
  },
  "oldman": {
    desc: "Suara kakek (deep + slow + tremolo)",
    filter: "asetrate=44100*0.85,aresample=44100,atempo=0.85,tremolo=f=3:d=0.5,bass=g=4",
    type: "local",
  },
  "zombie": {
    desc: "Suara zombie (low + slow + distortion)",
    filter: "asetrate=44100*0.7,aresample=44100,atempo=0.7,acrusher=level_in=3:level_out=4:bits=8:mode=log:aa=1,lowpass=f=2000",
    type: "local",
  },
  "narrator": {
    desc: "Suara narrator (deep + smooth + reverb)",
    filter: "asetrate=44100*0.88,aresample=44100,bass=g=5,aecho=0.5:0.7:150:0.3,highpass=f=100",
    type: "local",
  },
  "phone": {
    desc: "Suara telepon (lowpass + highpass)",
    filter: "highpass=f=500,lowpass=f=3000",
    type: "local",
  },
  "cave": {
    desc: "Suara di gua (heavy reverb)",
    filter: "aecho=0.9:0.95:500:0.7,aecho=0.8:0.9:300:0.5",
    type: "local",
  },
  "underwater": {
    desc: "Suara bawah air (lowpass + slow vibrato)",
    filter: "lowpass=f=800,vibrato=f=2:d=2,asetrate=44100*0.9,aresample=44100",
    type: "local",
  },
  "megaphone": {
    desc: "Suara megafon (distortion + bandpass)",
    filter: "highpass=f=300,lowpass=f=4000,acrusher=level_in=3:level_out=4:bits=8:mode=log:aa=1,bass=g=5,treble=g=5",
    type: "local",
  },
};

// === RVC ANIME VOICE MODELS (23 Genshin Impact Characters) ===
// API: HuggingFace Space ArkanDash/rvc-genshin-impact (Free, Gradio API)
// Pattern: fn_index = character_index * 5
const ANIME_MODELS = [
  { id: "aether", name: "Aether", region: "Main Character", fn_index: 0, pitch: 0 },
  { id: "lumine", name: "Lumine", region: "Main Character", fn_index: 5, pitch: 0 },
  { id: "paimon", name: "Paimon", region: "Main Character", fn_index: 10, pitch: 0 },
  { id: "venti", name: "Venti", region: "Mondstadt", fn_index: 15, pitch: 0 },
  { id: "diluc", name: "Diluc", region: "Mondstadt", fn_index: 20, pitch: 0 },
  { id: "eula", name: "Eula", region: "Mondstadt", fn_index: 25, pitch: 0 },
  { id: "mona", name: "Mona", region: "Mondstadt", fn_index: 30, pitch: 0 },
  { id: "zhongli", name: "Zhongli", region: "Liyue", fn_index: 35, pitch: 0 },
  { id: "hutao", name: "Hu Tao", region: "Liyue", fn_index: 40, pitch: 0 },
  { id: "xiao", name: "Xiao", region: "Liyue", fn_index: 45, pitch: 0 },
  { id: "kazuha", name: "Kazuha", region: "Liyue", fn_index: 50, pitch: 0 },
  { id: "raiden", name: "Raiden Shogun", region: "Inazuma", fn_index: 55, pitch: 0 },
  { id: "yaemiko", name: "Yae Miko", region: "Inazuma", fn_index: 60, pitch: 0 },
  { id: "ayaka", name: "Kamisato Ayaka", region: "Inazuma", fn_index: 65, pitch: 0 },
  { id: "kuki", name: "Kuki Shinobu", region: "Inazuma", fn_index: 70, pitch: 0 },
  { id: "nahida", name: "Nahida", region: "Sumeru", fn_index: 75, pitch: 0 },
  { id: "nilou", name: "Nilou", region: "Sumeru", fn_index: 80, pitch: 0 },
  { id: "wanderer", name: "Wanderer", region: "Sumeru", fn_index: 85, pitch: 0 },
  { id: "kaveh", name: "Kaveh", region: "Sumeru", fn_index: 90, pitch: 0 },
  { id: "furina", name: "Furina", region: "Fontaine", fn_index: 95, pitch: 0 },
  { id: "neuvillette", name: "Neuvillette", region: "Fontaine", fn_index: 100, pitch: 0 },
  { id: "wriothesley", name: "Wriothesley", region: "Fontaine", fn_index: 105, pitch: 0 },
  { id: "navia", name: "Navia", region: "Fontaine", fn_index: 110, pitch: 0 },
];

const RVC_API_BASE = "https://arkandash-rvc-genshin-impact.hf.space";

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasAudio = quoted?.audioMessage || quoted?.pttMessage;

    const input = (args[0] || "").toLowerCase().trim();
    const subInput = (args[1] || "").toLowerCase().trim();

    // === MENU: anime list ===
    if (input === "anime" && (!subInput || subInput === "list" || subInput === "menu")) {
      let lines = [];
      lines.push("Anime Voice - RVC Genshin Impact");
      lines.push("23 Karakter (AI Voice Conversion, Gratis)");
      lines.push("");
      const regions = {};
      ANIME_MODELS.forEach(c => {
        if (!regions[c.region]) regions[c.region] = [];
        regions[c.region].push(c);
      });
      Object.entries(regions).forEach(([region, chars]) => {
        lines.push("*" + region + "*");
        chars.forEach(c => {
          lines.push("  " + c.id + " (" + c.name + ")");
        });
        lines.push("");
      });
      lines.push("Cara: Reply audio/VN lalu " + usedPrefix + "vc anime <karakter>");
      lines.push("Contoh: " + usedPrefix + "vc anime raiden");
      lines.push("");
      lines.push("Note: RVC API butuh 5-15 detik untuk proses");
      return m.reply(claraWrap("Voice Changer - Anime", lines.join("\n")));
    }

    // === MENU: local list ===
    if (!input || input === "list" || input === "menu") {
      let lines = [];
      lines.push("Voice Changer - " + (Object.keys(LOCAL_MODELS).length + ANIME_MODELS.length) + " Model");
      lines.push("");
      lines.push("*LOCAL (ffmpeg - instant)*");
      const categories = {
        "Anime": ["loli", "shota", "animegirl", "animeboy", "tsundere", "kawaii", "yandere", "villain", "mascot"],
        "Creature": ["demon", "ghost", "alien", "monster", "robot", "giant"],
        "Fun": ["chipmunk", "helium", "baby", "oldman", "zombie", "narrator"],
        "Effect": ["phone", "cave", "underwater", "megaphone"],
      };
      Object.entries(categories).forEach(([cat, keys]) => {
        lines.push("*" + cat + "*");
        keys.forEach(k => {
          if (LOCAL_MODELS[k]) lines.push("  " + k + " - " + LOCAL_MODELS[k].desc);
        });
        lines.push("");
      });
      lines.push("*ANIME RVC (Genshin Impact - AI)*");
      lines.push("  Ketik " + usedPrefix + "vc anime list untuk 23 karakter");
      lines.push("");
      lines.push("Cara: Reply audio/VN lalu ketik " + usedPrefix + "vc <model>");
      lines.push("Contoh: " + usedPrefix + "vc loli | " + usedPrefix + "vc anime raiden");
      return m.reply(claraWrap("Voice Changer", lines.join("\n")));
    }

    // === RVC ANIME MODE ===
    if (input === "anime" && subInput) {
      const char = ANIME_MODELS.find(c => c.id === subInput || c.name.toLowerCase() === subInput);
      if (!char) {
        return m.reply(claraWrap("Voice Changer", [
          "Karakter anime tidak ditemukan: " + subInput,
          "Ketik " + usedPrefix + "vc anime list untuk lihat semua.",
        ].join("\n")));
      }

      if (!hasAudio) {
        return m.reply(claraWrap("Voice Changer", "Reply pesan audio / voice note yang mau diubah.\n\nContoh: Reply VN lalu " + usedPrefix + "vc anime " + char.id));
      }

      const statusMsg = await conn.sendMessage(m.key.remoteJid, {
        text: claraWrap("Voice Changer", "Memproses RVC AI: " + char.name + " (" + char.region + ")...\nEstimasi: 5-15 detik"),
      });

      // Download audio
      let audioBuffer;
      try {
        audioBuffer = await conn.downloadMediaMessage({
          key: { remoteJid: m.key.remoteJid, id: m.quoted?.id },
          message: quoted,
        });
      } catch (e) {
        return m.reply(claraWrap("Voice Changer", "Gagal download audio. Coba reply ulang."));
      }

      if (!audioBuffer || audioBuffer.length < 100) {
        return m.reply(claraWrap("Voice Changer", "Audio tidak valid atau terlalu kecil."));
      }

      // Convert to WAV first (RVC expects WAV)
      const tmpDir = path.join(os.tmpdir(), 'nova-vc-rvc');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const inputWav = path.join(tmpDir, 'input_' + Date.now() + '.wav');
      const convertedWav = path.join(tmpDir, 'conv_' + Date.now() + '.wav');
      const outputOgg = path.join(tmpDir, 'output_' + Date.now() + '.opus');

      fs.writeFileSync(inputWav, audioBuffer);

      // Convert to WAV 44100Hz mono
      await new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y', '-i', inputWav, '-ar', '44100', '-ac', '1', convertedWav]);
        ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg convert failed')));
        ff.on('error', reject);
      });

      // Upload to HuggingFace Space
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('files', fs.createReadStream(convertedWav), {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });

      const uploadRes = await axios.post(RVC_API_BASE + '/upload', form, {
        timeout: 30000,
        headers: form.getHeaders(),
      });

      const uploadedPath = uploadRes.data[0];
      if (!uploadedPath) throw new Error('Gagal upload ke RVC server');

      // Join queue with character fn_index
      const sessionHash = 'nova_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const queueRes = await axios.post(RVC_API_BASE + '/queue/join', {
        data: [
          "Upload audio",
          uploadedPath,
          null,
          "",
          "",
          char.pitch,
          "pm",
          0.5,
          3,
          0,
          1,
          0.5
        ],
        fn_index: char.fn_index,
        session_hash: sessionHash,
      }, { timeout: 15000 });

      const eventId = queueRes.data.event_id;
      if (!eventId) throw new Error('Gagal join queue RVC');

      // Poll for result
      let resultUrl = null;
      let attempts = 0;
      const maxAttempts = 30;

      while (!resultUrl && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        const dataRes = await axios.get(RVC_API_BASE + '/queue/data?session_hash=' + sessionHash, {
          timeout: 10000,
          responseType: 'text',
        });

        const lines = dataRes.data.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.msg === 'process_completed' && evt.output?.data) {
              const audioData = evt.output.data[1];
              if (audioData && audioData.url) {
                resultUrl = audioData.url;
              } else if (audioData && audioData.path) {
                resultUrl = RVC_API_BASE + '/file=' + audioData.path;
              }
            }
            if (evt.msg === 'process_completed' && !resultUrl) {
              const errorMsg = typeof evt.output?.data?.[0] === 'string' && evt.output.data[0].includes('Error') ? evt.output.data[0] : null;
              if (errorMsg) throw new Error('RVC error: ' + errorMsg.slice(0, 200));
            }
          } catch (e) {
            if (e.message.includes('RVC error')) throw e;
          }
        }
      }

      if (!resultUrl) throw new Error('Timeout menunggu RVC (coba lagi)');

      // Download result audio
      const resultRes = await axios.get(resultUrl, {
        timeout: 30000,
        responseType: 'arraybuffer',
      });

      // Convert to opus for WhatsApp
      fs.writeFileSync(path.join(tmpDir, 'result_' + Date.now() + '.wav'), resultRes.data);
      const resultWav = path.join(tmpDir, 'result_' + Date.now() + '.wav');
      fs.writeFileSync(resultWav, resultRes.data);

      await new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y', '-i', resultWav, '-c:a', 'libopus', '-b:a', '64k', '-ac', '1', '-ar', '48000', outputOgg]);
        ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg opus failed')));
        ff.on('error', reject);
      });

      if (!fs.existsSync(outputOgg) || fs.statSync(outputOgg).size < 100) {
        throw new Error('Output file tidak valid');
      }

      const outputBuf = fs.readFileSync(outputOgg);
      await conn.sendMessage(m.key.remoteJid, {
        audio: outputBuf,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        caption: claraWrap("Voice Changer - RVC Anime", [
          char.name + " (" + char.region + ")",
          "AI Voice Conversion - Genshin Impact",
        ].join("\n")),
      });

      // Cleanup
      try {
        fs.unlinkSync(inputWav);
        fs.unlinkSync(convertedWav);
        fs.unlinkSync(resultWav);
        fs.unlinkSync(outputOgg);
      } catch (e) { console.error('[voicechanger.js]:', e.message); }

      // Delete status
      try {
        await conn.sendMessage(m.key.remoteJid, { delete: { remoteJid: m.key.remoteJid, id: statusMsg.key.id, fromMe: true } });
      } catch (e) { console.error('[voicechanger.js]:', e.message); }

      return;
    }

    // === LOCAL FFMPEG MODE ===
    if (!LOCAL_MODELS[input]) {
      return m.reply(claraWrap("Voice Changer", [
        "Model tidak ditemukan: " + input,
        "Ketik " + usedPrefix + "vc list untuk model lokal",
        "Ketik " + usedPrefix + "vc anime list untuk karakter anime",
      ].join("\n")));
    }

    if (!hasAudio) {
      return m.reply(claraWrap("Voice Changer", "Reply pesan audio / voice note yang mau diubah.\n\nContoh: Reply VN lalu ketik " + usedPrefix + "vc " + input));
    }

    const vm = LOCAL_MODELS[input];
    const statusMsg = await conn.sendMessage(m.key.remoteJid, {
      text: claraWrap("Voice Changer", "Memproses: " + input + "..."),
    });

    let audioBuffer;
    try {
      audioBuffer = await conn.downloadMediaMessage({
        key: { remoteJid: m.key.remoteJid, id: m.quoted?.id },
        message: quoted,
      });
    } catch (e) {
      return m.reply(claraWrap("Voice Changer", "Gagal download audio. Coba reply ulang."));
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      return m.reply(claraWrap("Voice Changer", "Audio tidak valid atau terlalu kecil."));
    }

    const tmpDir = path.join(os.tmpdir(), 'nova-vc-local');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, 'in_' + Date.now() + '.mp3');
    const outputPath = path.join(tmpDir, 'out_' + Date.now() + '.opus');

    fs.writeFileSync(inputPath, audioBuffer);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y', '-i', inputPath,
        '-filter:a', vm.filter,
        '-c:a', 'libopus', '-b:a', '64k', '-ac', '1', '-ar', '48000',
        outputPath,
      ]);
      let stderr = '';
      ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('ffmpeg exit ' + code + ': ' + stderr.slice(-200)));
      });
      ffmpeg.on('error', reject);
    });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 100) {
      throw new Error('Output file tidak valid');
    }

    const outputBuf = fs.readFileSync(outputPath);
    await conn.sendMessage(m.key.remoteJid, {
      audio: outputBuf,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      caption: claraWrap("Voice Changer", [
        input.toUpperCase(),
        vm.desc,
      ].join("\n")),
    });

    try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch (e) { console.error('[voicechanger.js]:', e.message); }
    try {
      await conn.sendMessage(m.key.remoteJid, { delete: { remoteJid: m.key.remoteJid, id: statusMsg.key.id, fromMe: true } });
    } catch (e) { console.error('[voicechanger.js]:', e.message); }

  } catch (e) {
    console.error("voicechanger error:", e.message);
    return m.reply(claraWrap("Voice Changer", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
