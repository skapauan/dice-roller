const http = require('http')
const hostname = 'localhost'
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
    res.statusCode = 200
    res.end('<html><head><title>Dice Roller</title></head><body><p>Dice Roller is under construction!</body></html>')
})

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`)
})
