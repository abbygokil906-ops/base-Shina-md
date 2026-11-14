const axios = require("axios")
const crypto = require("crypto")

const BASE = "https://www.alightpro.my.id"
const requestCooldown = new Map()
const COOLDOWN_MS = 30000

const http = axios.create({
    baseURL: BASE,
    timeout: 30000,
    headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        referer: `${BASE}/`,
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36"
    }
})

let cookie = ""

http.interceptors.request.use((config) => {
    if (cookie) config.headers.cookie = cookie
    return config
})

http.interceptors.response.use((response) => {
    const setCookie = response.headers["set-cookie"]
    if (setCookie) cookie = setCookie.map((item) => item.split(";")[0]).join("; ")
    return response
})

const sha256 = (value) =>
    crypto.createHash("sha256").update(String(value), "utf8").digest("hex")

function solvePoW(sessionId, nonce, email, action, difficulty = "0000") {
    if (!/^[0-9a-f]{1,8}$/i.test(difficulty)) {
        throw new Error("Tingkat PoW dari server tidak valid atau terlalu tinggi.")
    }

    const prefix = `${sessionId}:${nonce}:${email.toLowerCase()}:${action}:`
    const maxAttempts = 2000000

    for (let i = 0; i < maxAttempts; i++) {
        if (sha256(prefix + i).startsWith(difficulty)) return String(i)
    }

    throw new Error("PoW belum menemukan hasil. Silakan coba lagi.")
}

async function getSession() {
    const { data } = await http.get("/api/session", {
        headers: { "x-requested-with": "XMLHttpRequest" }
    })

    if (!data?.status || !data.token || !data.nonce || !data.sessionId) {
        throw new Error("Sesi layanan tidak valid.")
    }

    return data
}

async function request(action, body) {
    if (!["send", "verify"].includes(action)) {
        throw new Error("Aksi tidak dikenal.")
    }

    const session = await getSession()
    const difficulty = session.difficulty || "0000"
    const pow = solvePoW(
        session.sessionId,
        session.nonce,
        body.email,
        action,
        difficulty
    )

    const { data } = await http.post(
        "/api/alight-motion",
        { action, ...body },
        {
            headers: {
                "content-type": "application/json",
                "x-requested-with": "XMLHttpRequest",
                "x-amprem-token": session.token,
                "x-amprem-nonce": session.nonce,
                "x-amprem-pow": pow
            }
        }
    )

    return data
}

async function getStats() {
    const [stats, recent] = await Promise.all([
        http.get("/api/stats"),
        http.get("/api/stats/recent")
    ])

    return { stats: stats.data, recent: recent.data }
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))
}

function validVerificationLink(value) {
    try {
        const url = new URL(value)
        return url.protocol === "https:" && !url.username && !url.password
    } catch {
        return false
    }
}

module.exports = {
    request,
    getStats,
    checkCooldown,
    validEmail,
    validVerificationLink
}
