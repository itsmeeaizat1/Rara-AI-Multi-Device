// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import _sharp from 'sharp'
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { f } from "../../src/lib/nova-http.js";
import { addExifToWebp } from "../../src/lib/nova-exif.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine, novaCaption } from "../../src/lib/nova-menu-style.js";

function getSharp() {
 return _sharp;
}

const MAX_STICKERS = 20;
const DOWNLOAD_DELAY = 700;

async function downloadBuffer(url) {
 const res = await axios.get(url, {
 responseType: "arraybuffer",
 timeout: 15000,
 headers: { "User-Agent": "Mozilla/5.0" },
 });
 return Buffer.from(res.data);
}

async function toWebpSticker(buffer) {
 return (await getSharp())(buffer)
 .resize(512, 512, {
 fit: "contain",
 background: { r: 0, g: 0, b: 0, alpha: 0 },
 })
 .webp({ quality: 80 })
 .toBuffer();
}

const pluginConfig = {
 name: "pinpack",
 alias: ["pinpack"],
 category: "sticker",
 description: "Cari gambar Pinterest lalu jadikan sticker pack",
 usage: ".pinpack <query>",
 example: ".pinpack cat",
 isOwner: false,
 isPremium: false,
 isGroup: false,
 isPrivate: false,
 cooldown: 20,
 energi: 3,
 isEnabled: true,
};

async function handler(m, { sock }) {
 const query = m.args?.join(" ")?.trim();

 if (!query) {
 return m.reply(novaCaption({
 emoji: "📌",
 name: "pinpack",
 description: "Cari gambar Pinterest lalu jadikan sticker pack",
 usage: `${m.prefix}pinpack <query>`,
 example: `${m.prefix}pinpack cat`,
}), "pinpack");
 }

 await m.react("🕒");

 try {
 const data = await f(`https://api.siputzx.my.id/api/s/pinterest?query=${query}`);
 const results = data?.data?.slice(0, MAX_STICKERS);

 if (!results || results.length === 0) {
 return m.reply(novaError("PinPack", `Gak nemu hasil untuk: ${query} nih`));
 }

 await m.reply(
 `── . ──\n\nMengunduh *${results.length}* gambar dari Pinterest\nLalu dikonversi ke sticker pack... `,
 );

 const stickerBuffers = [];

 for (const item of results) {
 const imageUrl = item.image_url;
 if (!imageUrl) continue;

 try {
 const buf = await downloadBuffer(imageUrl);
 const webp = await toWebpSticker(buf);
 stickerBuffers.push(webp);
 await new Promise((r) => setTimeout(r, DOWNLOAD_DELAY));
 } catch {
 continue;
 }
 }

 if (!stickerBuffers.length) {
 return m.reply(novaError("PinPack", "Gagal download gambar nih"));
 }

 const packname = `Pinterest: ${query}`;
 const author = config.bot?.developer || config.sticker?.author || "Bot";

 try {
 await sock.sendStickerPack(m.chat, stickerBuffers, m, {
 name: packname,
 packname,
 publisher: author,
 author,
 description: `Sticker pack dari Pinterest: ${query}`,
 emojis: ["❤"],
 });
 await m.react("🐣");
 } catch (packErr) {
 console.error("[PinPack] Pack send failed:", packErr.message);
 await m.reply(
 `── . ──\n\nPack gagal, mengirim satu per satu... `,
 );

 let sent = 0;
 for (const buf of stickerBuffers) {
 try {
 let exifBuf = buf;
 try {
 exifBuf = await addExifToWebp(buf, {
 packname,
 author,
 emojis: ["❤"],
 });
 } catch (e) { console.error('[pinpack.js]:', e.message); }
 await sock.sendMessage(
 m.chat,
 {
 sticker: exifBuf,
 contextInfo: { isForwarded: false, forwardingScore: 0 },
 },
 { quoted: m },
 );
 sent++;
 await new Promise((r) => setTimeout(r, 500));
 } catch {
 continue;
 }
 }

 if (sent > 0) {
 await m.react("🐣");
 await m.reply(
 `── . ──\n\nBerhasil kirim *${sent}* sticker dari *${packname}* `,
 );
 } else {
 await m.reply(novaError("PinPack", "Gagal kirim sticker nih"));
 }
 }
 } catch (error) {
 console.error("[PinPack] Error:", error.message);
 m.reply(claraWrap("pinpack", te(m.prefix, m.command, m.pushName), "error"));
 }
}

export { pluginConfig as config, handler };
