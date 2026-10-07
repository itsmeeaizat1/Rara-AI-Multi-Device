// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput,  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import { Client } from 'ssh2'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: ['uinstalltema', 'uninstalltema', 'removetema', 'hapustema'],
    alias: ["root", "uinstalltema", "uninstalltema", "removetema", "hapustema"],
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
        return m.reply(raraCaption({
  emoji: "🖥️",
  name: "root",
  description: "Uninstall tema Pterodactyl via SSH",
  usage: `${m.prefix}uinstalltema <ip>|<password>`,
  example: `${m.prefix}uinstalltema 192.168.1.1|secretpass`,
}), "root")
    }
    
    const parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(raraWrap("root", `❌ Format salah! Gunakan: \`ip|password\``, "guide"))
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
    ress.on('ready', () => {
        ress.exec(command, (err, stream) => {
            if (err) {
                return m.reply(raraWrap("root", te(m.prefix, m.command, m.pushName, err), "error"))
            }
            
            stream.on('close', async () => {
                await m.reply(`✅ Uninstall Tema
Status: Berhasil
IP: ${ipvps}

Tema berhasil diuninstall!`)
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
        m.reply(raraWrap("root", `❌ Koneksi gagal!\n\nIP atau Password tidak valid.`))
    }).connect(connSettings)
}

export { pluginConfig as config, handler }