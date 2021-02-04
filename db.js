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
            pool = new Pool(config)
            return true
        }
        return false
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
    setup: (client) => {
        return db.query(
            `CREATE TABLE IF NOT EXISTS users (
                user_id INT GENERATED ALWAYS AS IDENTITY,
                email VARCHAR(320),
                password TEXT,
                hash TEXT,
                nickname TEXT,
                admin BOOL DEFAULT 'f'
            );`
            , client
        )
    },
    usersIsEmpty: (client) => {
        return db.query(
            `SELECT CASE WHEN EXISTS (SELECT 1 FROM users) THEN 0 ELSE 1 END AS isempty`
            , client)
        .then((result) => {
            if (result.rows.length === 1) {
                if (result.rows[0].isempty === 0) {
                    return false
                }
                if (result.rows[0].isempty === 1) {
                    return true
                }
                throw new Error('Unexpected format in result')
            } else {
                throw new Error('Unexpected number of rows in result')
            }
        })
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