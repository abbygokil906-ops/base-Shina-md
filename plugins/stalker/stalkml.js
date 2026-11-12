const { tool, Usage } = require("./_lib.js")

module.exports = tool({
    name: "stalkml",
    command: ["stalkml", "mlstalk"],
    endpoint: "stalk-ml",
    desc: "Info akun Mobile Legends",
    usage: "<id> <server>",
    example: "871264864 12342454",
    needs: "text",
    output: "profile",
    params: ({ text }) => {
        const [id, server] = text.match(/\d+/g) || []     // boleh "id server", "id|server", atau "id(server)"
        if (!id || !server) throw new Usage()
        return { id, server }
    }
})
