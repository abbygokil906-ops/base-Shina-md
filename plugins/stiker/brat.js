const { apiUrl, sendSticker } = require("./_lib.js")

// command -> tema API (nilai "hijua" memang begitu penulisannya di API)
const THEMES = { putih: "putih", hitam: "hitam", hijau: "hijua", pink: "pink" }

module.exports = {
    name: "brat",
    command: ["brat", ...Object.keys(THEMES).map((t) => "brat" + t)],
    desc: "Stiker teks gaya brat (putih/hitam/hijau/pink)",
    usage: "<teks>",
    example: "halo dunia",
    needs: "text",
    THEMES,
    async run({ sock, m, text, command }) {
        const theme = THEMES[command.replace(/^brat/, "")] || THEMES.putih
        await sendSticker(sock, m, apiUrl("brat", { text, theme }))
    }
}
