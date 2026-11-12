const { tool } = require("./_lib.js")

module.exports = tool({
    name: "nova",
    command: ["nova", "novaai"],
    endpoint: "nova",
    desc: "Nova AI: pendamping imajinatif, suka ide unik, seni, obrolan mendalam",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
