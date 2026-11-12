const { tool } = require("./_lib.js")

module.exports = tool({
    name: "animeschedule",
    command: ["animeschedule", "animejadwal"],
    endpoint: "schedule",
    title: "📅 Jadwal Rilis",
    desc: "Jadwal rilis anime per hari",
    usage: "[hari]",
    example: "senin",
    main: { type: "text", names: ["day", "hari"], opt: true },
    hint: "Detail anime: .animedetail <id>"
})
