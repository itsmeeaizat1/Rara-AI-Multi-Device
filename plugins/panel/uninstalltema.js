// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { Client } from 'ssh2'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: ['uinstalltema', 'uninstalltema', 'removetema', 'hapustema'],
    alias: ["uinstalltema", "uninstalltema", "removetema", "hapustema"],
    category: 'panel',
    description: 'Uninstall tema Pterodactyl via SSH',
    usage: '.uinstalltema <ip>|<password>',
    example: '.uinstalltema 192.168.1.1|secretpass',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text?.trim()
    
    if (!text) {
        return m.reply( `╭┈┈⬡「 🗑️ *ᴜɴɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ*
┃ ㊗ Usage: \`${m.prefix}uinstalltema <ip>|<password>\`
╰┈┈⬡

│ ❏ \`Contoh: ${m.prefix}uinstalltema 192.168.1.1|secretpass\``, "root")
    }
    
    const parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(`❌ Format salah! Gunakan: \`ip|password\``)
    }
    
    const ipvps = parts[0].trim()
    const passwd = parts[1].trim()
    
    global.installtema = { vps: ipvps, pwvps: passwd }
    
    const connSettings = {
        host: ipvps,
        port: 22,
        username: 'root',
        password: passwd
    }
    
    const command = `bash <(curl -s https://raw.githubusercontent.com/veryLinh/Theme-Autoinstaller/main/install.sh)`
    const ress = new Client()
    
    m.react('🕐')
    await m.react("🕒");
    ress.on('ready', () => {
        ress.exec(command, (err, stream) => {
            if (err) {
                return m.reply(claraWrap("root", te(m.prefix, m.command, m.pushName), "error"))
            }
            
            stream.on('close', async () => {
                m.react('✅')
                await m.react("🐣");
                await m.reply(claraWrap("root", `╭┈┈⬡「 ✅ *ᴜɴɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ*
┃ ㊗ sTatus: *ʙᴇʀʜᴀꜱɪʟ*
┃ ㊗ Ip: ${ipvps}
╰┈┈⬡

│ ❏ _Tema berhasil diuninstall!_`))
                ress.end()
            }).on('data', (data) => {
                console.log('[UninstallTema]', data.toString())
                stream.write('skyzodev\n')
                stream.write('2\n')
                stream.write('y\n')
                stream.write('x\n')
            }).stderr.on('data', (data) => {
                console.log('[UninstallTema STDERR]', data.toString())
            })
        })
    }).on('error', (err) => {
        console.log('[SSH Error]', err)
        m.reply(claraWrap("root", `❌ Koneksi gagal!\n\nIP atau Password tidak valid.`))
    }).connect(connSettings)
}

export { pluginConfig as config, handler }