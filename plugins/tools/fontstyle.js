// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "fontstyle",
  alias: ["font", "fonts", "fonttext", "textfont", "fancytext", "textstyle", "aesthetictext"],
  category: "tools",
  description: "Konversi teks ke berbagai font aesthetic Unicode",
  usage: ".font <style> <teks>\n.font list — lihat semua style tersedia",
  example: ".font smallcaps hallo dunia\n.font glitch apa kabar",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// ============================================================
// FONT MAPS — use Array.from() to handle surrogate pairs
// ============================================================

const lowerSrc = Array.from("abcdefghijklmnopqrstuvwxyz");
const upperSrc = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

function makeMap(lower, upper) {
  const lowerArr = Array.from(lower);
  const upperArr = Array.from(upper);
  const map = {};
  for (let i = 0; i < 26; i++) {
    map[lowerSrc[i]] = lowerArr[i] || lowerSrc[i];
    map[upperSrc[i]] = upperArr[i] || upperSrc[i];
  }
  return map;
}

const FONTS = {
  smallcaps: {
    label: "Small Caps",
    map: makeMap("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
  },
  sansbold: {
    label: "Sans Bold",
    map: makeMap("𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇", "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗛𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭"),
  },
  sansitalic: {
    label: "Sans Italic",
    map: makeMap("𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻", "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡"),
  },
  sansbolditalic: {
    label: "Sans Bold Italic",
    map: makeMap("𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯", "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕"),
  },
  serifitalic: {
    label: "Serif Italic",
    map: makeMap("𝑎𝑏𝑐𝑑𝑒𝑓𝑔𝘩𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧", "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍"),
  },
  serifbold: {
    label: "Serif Bold",
    map: makeMap("𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳", "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙"),
  },
  script: {
    label: "Script",
    map: makeMap("𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏", "𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝑆𝑇𝒰𝒱𝒲𝒳𝒴𝒵"),
  },
  scriptbold: {
    label: "Script Bold",
    map: makeMap("𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃", "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩"),
  },
  fraktur: {
    label: "Fraktur",
    map: makeMap("𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷", "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ"),
  },
  doublestruck: {
    label: "Double Struck",
    map: makeMap("𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫", "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ"),
  },
  monospace: {
    label: "Monospace",
    map: makeMap("𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣", "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉"),
  },
  fullwidth: {
    label: "Full Width",
    map: makeMap("ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ", "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"),
  },
  circled: {
    label: "Circled",
    map: makeMap("ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ", "ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ"),
  },
  circledfilled: {
    label: "Circled Filled",
    map: makeMap("🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩", "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩"),
  },
  squared: {
    label: "Squared",
    map: makeMap("🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉", "🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉"),
  },
  strike: {
    label: "Strikethrough",
    custom: (text) => Array.from(text).map((c) => (c === " " ? " " : c + "\u0336")).join(""),
  },
  underline: {
    label: "Underline",
    custom: (text) => Array.from(text).map((c) => (c === " " ? " " : c + "\u0332")).join(""),
  },
  glitch: {
    label: "Glitch / Zalgo",
    custom: (text) => {
      const marks = ["\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307", "\u0308", "\u030A", "\u030B", "\u030C", "\u0310", "\u0312", "\u0313", "\u0314", "\u0315", "\u031A", "\u031B", "\u033D", "\u033E", "\u033F", "\u0342", "\u0343", "\u0345", "\u0350", "\u0351", "\u0352", "\u0353", "\u0355", "\u0356", "\u0357", "\u0358"];
      let r = "";
      for (const ch of text) {
        if (ch === " ") { r += " "; continue; }
        r += ch;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) r += marks[Math.floor(Math.random() * marks.length)];
      }
      return r;
    },
  },
  sparkle: {
    label: "Sparkle",
    custom: (text) => {
      const dec = ["\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307", "\u0308", "\u030A", "\u030B", "\u030C", "\u0310", "\u0312", "\u0313", "\u0314", "\u0315"];
      let r = "";
      for (const ch of text) {
        if (ch === " ") { r += " "; continue; }
        r += ch + dec[Math.floor(Math.random() * dec.length)] + dec[Math.floor(Math.random() * dec.length)];
      }
      return r;
    },
  },
  upside: {
    label: "Upside Down",
    custom: (text) => {
      const m = {
        a:"\u0250",b:"q",c:"\u0254",d:"p",e:"\u01DD",f:"\u025F",
        g:"\u0183",h:"\u0265",i:"\u1D09",j:"\u027E",k:"\u029E",
        l:"l",m:"\u026F",n:"u",o:"o",p:"d",q:"b",r:"\u0279",
        s:"s",t:"\u0287",u:"n",v:"\u028C",w:"\u028D",x:"x",
        y:"\u028E",z:"z",A:"\u2200",B:"\u0182",C:"\u0186",
        D:"\u15E1",E:"\u018E",F:"\u2132",G:"\u2141",H:"H",
        I:"I",J:"\u017F",K:"\u2C9E",L:"\u2142",M:"W",N:"N",
        O:"O",P:"\u0500",Q:"Q",R:"\u1D1A",S:"S",T:"\u22A5",
        U:"\u2229",V:"\u039B",W:"M",X:"X",Y:"\u2144",Z:"Z",
        ".":"\u02D9","?":"\u00BF","!":"\u00A1",
      };
      return Array.from(text).reverse().map((c) => m[c] || c).join("");
    },
  },
  wingdings: {
    label: "Wingdings",
    custom: (text) => {
      const m = {
        a:"\u273F",b:"\u273E",c:"\u273F",d:"\u2740",e:"\u2741",
        f:"\u2742",g:"\u2743",h:"\u2744",i:"\u2745",j:"\u2746",
        k:"\u2747",l:"\u2748",m:"\u2749",n:"\u274A",o:"\u274B",
        p:"\u273F",q:"\u273E",r:"\u273F",s:"\u2740",t:"\u2741",
        u:"\u2742",v:"\u2743",w:"\u2744",x:"\u2745",y:"\u2746",z:"\u2747",
      };
      return Array.from(text).map((c) => m[c.toLowerCase()] || c).join("");
    },
  },
};

