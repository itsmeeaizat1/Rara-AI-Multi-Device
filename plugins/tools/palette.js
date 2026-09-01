// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "palette", alias: ["palette"], category: "tools",
  alias: ["palette"],
  description: "Generate color palette dari hex", usage: ".palette <#hex>",
  example: ".palette #ff6600", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max===min) { h=s=0; } else {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return [h*360, s*100, l*100];
}

function hslToHex(h,s,l) {
  s/=100; l/=100;
  const a = s*Math.min(l,1-l);
  const f = n => {
    const k = (n+h/30)%12;
    const c = l-a*Math.max(-1,Math.min(k-3,9-k,1));
    return Math.round(255*c).toString(16).padStart(2,"0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    let hex = m.text?.trim() || `#${Math.random().toString(16).slice(2,8)}`;
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error("Format: #RRGGBB");
    const [h,s,l] = hexToHsl(hex);
    const shades = [
      hslToHex(h, s, Math.max(10, l-30)),
      hslToHex(h, s, Math.max(20, l-15)),
      hex,
      hslToHex(h, s, Math.min(90, l+15)),
      hslToHex(h, s, Math.min(95, l+30)),
    ];
    let text = claraWrap("Color Palette", [`│ Base: *${hex}*`,
      ...shades.map((c,i) => `│ ${i===0?"Dark":i===4?"Light":"Shade"}: ${c}`)].join("\n")) + "\n" + tipText(`Ketik ${prefix}palette #ff6600 untuk warna lain`);
    await m.reply(claraWrap("palette", text));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };