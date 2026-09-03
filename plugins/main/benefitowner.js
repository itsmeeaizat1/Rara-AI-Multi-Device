// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAllPlugins } from '../../src/lib/nova-plugins.js'
import config from '../../config.js'
import { claraWrap, commandListLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
 name: 'benefitowner',
 alias: ["benefitowner"],
 category: 'main',
 description: 'Lihat penjelasan dan daftar fitur khusus Owner',
 usage: '.benefitowner',
 isOwner: false,
 isGroup: false,
 isEnabled: true
}

async function handler(m, { sock }) {
 const prefix = config.command?.prefix || '.'
 const plugins = getAllPlugins()
 const ownerCommands = plugins.filter(p => p.config.isOwner && p.config.isEnabled)

 const seen = new Set()
 const commandList = []
 for (const p of ownerCommands) {
 const names = Array.isArray(p.config.name) ? p.config.name : [p.config.name]
 for (const name of names) {
 if (!name || seen.has(name)) continue
 seen.add(name)
 commandList.push({ name, usage: p.config.usage || '' })
 }
 }
 commandList.sort((a, b) => a.name.localeCompare(b.name))

 const totalCommands = commandList.length

 const message = 
 `👑 *Apa Itu Owner?*\n\n` +
 `Owner adalah *ᴘᴇᴍɪʟɪᴋ ʙᴏᴛ* yang memiliki akses penuh ke semua fitur dan kontrol sistem.\n\n` +
 "" +
 `\`\`\`Akses semua command tanpa batasan\`\`\`\n` +
 `\`\`\`Limit tidak terbatas (-1)\`\`\`\n` +
 `\`\`\`Bypass semua cooldown\`\`\`\n` +
 `\`\`\`Kontrol penuh sistem bot\`\`\`\n` +
 `\`\`\`Manajemen user & group\`\`\`\n` +
 `\`\`\`Akses panel & server\`\`\`\n` +
 `---\n` +
 "" +
 `\`Owner ditambahkan melalui:\`\n` +
 `• \`\`\`${prefix}addowner <nomor>\`\`\`\n` +
 `• Atau langsung di config.js\n` +
 `---\n` +
 "" +
 `\`Total: ${totalCommands} command\`\n` +
 `│\n` +
 commandList.map(c => `${commandListLine(prefix, c.name, c.usage)}`).join('\n') +
 `\n---\n\n` +
 `Hubungi owner untuk mendapatkan akses!`

 await m.reply(claraWrap("benefitowner", message))
}

export { pluginConfig as config, handler }
