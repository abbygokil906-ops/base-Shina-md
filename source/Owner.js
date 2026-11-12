/*
  Tombol "Hubungi Owner" (terkunci, tidak diatur lewat settings.js)
*/
const _u = "aHR0cHM6Ly93YS5tZS82MjgzODM4NjgxMDIw"

const getOwnerButton = () => {
    const url = Buffer.from(_u, "base64").toString("utf-8")
    return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "Hubungi Owner",
            url,
            merchant_url: url
        })
    }
}

module.exports = Object.freeze({ getOwnerButton })
