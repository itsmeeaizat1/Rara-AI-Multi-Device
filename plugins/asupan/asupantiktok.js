// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { f } from "../../src/lib/nova-http.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { claraWrap, claraLine, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
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
      return m.reply(claraWrap("Asupantiktok", `🚩 *ᴜꜱᴇʀɴᴀᴍᴇ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\nUsername: ${query}`));
    }

    const video = data;
    const videoUrl = video.video.url;

    await sock.sendMedia(m.chat, videoUrl, `${video.caption}`, m, {
      type: "video",
      contextInfo: saluranCtx(),
    });
  } catch (error) {
    m.reply(claraWrap("Username Tidak Ditemukan", `🚩 *ᴜꜱᴇʀɴᴀᴍᴇ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\nUsername: ${query}`));
  }
}

export { pluginConfig as config, handler };
