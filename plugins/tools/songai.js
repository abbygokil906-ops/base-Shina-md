const { pipe, tool } = require("./_lib.js")

module.exports = tool({
    name: "songai",
    command: ["songai"],
    endpoint: "songai",
    desc: "Buat lagu pakai AI",
    usage: "<prompt>|[judul]|[style]|[gender]",
    example: "lagu tentang persahabatan|Sahabat|anime|male",
    needs: "text",
    output: "audio",
    timeout: 300000,
    params: pipe(["prompt", "title", "style", "gender"], { min: 1, defaults: { title: "Nihilux Song", style: "anime", gender: "male" } })
})
