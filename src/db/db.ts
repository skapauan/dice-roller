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

const checkPool = () => {
    if (!pool) {
        throw new Error('Must init DB before using')
    }
}

const db = {
    configForTest,
    init: (config) => {
        if (!pool) {
            if (config === undefined && process.env.NODE_ENV === 'test') {
                config = configForTest
            }
            pool = new Pool(config)
        }
        return db.query(
            `CREATE TABLE IF NOT EXISTS users (
                user_id INT GENERATED ALWAYS AS IDENTITY,
                email VARCHAR(320) NOT NULL UNIQUE,
                password TEXT,
                hash TEXT,
                nickname TEXT,
                admin BOOL DEFAULT 'f'
            );`
        )
        .then(() => db.query(
            `CREATE TABLE IF NOT EXISTS pwtokens (
                pwtoken_id INT GENERATED ALWAYS AS IDENTITY,
                token TEXT NOT NULL UNIQUE,
                email VARCHAR(320) NOT NULL,
                expires TIMESTAMP
            );`
        ))
    },
    getClient: () => {
        checkPool()
        return pool.connect()
    },
    query: (statement, client) => {
        checkPool()
        if (client && typeof client.query === 'function') {
            return client.query(statement)
        } else {
            return pool.query(statement)
        }
    },
    end: () => {
        if (pool) {
            pool.end()
            pool = undefined
            return true
        }
        return false
    }
}

module.exports = db