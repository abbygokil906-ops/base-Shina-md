const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animehome",
    command: ["animehome", "animein"],
    endpoint: "home",
    title: "🎌 Animein — Beranda",
    desc: "Beranda Animein: slider, anime hangat, baru, hari ini, populer, paling ditunggu",
    main: { type: "text", names: [], opt: true },
    hint: "Detail anime: .animedetail <id>"
})
