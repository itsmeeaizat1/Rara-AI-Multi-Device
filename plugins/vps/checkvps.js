// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import * as timeHelper from '../../src/lib/rara-time.js'
import te from '../../src/lib/rara-error.js'

const pluginConfig = {
  name: ["cekvps", "cekdroplet", "vpsstatus", "infovps"],
  alias: ["cekvps", "cekdroplet", "vpsstatus", "infovps"],
  category: "vps",
  description: "Cek detail VPS DigitalOcean",
  usage: ".cekvps <id>",
  example: ".cekvps 123456789",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function hasAccess(sender, isOwner) {
  if (isOwner) return true;
  const cleanSender = sender?.split("@")[0];
  if (!cleanSender) return false;
  const doConfig = config.digitalocean || {};
  return (
    (doConfig.sellers || []).includes(cleanSender) ||
    (doConfig.ownerPanels || []).includes(cleanSender)
  );
}

async function handler(m, { sock }) {
  const token = config.digitalocean?.token;

  if (!token) {
    return m.reply( `DigitalOcean belum disetup. Isi digitalocean.token di config.js`, "cekvps");
  }

  if (!hasAccess(m.sender, m.isOwner)) {
    return m.reply(raraWrap("Akses Ditolak", "🚫 Fitur ini hanya untuk Owner/Seller."));
  }

  const dropletId = m.text?.trim();
  if (!dropletId) {
    return m.reply( raraWrap("checkvps", `Cara pakai:\n${m.prefix}cekvps <droplet_id>\n\nGunakan ${m.prefix}listvps untuk melihat ID`, "guide"), "cekvps");
  }
  try {
    const response = await axios.get(
      `https://api.digitalocean.com/v2/droplets/${dropletId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const droplet = response.data.droplet;
    const ip = droplet.networks?.v4?.find((n) => n.type === "public")?.ip_address || "-";
    const ipv6 = droplet.networks?.v6?.[0]?.ip_address || "-";
    const status = droplet.status === "active" ? "Active" : droplet.status;

    let txt = `ID: ${droplet.id}
Name: ${droplet.name}
Status: ${status}
IPv4: ${ip}
IPv6: ${ipv6}

「 Spec 」
RAM: ${droplet.memory} MB
CPU: ${droplet.vcpus} vCPU
Disk: ${droplet.disk} GB
Region: ${droplet.region?.name || droplet.region?.slug}
OS: ${droplet.image?.distribution} ${droplet.image?.name}
Created: ${timeHelper.fromTimestamp(droplet.created_at, "DD MMMM YYYY HH:mm:ss")}`;
    await m.reply(txt);
  } catch (err) {
    return m.reply(te(m.prefix, m.command, m.pushName, err));
  }
}

export { pluginConfig as config, handler };
