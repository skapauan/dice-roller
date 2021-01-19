const http = require('http')

const server = http.createServer((req, res) => {
    res.statusCode = 200
    res.end('<html><head><title>Dice Roller</title></head><body><p>Dice Roller is under construction!</body></html>')
})

module.exports = server