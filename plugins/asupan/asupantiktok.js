// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { f } from "../../src/lib/rara-http.js";
import { saluranCtx } from "../../src/lib/rara-context.js";
import { raraWrap, raraLine, toSC } from "../../src/lib/rara-menu-style.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}

const pluginConfig = {
  name: "asupantiktok",
  alias: ["asupantiktok"],
  category: "asupan",
  description: "Video TikTok dari username random atau spesifik",
  usage: ".asupantiktok [username]",
  example: ".asupantiktok natajadeh",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const usernames = [
  "natajadeh",
  "aletaanovianda",
  "faisafch",
  "0rbby",
  "cindyanastt",
  "awaa.an",
  "nadineabgail",
  "ciloqciliq",
  "carluskiey",
  "wuxiaturuxia",
  "joomblo",
  "hxszys",
  "indomeysleramu",
  "anindthrc",
  "m1cel",
  "chrislin.chrislin",
  "brocolee__",
  "dxzdaa",
  "toodlesprunky",
  "wasawho",
  "paphricia",
  "queenzlyjlita",
  "apol1yon",
  "eliceannabella",
  "aintyrbaby",
  "christychriselle",
  "natalienovita",
  "glennvmi",
  "_rgtaaa",
  "felicialrnz",
  "zahraazzhri",
  "mdy.li",
  "jeyiiiii_",
  "bbytiffs",
  "irenefennn",
  "mellyllyyy",
  "xsta_xstar",
  "n0_0ella",
  "kutubuku6690",
  "cesiann",
  "gaby.rosse",
  "charrvm_",
  "bilacml04",
  "whosyoraa",
  "ishaangelica",
  "heresthekei",
  "gemoy.douyin",
  "nathasyaest",
  "jasmine.mat",
  "akuallyaa",
  "meycoco22",
  "baby_sya66",
  "knzymyln__",
  "rin.channn",
  "audicamy",
  "franzeskaedelyn",
  "shiraishi.ito",
  "itsceceh",
  "senpai_cj7",
];

async function handler(m, { sock }) {
  const query =
    m.text?.trim() || usernames[Math.floor(Math.random() * usernames.length)];
  try {
    const { data } = await f(
      `https://api.neoxr.eu/api/asupan?username=${query}&apikey=${config.APIkey.neoxr}`,
    );

    if (!data) {
      return m.reply(raraWrap("Asupantiktok", `🚩 *username tidak ditemukan*\n\nUsername: ${query}`));
    }

    const video = data;
    const videoUrl = video.video.url;

    await sock.sendMedia(m.chat, videoUrl, `${video.caption}`, m, {
      type: "video",
      contextInfo: saluranCtx(),
    });
  } catch (error) {
    m.reply(raraWrap("Username Tidak Ditemukan", `Username: ${query}`));
  }
}

export { pluginConfig as config, handler };
