// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import { Client } from 'ssh2'
import te from '../../src/lib/rara-error.js'
const pluginConfig = {
    name: 'installtemaenigma',
    alias: ["installtemaenigma"],
    category: 'panel',
    description: 'Install tema Enigma untuk panel Pterodactyl via SSH',
    usage: '.installtemaenigma <ip>|<password>|<link_wa>|<link_group>|<link_channel>',
    example: '.installtemaenigma 192.168.1.1|secretpass|https://wa.me/628xxx|https://t.me/group|https://t.me/channel',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true
}

const DEPS_CMD = 'apt-get update -y && apt-get install -y curl git && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs && npm i -g yarn && apt-get install -y composer'
const THEME_CMD = 'bash <(curl -s https://raw.githubusercontent.com/veryLinh/Theme-Autoinstaller/main/install.sh)'
const BUILD_CMD = 'cd /var/www/pterodactyl && composer install --no-dev --optimize-autoloader && yarn install && export NODE_OPTIONS=--openssl-legacy-provider && yarn build:production && php artisan view:clear && php artisan config:clear'

function execSSHInteractive(conn, cmd, inputs) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, { pty: true }, (err, stream) => {
            if (err) return reject(err)
            let buffer = ''
            let inputState = 0

            stream.on('close', () => resolve(buffer))
            stream.on('data', (data) => {
                const output = data.toString()
                buffer += output

                if (inputs[inputState]) {
                    const { trigger, value } = inputs[inputState]
                    if (buffer.includes(trigger)) {
                        stream.write(value + '\n')
                        inputState++
                        buffer = ''
                    }
                }
            })
            stream.stderr.on('data', (data) => {
                buffer += data.toString()
            })
        })
    })
}

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
            "installtemaenigma",
            "Install tema Enigma ke VPS",
            `${m.prefix}installtemaenigma 192.168.1.1|pass|https://wa.me/628xxx|https://t.me/group|https://t.me/channel`
        ))
    }

    const parts = text.split('|')
    if (parts.length < 5) {
        return m.reply(raraWrap("installtemaenigma", `❌ Format salah!\n\nGunakan: \`ip|password|link_wa|link_group|link_channel\``, "guide"))
    }

    const ipvps = parts[0].trim()
    const passwd = parts[1].trim()
    const linkWa = parts[2].trim()
    const linkGroup = parts[3].trim()
    const linkChannel = parts[4].trim()

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

                        await execSSHInteractive(conn, THEME_CMD, [
                { trigger: 'AKSES TOKEN', value: 'skyzodev' },
                { trigger: 'Masukkan pilihan', value: '1' },
                { trigger: 'Masukkan pilihan', value: '3' },
                { trigger: 'WhatsApp', value: linkWa },
                { trigger: 'group', value: linkGroup },
                { trigger: 'channel', value: linkChannel }
            ])

                        await execSSH(conn, BUILD_CMD)
            await m.reply(raraWrap("installtemaenigma", `✅ Status: *Terinstall*\nIP: ${ipvps}\n\n_Tema Enigma + dependencies berhasil diinstall!_`))
        } catch (err) {
            m.reply(raraWrap("installtemaenigma", te(m.prefix, m.command, m.pushName, err), "error"))
        } finally {
            conn.end()
        }
    }).on('error', (err) => {
        m.reply(raraWrap("installtemaenigma", `❌ Koneksi gagal!\n\nIP atau Password tidak valid.`))
    }).connect(connSettings)
}

export { pluginConfig as config, handler }
