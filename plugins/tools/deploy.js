import axios from 'axios'
import { novaError } from '../../src/lib/nova-menu-style.js'
import config from '../../config.js'

const pluginConfig = {
    name: "deploytool",
    alias: ["deploytool", "deploy"],
    category: 'owner',
    description: 'Deploy HTML ke Vercel (reply code / file)',
    usage: '.deploy <namawebsite>',
    example: '.deploy mysite',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const name = m.args[0]
    if (!name) {
        return m.reply(
`❌ *Masukkan nama website*

Reply kode HTML atau file .html

*Contoh:*
.deploy mysite`
        )
    }

    if (!m.quoted) {
        return m.reply(
`❌ *ʜᴛᴍʟ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*

Reply pesan berisi HTML
atau reply file .html`
        )
    }

    const token = config.vercel?.token
    if (!token) {
        return await m.reply(novaError('Deploy', 'Vercel token belum diset oleh owner.'))
    }
    let htmlContent

    try {
        if (m.quoted.text || m.quoted.body) {
            htmlContent = m.quoted.text || m.quoted.body
        } else if (
            m.quoted.mimetype === 'text/html' ||
            (m.quoted.filename && m.quoted.filename.endsWith('.html'))
        ) {
            const buffer = await m.quoted.download()
            htmlContent = buffer.toString()
        } else {
            return m.reply(
`❌ *ꜰᴏʀᴍᴀᴛ ᴛɪᴅᴀᴋ ᴅɪᴅᴜᴋᴜɴɢ*

Reply teks HTML
atau file .html`
            )
        }

        if (!/<html|<!doctype html|<head|<body/i.test(htmlContent)) {
            return m.reply(
`❌ *ʙᴜᴋᴀɴ ʜᴛᴍʟ ᴠᴀʟɪᴅ*

Pastikan berisi struktur HTML`
            )
        }

        const payload = {
            name,
            project: name,
            target: 'production',
            files: [
                {
                    file: 'index.html',
                    data: htmlContent
                }
            ],
            projectSettings: {
                framework: null
            }
        }

        await axios.post(
            'https://api.vercel.com/v13/deployments',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        )

        let domain = `${name}.vercel.app`

        try {
            const domainsRes = await axios.get(
                `https://api.vercel.com/v9/projects/${name}/domains`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    timeout: 30000
                }
            )

            const domains = domainsRes.data.domains || []

            domain =
                domains.find(d => !d.name.endsWith('.vercel.app'))?.name ||
                domains.find(d => d.name.endsWith('.vercel.app'))?.name ||
                domain
        } catch {
            // fallback tetap ke default domain
        }
        await m.reply(
`✅ *ᴅᴇᴘʟᴏʏ ꜱᴜᴄᴄᴇꜱꜱ*

Nama: ${name}
Platform: Vercel
Type: Static HTML
Status: Building

URL: https://${domain}`
        )

    } catch (error) {

        const err =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message

        m.reply(
`❌ *ᴅᴇᴘʟᴏʏ ꜰᴀɪʟᴇᴅ*

${err}`
        )
    }
}

export { pluginConfig as config, handler }
