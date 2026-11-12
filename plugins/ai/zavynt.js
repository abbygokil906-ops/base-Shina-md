const { tool } = require("./_lib.js")

module.exports = tool({
    name: "zavynt",
    command: ["zavynt"],
    endpoint: "zavynt",
    desc: "Zavynt: kreatif, inovatif, visioner, ide out of the box",
    usage: "<pertanyaan>",
    example: "jelaskan apa itu black hole",
    needs: "text"
})
