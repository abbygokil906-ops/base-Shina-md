const { tool } = require("./_lib.js")

module.exports = tool({
    name: "geminiv2",
    command: ["geminiv2", "gemini2"],
    endpoint: "geminiv2",
    desc: "Google Gemini v2 (obrolan nyambung otomatis; ketik reset untuk mulai baru)",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text",
    session: {"params": ["session", "session_id"], "keys": ["session", "session_id", "sessionId"]}
})
