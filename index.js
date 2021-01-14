if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const http = require('http')

const server = http.createServer((req, res) => {
    res.statusCode = 200
    res.end('<html><head><title>Dice Roller</title></head><body><p>Dice Roller is under construction!</body></html>')
})

const port = process.env.PORT || 3000
const hasRandomKey = process.env.RANDOMORG_API_KEY ? true : false;

server.listen(port, () => {
    console.log(`Server running on port ${port}. Random.org API key ${hasRandomKey ? 'found' : 'not found'}.`)
})