// ============================================================
// CONVERT
// ============================================================

function convertFont(text, style) {
  const font = FONTS[style];
  if (!font) return null;

  if (font.custom) return font.custom(text);
  if (!font.map) return null;

  let result = "";
  for (const ch of text) {
    result += font.map[ch] || ch;
  }
  return result;
}

// ============================================================
// HANDLER
// ============================================================

async function handler(m, { sock }) {
  const args = m.args || [];
  const text = m.text || "";
  const prefix = m.prefix || ".";

  if (!args[0] || args[0].toLowerCase() === "list") {
    const keys = Object.keys(FONTS);
    let list = "";
    keys.forEach((key, i) => {
      const sample = convertFont("Nova", key) || "Nova";
      const label = FONTS[key].label || key;
      list += String(i + 1).padStart(2, "0") + ". " + key + " (" + label + ")\n";
      list += "   " + sample + "\n";
    });
    return m.reply(claraWrap("Font Style", [
      "Konversi teks ke " + keys.length + " font aesthetic",
      "",
      list.trim(),
      "",
      "Gunakan: " + prefix + "font <style> <teks>",
      "Contoh: " + prefix + "font glitch hallo dunia",
    ].join("\n")));
  }

  const style = args[0].toLowerCase();
  const inputText = text.substring(text.indexOf(" ") + 1).trim();

  if (!FONTS[style]) {
    return m.reply(claraWrap("Font Style", [
      "Style " + style + " tidak ditemukan",
      "",
      "Tersedia: " + Object.keys(FONTS).join(", "),
      "",
      "Ketik " + prefix + "font list untuk lihat semua",
    ].join("\n")));
  }

  if (!inputText) {
    return m.reply(claraWrap(FONTS[style].label || style, [
      "Kirim teks yang mau dikonversi",
      "Contoh: " + prefix + "font " + style + " hallo dunia",
    ].join("\n")));
  }

  const converted = convertFont(inputText, style);
  if (!converted) {
    return m.reply(claraWrap("Font Style", "Gagal konversi ke style " + style));
  }

  await m.react("\u2705");
  return m.reply(claraWrap(FONTS[style].label || style, [
    "Original: " + inputText,
    "",
    converted,
  ].join("\n")));
}

export { pluginConfig, handler };
