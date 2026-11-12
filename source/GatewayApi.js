/*
  GatewayApi — client tipis untuk Welper Payment Gateway (QRIS) v1
  https://welper.web.id/gateway/api/v1

  Semua fungsi me-return JSON sukses ({ success, data, meta }) atau melempar Error dengan:
    e.code       -> error.code dari API (unauthorized, invalid_amount, rate_limited, ...) / "network" / "no_api_key"
    e.status     -> HTTP status
    e.retryAfter -> detik (kalau 429)
*/
const axios = require("axios")

const cfg = () => (global.warung && global.warung.gateway) || {}
const apiKey = () => {
    const o = global.db && global.db.settings && global.db.settings.warung && global.db.settings.warung.gwApiKey
    return o || cfg().apiKey || ""
}
const hasKey = () => !!apiKey() && !/^ISI_/i.test(apiKey())

async function call(method, path, { body, params, noAuth } = {}) {
    if (!noAuth && !hasKey()) {
        const e = new Error("API key gateway belum diisi (settings.js > global.warung.gateway.apiKey)")
        e.code = "no_api_key"
        throw e
    }
    let res
    try {
        res = await axios({
            method,
            url: (cfg().baseUrl || "https://welper.web.id/gateway/api/v1").replace(/\/+$/, "") + path,
            params,
            data: body,
            headers: {
                ...(noAuth ? {} : { Authorization: `Bearer ${apiKey()}` }),
                "Content-Type": "application/json"
            },
            timeout: 25000,
            validateStatus: () => true
        })
    } catch (err) {
        const e = new Error("Koneksi ke gateway gagal")
        e.code = "network"
        e.status = 0
        throw e
    }
    const j = res.data
    if (j && j.success) return j
    const e = new Error(j?.error?.message || `HTTP ${res.status}`)
    e.code = j?.error?.code || `http_${res.status}`
    e.status = res.status
    e.retryAfter = Number(res.headers?.["retry-after"]) || 0
    throw e
}

module.exports = {
    hasKey,
    ping: () => call("GET", "/ping", { noAuth: true }),
    me: () => call("GET", "/me"),
    balance: () => call("GET", "/balance"),
    create: (body) => call("POST", "/payments", { body }),
    get: (ref) => call("GET", `/payments/${encodeURIComponent(ref)}`),
    cancel: (ref) => call("POST", `/payments/${encodeURIComponent(ref)}/cancel`)
}
