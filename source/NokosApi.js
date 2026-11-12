/*
  NokosApi — client tipis untuk Nokoskuy API v2 (https://welper.web.id/nokoskuy/api/v2)
  Semua fungsi me-return JSON sukses ({ success, data, meta }) atau melempar Error dengan:
    e.code   -> error.code dari API (mis. insufficient_balance, out_of_stock, price_changed) / "network"
    e.status -> HTTP status
    e.detail -> objek error mentah dari API
*/
const axios = require("axios")

// Path aksi pesanan. Dokumentasi bagian "Batal, OTP lagi, tutup" belum terbaca penuh,
// cocokkan dengan dokumentasi kalau ada yang beda.
const PATH = {
    cancel: "/orders/{id}/cancel",
    next: "/orders/{id}/next",
    finish: "/orders/{id}/finish"
}

const cfg = () => global.nokos || {}

async function call(method, path, { body, params, idem } = {}) {
    const c = cfg()
    if (!c.apiKey || /^ISI_/i.test(c.apiKey)) {
        const e = new Error("API key Nokoskuy belum diisi di settings.js")
        e.code = "no_api_key"
        throw e
    }
    let res
    try {
        res = await axios({
            method,
            url: (c.baseUrl || "https://welper.web.id/nokoskuy/api/v2") + path,
            params,
            data: body,
            headers: {
                Authorization: `Bearer ${c.apiKey}`,
                "Content-Type": "application/json",
                ...(idem ? { "Idempotency-Key": idem } : {})
            },
            timeout: 25000,
            validateStatus: () => true
        })
    } catch (err) {
        const e = new Error("Koneksi ke server Nokoskuy gagal")
        e.code = "network"
        e.status = 0
        e.detail = {}
        throw e
    }
    const j = res.data
    if (j && j.success) return j
    const e = new Error(j?.error?.message || `HTTP ${res.status}`)
    e.code = j?.error?.code || `http_${res.status}`
    e.status = res.status
    e.detail = j?.error || {}
    throw e
}

const fill = (p, id) => p.replace("{id}", encodeURIComponent(id))

module.exports = {
    PATH,
    ping: () => call("GET", "/ping"),
    balance: () => call("GET", "/balance"),
    providers: () => call("GET", "/providers"),
    services: (q) => call("GET", "/services", { params: q ? { q } : {} }),
    countries: (sid, provider) => call("GET", `/services/${encodeURIComponent(sid)}/countries`, { params: { provider } }),
    offers: (sid, provider, country_code) =>
        call("GET", `/services/${encodeURIComponent(sid)}/offers`, { params: { provider, country_code } }),
    createOrder: (body, idem) => call("POST", "/orders", { body, idem }),
    getOrder: (id) => call("GET", `/orders/${encodeURIComponent(id)}`),
    finish: (id) => call("POST", fill(PATH.finish, id)),
    cancel: (id) => call("POST", fill(PATH.cancel, id)),
    nextOtp: (id) => call("POST", fill(PATH.next, id)),
    createDeposit: (amount) => call("POST", "/deposits", { body: { amount, method: "qris" } }),
    getDeposit: (id) => call("GET", `/deposits/${encodeURIComponent(id)}`),
    cancelDeposit: (id) => call("DELETE", `/deposits/${encodeURIComponent(id)}`)
}
