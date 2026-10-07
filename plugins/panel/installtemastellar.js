// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { Client } from 'ssh2'
import te from '../../src/lib/rara-error.js'
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
        return m.reply(raraGuide(
            "installtemastellar",
            "Install tema Stellar ke VPS",
            `${m.prefix}installtemastellar 192.168.1.1|secretpass`
        ), "installtemastellar")
    }

    const parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(raraWrap("installtemastellar", `❌ Format salah! Gunakan: \`ip|password\``, "guide"))
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
            await m.react("🕒");
            await execSSH(conn, DEPS_CMD)

                        await execSSH(conn, THEME_CMD)

                        await execSSH(conn, BUILD_CMD)
            await m.reply(raraWrap("installtemastellar", `
│ sTatus: *terinstall*
│ Ip: ${ipvps}\n\n_Tema Stellar + dependencies berhasil diinstall!_`))
        } catch (err) {
            m.reply(raraWrap("installtemastellar", te(m.prefix, m.command, m.pushName, err), "error"))
        } finally {
            conn.end()
        }
    }).on('error', (err) => {
        m.reply(raraWrap("installtemastellar", `❌ Koneksi gagal!\n\nIP atau Password tidak valid.`))
    }).connect(connSettings)
}

export { pluginConfig as config, handler }