import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import FormData from 'form-data'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "transkrip",
    alias: ["transkrip", "transcribetext", "transkripv2"],
    category: 'tools',
    description: 'Konversi voice note / audio ke teks (Speech-to-Text)',
    usage: '.transkrip (reply voice note)',
    example: '.transkrip',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
};
function convertToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        exec(
            `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`,
            { timeout: 30000 },
            (err) => err ? reject(err) : resolve()
        );
    });
}
async function transcribeWithGroq(audioBuffer, apiKey) {
    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'id');
    form.append('response_format', 'json');
    const { data } = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
        headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000,
        maxContentLength: Infinity
    });
    return data.text || '';
}
async function handler(m, { sock }) {
    const quoted = m.quoted || m;
    const isAudio = quoted.type === 'audioMessage' || /audio/.test(quoted.mimetype || '');
    if (!isAudio) {
        return sendReplyWithNav(sock, m, `🎤 *TRANsKRIP*\n\n` +
            `> Reply voice note atau audio untuk mengonversi ke teks\n` +
            `> Contoh: reply VN → ketik \`${m.prefix}transkrip\``, "transkrip");
    }
    const groqKey = config.APIkey?.groq;
    if (!groqKey) {
        return sendReplyWithNav(sock, m, `❌ *GAGAL*\n\n` +
            `> API Key Groq belum diatur\n` +
            `> Set di config.js → APIkey.groq\n` +
            `> Gratis di https://console.groq.com`, "transkrip");
    }
    m.react('🕐');
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const inputFile = path.join(tmpDir, `stt_${Date.now()}.ogg`);
    const wavFile = path.join(tmpDir, `stt_${Date.now()}.wav`);
    try {
        const buffer = await quoted.download();
        if (!buffer || buffer.length < 1000) {
            return m.reply(claraWrap("Transkrip", '❌ Audio terlalu kecil atau gagal diunduh'));
        }
        fs.writeFileSync(inputFile, buffer);
        await convertToWav(inputFile, wavFile);
        const wavBuffer = fs.readFileSync(wavFile);
        const text = await transcribeWithGroq(wavBuffer, groqKey);
        if (!text || text.trim() === '') {
            return m.reply(claraWrap("Transkrip", '❌ Tidak dapat mendeteksi suara. Pastikan audio jelas dan tidak terlalu pendek.'));
        }
        const duration = Math.ceil(buffer.length / 4000);
        await m.reply(
            `🎤 *TRANsKRIP*\n\n` +
            `╔┈┈「 📝 *HAsIL* 」\n` +
            `╎❏ \n` +
            `╎❏ ${text}\n` +
            `╎❏ \n` +
            `╚┈┈┈┈┈┈┈┈┈❖\n\n` +
            `> 🤖 Model: Whisper Large V3\n` +
            `> 🌐 Bahasa: Indonesia\n` +
            `> 📊 Ukuran: ~${(buffer.length / 1024).toFixed(1)} KB`
        );
        m.react('✅');
    } catch (error) {
        if (error.response?.status === 401) {
            return m.reply('❌ API Key Groq invalid. Cek config.js → APIkey.groq');
        }
        if (error.response?.status === 429) {
            return m.reply(claraWrap("Transkrip", '❌ Rate limit Groq tercapai. Coba lagi nanti.'));
        }
        m.reply(claraWrap("transkrip", te(m.prefix, m.command, m.pushName), "error"));
    } finally {
        [inputFile, wavFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });
    }
}
export { pluginConfig as config, handler }