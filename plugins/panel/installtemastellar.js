// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { Client } from 'ssh2'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'installtemastellar',
    alias: ["installtemastellar"],
    category: 'panel',
    description: 'Install tema Stellar untuk panel Pterodactyl via SSH',
    usage: '.installtemastellar <ip>|<password>',
    example: '.installtemastellar 192.168.1.1|secretpass',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

const DEPS_CMD = 'apt-get update -y && apt-get install -y curl git && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs && npm i -g yarn && apt-get install -y composer'
const THEME_CMD = 'bash <(curl -s https://raw.githubusercontent.com/AnonGhostID/flavor/main/flavor.sh)'
const BUILD_CMD = 'cd /var/www/pterodactyl && composer install --no-dev --optimize-autoloader && yarn install && export NODE_OPTIONS=--openssl-legacy-provider && yarn build:production && php artisan view:clear && php artisan config:clear'

function execSSH(conn, cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, { pty: true }, (err, stream) => {
            if (err) return reject(err)
            let output = ''
            stream.on('close', () => resolve(output))
            stream.on('data', d => { output += d.toString() })
            stream.stderr.on('data', d => { output += d.toString() })
        })
    })
}

function handler(m, { sock }) {
    const text = m.text?.trim()

    if (!text) {
        return m.reply( `╭─「 ɪɴꜱᴛᴀʟʟ ᴛᴇᴍᴀ ꜱᴛᴇʟʟᴀʀ 」
│ Usage: \`${m.prefix}installtemastellar <ip>|<password>\`\n╰──────────\n\n\`Contoh: ${m.prefix}installtemastellar 192.168.1.1|secretpass\``, "installtemastellar")
    }

    const parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(`❌ Format salah! Gunakan: \`ip|password\``)
    }

    const ipvps = parts[0].trim()
    const passwd = parts[1].trim()

    const connSettings = {
        host: ipvps,
        port: 22,
        username: 'root',
        password: passwd,
        readyTimeout: 30000
    }

    const conn = new Client()
    conn.on('ready', async () => {
        try {
            await m.reply(claraWrap("installtemastellar", `🕕 *[1/3] Install Dependencies...*\n\nMenginstall Node.js, Yarn, Composer...`))
            await execSSH(conn, DEPS_CMD)

            await m.reply(claraWrap("installtemastellar", `🕕 *[2/3] Install Tema...*\n\nMendownload & install tema Stellar...`))
            await execSSH(conn, THEME_CMD)

            await m.reply(claraWrap("installtemastellar", `🕕 *[3/3] Build Assets...*\n\nCompiling panel assets...`))
            await execSSH(conn, BUILD_CMD)
            await m.reply(claraWrap("installtemastellar", `╭─「 ᴛᴇᴍᴀ ꜱᴛᴇʟʟᴀʀ 」
│ sTatus: *ᴛᴇʀɪɴꜱᴛᴀʟʟ*
│ Ip: ${ipvps}\n╰──────────\n\n_Tema Stellar + dependencies berhasil diinstall!_`))
        } catch (err) {
            m.reply(claraWrap("installtemastellar", te(m.prefix, m.command, m.pushName), "error"))
        } finally {
            conn.end()
        }
    }).on('error', (err) => {
        m.reply(claraWrap("installtemastellar", `❌ Koneksi gagal!\n\nIP atau Password tidak valid.`))
    }).connect(connSettings)
}

export { pluginConfig as config, handler }