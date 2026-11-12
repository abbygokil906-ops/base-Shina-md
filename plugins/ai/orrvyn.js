const { tool } = require("./_lib.js")

module.exports = tool({
    name: "orrvyn",
    command: ["orrvyn", "orrvynchat"],
    endpoint: "orrvyn-chat",
    desc: "Orrvyn Chat: interaktif, adaptif, menyesuaikan gaya bicaramu",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
