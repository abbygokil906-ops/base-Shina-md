const { tool } = require("./_lib.js")

module.exports = tool({
    name: "notrack",
    command: ["notrack", "notrackai"],
    endpoint: "notrack-ai",
    desc: "NoTrack AI: pilih gaya jawaban (style=...), obrolan nyambung, bisa lampirkan gambar",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text",
    image: ["image", "file", "url"],
    session: {"params": ["chat_id"], "keys": ["chat_id", "chatId"]}
})
