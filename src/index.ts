import server from './server'
import db from './db/db'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const port = process.env.PORT || 3000
const hasRandomKey = process.env.RANDOMORG_API_KEY ? true : false;

db.init()
.then(() => {
    server.listen(port, () => {
        console.log(`Server running on port ${port}. Random.org API key ${hasRandomKey ? 'found' : 'not found'}.`)
    })
})
.catch((error) => {
    console.log(`Server not started, could not init database. ${error}`)
})
