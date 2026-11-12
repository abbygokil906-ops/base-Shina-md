const { apiUrl, sendSticker } = require("./_lib.js")

const TEMPLATES = ["kobato", "menhera", "nezuko", "qiqi", "ruromiya", "umaru"]

module.exports = {
    name: "bratanime",
    command: ["bratanime", "bratanime2", ...TEMPLATES.map((t) => "brat" + t)],
    desc: `Brat karakter anime (${TEMPLATES.join("/")})`,
    usage: `<template> <teks>\nTemplate: ${TEMPLATES.join(", ")}`,
    example: "nezuko halo dunia",
    needs: "text",
    TEMPLATES,
    async run({ sock, m, text, command, prefix }) {
        let template = TEMPLATES.find((t) => command === "brat" + t)
        if (!template) {                       // .bratanime <template> <teks>
            const [first, ...rest] = text.split(/\s+/)
            template = TEMPLATES.find((t) => t === first.toLowerCase())
            text = rest.join(" ")
        }
        if (!template || !text) return m.reply(`*Cara pakai:*\n${prefix}bratanime <template> <teks>\nAtau langsung: ${prefix}brat${TEMPLATES[0]} <teks>\n\n*Template:* ${TEMPLATES.join(", ")}\n\n*Contoh:*\n${prefix}bratanime nezuko halo dunia`)
        await sendSticker(sock, m, apiUrl("bratanime2", { text, template }))
    }
}
