if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const { Pool } = require('pg')

let pool

const mapEnvToConfig = (mapping) => {
    let config
    Object.keys(mapping).forEach((value, index) => {
        if (process.env.hasOwnProperty(mapping[value])) {
            config = config || {}
            config[value] = process.env[mapping[value]]
        }
    })
    return config
}

const configForTest = mapEnvToConfig({
    host: 'TEST_PGHOST',
    port: 'TEST_PGPORT',
    database: 'TEST_PGDATABASE',
    user: 'TEST_PGUSER',
    password: 'TEST_PGPASSWORD'
})

const db = {
    configForTest,
    init: (config) => {
        if (!pool) {
            pool = new Pool(config)
        }
    },
    testConnection: () => {
        return pool.query('SELECT NOW()')
    },
    end: () => {
        if (pool) {
            pool.end()
        }
    }
}

module.exports = db