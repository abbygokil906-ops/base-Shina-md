const { tool, txt, opt, Usage } = require("./_lib.js")

// API: GET /canvas/derydnta  (text + template 1-3, default 1)
const base = tool({
    name: "derydnta",
    command: ["derydnta", "derydnta1", "derydnta2", "derydnta3"],
    endpoint: "derydnta",
    desc: "Quote bergaya Derydnta (3 pilihan template: 1, 2, 3)",
    usage: "<teks>|<template 1-3>  (template boleh dikosongkan = 1)",
    example: "just friend manggil sayang?|3",
    needs: "text",
    fields: [
        txt("text", "teks", "quote", "message"),
        opt(txt("template"))
    ]
})

module.exports = {
    ...base,
    async run(ctx) {
        // .derydnta1 / .derydnta2 / .derydnta3 = langsung pilih template lewat nama command
        const viaCmd = String(ctx.command || "").match(/derydnta([1-3])$/)
        let teks = String(ctx.text || "").trim()
        let tpl = viaCmd ? viaCmd[1] : ""
        // "teks|3" -> template 3 (kalau bagian terakhir bukan 1-3, seluruhnya dianggap teks)
        const i = teks.lastIndexOf("|")
        if (i !== -1) {
            const last = teks.slice(i + 1).trim()
            if (/^[1-3]$/.test(last)) { tpl = last; teks = teks.slice(0, i).trim() }
            else if (/^\d+$/.test(last)) throw new Usage("Template cuma ada *1 sampai 3*.\n\nContoh: ." + (ctx.command || "derydnta") + " just friend manggil sayang?|3")
            else teks = teks.replace(/\|/g, " ")
        }
        teks = teks.replace(/\|/g, " ").trim()
        if (!teks) throw new Usage()
        ctx = { ...ctx, text: tpl ? `${teks}|${tpl}` : teks }
        return base.run(ctx)
    }
}
