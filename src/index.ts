import path from 'path'
import { createRequire } from 'module';
import { fileURLToPath } from 'url'
import getServer from './server.js'
import dbconnection from './dbconnection.js'

const require = createRequire(import.meta.url)
if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const dirname = path.dirname(fileURLToPath(import.meta.url))
const server = getServer(dbconnection, path.join(dirname, '..', 'public'), process.env)
const port = process.env.PORT || 3000
const hasRandomKey = process.env.RANDOMORG_API_KEY ? true : false;

dbconnection.init()
.then(() => {
    server.listen(port, () => {
        console.log(`Server running on port ${port}. Random.org API key ${hasRandomKey ? 'found' : 'not found'}.`)
    })
})
.catch((error) => {
    console.log(`Server not started, could not init database. ${error}`)
})
