// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import sharp from "sharp";
import config from "../../config.js";
import axios from "axios";
import { generateWAMessageFromContent, proto } from "nova";
import te from "../../src/lib/nova-error.js";
import { novaWrap, novaLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
 name: "cekidgc",
 alias: ["cekidgc"],
 category: "group",
 description: "Cek ID dan info lengkap grup",
 usage: ".cekidgc [link grup]",
 example: ".cekidgc https://chat.whatsapp.com/xxxxx",
 isOwner: false,
 isPremium: false,
 isGroup: false,
 isPrivate: false,
 isAdmin: false,
 cooldown: 5,
 energi: 0,
 isEnabled: true,
};

function formatDate(timestamp) {
 if (!timestamp) return "—";
 const d = new Date(
 typeof timestamp === "number" && timestamp < 1e12
 ? timestamp * 1000
 : timestamp,
 );
 const pad = (n) => String(n).padStart(2, "0");
 return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function handler(m, { sock }) {
 try {
 const input = m.text?.trim();
 let groupJid = null;
 let groupMeta = null;

 if (input && input.includes("chat.whatsapp.com/")) {
 const inviteCode = input
 .split("chat.whatsapp.com/")[1]
 ?.split(/[\s?]/)[0];

 if (!inviteCode) {
 return m.reply(novaError("Cek ID Grup", "Link grup yang kamu masukkan gak valid nih!"));
 }

 try {
 groupMeta = await sock.groupGetInviteInfo(inviteCode);
 groupJid = groupMeta?.id;
 } catch {
 return m.reply(novaError("Cek ID Grup", "Link grup gak valid atau udah expired nih!"));
 }
 } else if (input && input.endsWith("@g.us")) {
 groupJid = input;
 try {
 groupMeta = await sock.groupMetadata(groupJid);
 } catch {
 return m.reply(novaError("Cek ID Grup", "Gak bisa mengakses grup tersebut nih!"));
 }
 } else if (m.isGroup) {
 groupJid = m.chat;
 groupMeta = await sock.groupMetadata(groupJid);
 } else {
 return m.reply(
 novaNoInput("Cek ID Grup", `Gunakan perintah ini di dalam grup atau masukkan link/ID grup ya!\n\nContoh:\n${m.prefix}cekidgc\n${m.prefix}cekidgc https://chat.whatsapp.com/xxx`)
 );
 }

 if (!groupMeta || !groupJid) {
 return m.reply(novaEmpty("Cek ID Grup", "Data info grup gak ditemukan nih."));
 }

 const groupName = groupMeta.subject || "Unknown";
 const participants = groupMeta.participants || [];
 const memberCount = participants.length || groupMeta.size || 0;
 const admins = participants.filter(
 (p) => p.admin === "admin" || p.admin === "superadmin",
 );
 const adminCount = admins.length;
 const groupOwner = groupMeta.owner || groupMeta.subjectOwner || "—";
 const createdAt = formatDate(groupMeta.creation);
 const groupDesc = groupMeta.desc || "—";
 const descPreview =
 groupDesc.length > 120 ? groupDesc.slice(0, 120) + "..." : groupDesc;
 const isRestrict = groupMeta.restrict ? "Admin Only" : "Semua Member";
 const isAnnounce = groupMeta.announce ? "Aktif" : "Nonaktif";
 const isCommunity = groupMeta.isCommunity ? "✓ Ya" : "✘ Tidak";
 const joinMode = groupMeta.joinApprovalMode ? "Perlu Approval" : "Bebas";

 let ppBuffer = null;
 try {
 const ppUrl = await sock.profilePictureUrl(groupJid, "image");
 if (ppUrl) {
 ppBuffer = Buffer.from(
 (
 await axios.get(ppUrl, {
 responseType: "arraybuffer",
 timeout: 10000,
 })
 ).data,
 );
 }
 } catch (e) { console.error('[checkidgc.js]:', e.message); }

 const saluranId = config.saluran?.id || "@newsletter";
 const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";

 const infoText =
 `── . 𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗙𝗢 . ── \n\n` +
 `` +
 `Nama : *${groupName}*\n` +
 `Id : \`${groupJid}\`\n` +
 `Member : *${memberCount}*\n` +
 `Admin : *${adminCount}*\n` +
 `Owner : @${groupOwner.replace(/@.+/g, "")}\n` +
 `Dibuat : *${createdAt}*\n` +
 `Komunitas : *${isCommunity}*\n` +
 `Edit Info : *${isRestrict}*\n` +
 `Announce : *${isAnnounce}*\n` +
 `Join Mode : *${joinMode}*\n` +
 `Deskripsi : ${descPreview}\n` +
 
 ` © ${config.bot?.name || "Nova-AI"}`;

 const buttons = [
 {
 name: "cta_copy",
 buttonParamsJson: JSON.stringify({
 display_text: " Copy ID Grup",
 copy_code: groupJid,
 }),
 },
 ,
 {
 name: "quick_reply",
 buttonParamsJson: JSON.stringify({
 display_text: "Kembali",
 id: m.prefix + "menu"
 })
 },
 {
 name: "quick_reply",
 buttonParamsJson: JSON.stringify({
 display_text: "Tanya AI",
 id: m.prefix + "aihelp"
 })
 }
 ];

 if (ppBuffer) {
 let headerMedia = null;
 try {
 const resized = await sharp(ppBuffer)
 .resize(300, 300, { fit: "cover" })
 .jpeg({ quality: 80 })
 .toBuffer();
 headerMedia = await prepareWAMessageMedia(
 { image: resized },
 { upload: sock.waUploadToServer },
 );
 } catch (e) { console.error('[checkidgc.js]:', e.message); }

 const msg = generateWAMessageFromContent(
 m.chat,
 {
 viewOnceMessage: {
 message: {
 messageContextInfo: {
 deviceListMetadata: {},
 deviceListMetadataVersion: 2,
 },
 interactiveMessage: proto.Message.InteractiveMessage.fromObject({
 body: proto.Message.InteractiveMessage.Body.fromObject({
 text: infoText,
 }),
 footer: proto.Message.InteractiveMessage.Footer.fromObject({
 text: `© ${config.bot?.name || "Nova-AI"}`,
 }),
 header: proto.Message.InteractiveMessage.Header.fromObject({
 hasMediaAttachment: !!headerMedia,
 ...(headerMedia || {}),
 }),
 nativeFlowMessage:
 proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
 { buttons },
 ),
 contextInfo: {
 mentionedJid: [m.sender, groupOwner],
 forwardingScore: 0,
 isForwarded: false,
 },
 }),
 },
 },
 },
 { userJid: m.sender, quoted: m },
 );

 await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
 } else {
 const msg = generateWAMessageFromContent(
 m.chat,
 {
 viewOnceMessage: {
 message: {
 messageContextInfo: {
 deviceListMetadata: {},
 deviceListMetadataVersion: 2,
 },
 interactiveMessage: proto.Message.InteractiveMessage.fromObject({
 body: proto.Message.InteractiveMessage.Body.fromObject({
 text: infoText,
 }),
 footer: proto.Message.InteractiveMessage.Footer.fromObject({
 text: `© ${config.bot?.name || "Nova-AI"}`,
 }),
 nativeFlowMessage:
 proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
 { buttons },
 ),
 contextInfo: {
 mentionedJid: [m.sender, groupOwner],
 forwardingScore: 0,
 isForwarded: false,
 },
 }),
 },
 },
 },
 { userJid: m.sender, quoted: m },
 );

 await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
 }
 } catch (error) {
 console.error("[CekIdGc] Error:", error.message);
 m.reply(novaError("Cek ID Grup", "Terjadi kendala saat memproses info grup, coba lagi nanti ya!"));
 }
}

export { pluginConfig as config, handler };
