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
    lookupUser: (email, client) => {
        return db.query({
            text: 'SELECT * FROM users WHERE email = $1',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            } else {
                return null
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