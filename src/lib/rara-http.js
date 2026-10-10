// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { request } from 'undici'
import { getRandomUserAgent } from './rara-ua.js'
const REQUEST_TIMEOUT = 60_000

async function f(url, responseType = "json", method = "GET", headers = {}, body = null) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
        const response = await request(url, {
            method,
            headers: {
                "User-Agent": getRandomUserAgent(), // rotasi UA modern (rara-ua) — anti-block
                ...headers
            },
            body,
            signal: controller.signal
        })

        if (response.statusCode >= 400) {
            await response.body.dump()
            return null
        }

        if (responseType === "json") return await response.body.json()
        if (responseType === "text") return await response.body.text()
        if (responseType === "arrayBuffer") return await response.body.arrayBuffer()
        if (responseType === "buffer") return Buffer.from(await response.body.arrayBuffer())

        await response.body.dump()
        return null
    } catch (error) {
        if (controller.signal.aborted) return null
        return null
    } finally {
        clearTimeout(timeoutId)
    }
}

export { f }