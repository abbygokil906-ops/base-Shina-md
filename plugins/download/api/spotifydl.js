const { tool, urlOnly } = require("./_lib.js")

module.exports = tool({
    name: "spotifydl",
    command: ["spotifydl", "spdl"],
    endpoint: "spotify-dl",
    desc: "Download lagu Spotify (audio lengkap + cover)",
    usage: "<link spotify>",
    example: "https://open.spotify.com/track/xxxx",
    needs: "text",
    output: "audio",
    timeout: 180000,
    params: urlOnly()
})
