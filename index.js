if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const server = require('./server')
const port = process.env.PORT || 3000
const hasRandomKey = process.env.RANDOMORG_API_KEY ? true : false;

server.listen(port, () => {
    console.log(`Server running on port ${port}. Random.org API key ${hasRandomKey ? 'found' : 'not found'}.`)
})
