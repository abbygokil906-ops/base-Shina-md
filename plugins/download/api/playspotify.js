const { tool, queryOnly } = require("./_lib.js")

module.exports = tool({
    name: "playspotify",
    command: ["playspotify", "splay"],
    endpoint: "play-spotify",
    desc: "Cari lagu di Spotify lalu kirim MP3 hasil pertama",
    usage: "<judul lagu>",
    example: "hindia secukupnya",
    needs: "text",
    output: "audio",
    timeout: 180000,
    params: queryOnly()
})
