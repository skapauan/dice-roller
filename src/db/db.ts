import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

let pool: Pool | undefined

interface Mapping {[index: string]: string}

const mapEnvToConfig = (mapping: Mapping): Mapping | undefined => {
    let config: Mapping | undefined
    Object.keys(mapping).forEach((key) => {
        const value: string | undefined = process.env[mapping[key]]
        if (typeof value === 'string') {
            config = config || {}
            config[key] = value
        }
    })
    return config
}

const configForTest: PoolConfig | undefined = mapEnvToConfig({
    host: 'TEST_PGHOST',
    port: 'TEST_PGPORT',
    database: 'TEST_PGDATABASE',
    user: 'TEST_PGUSER',
    password: 'TEST_PGPASSWORD'
})

const db = {
    init: (config?: PoolConfig | undefined): Promise<QueryResult> => {
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
                nickname TEXT,
                admin BOOL DEFAULT 'f'
            );`
        )
        .then(() => db.query(
            `CREATE TABLE IF NOT EXISTS pwtokens (
                pwtoken_id INT GENERATED ALWAYS AS IDENTITY,
                token TEXT NOT NULL UNIQUE,
                user_id INT NOT NULL,
                expires TIMESTAMP NOT NULL
            );`
        ))
    },
    getClient: (): Promise<PoolClient> => {
        if (pool) {
            return pool.connect()
        }
        return Promise.reject(new Error('Must init DB before using'))
    },
    query: (statement: any, client?: PoolClient): Promise<QueryResult> => {
        if (client && typeof client.query === 'function') {
            return client.query(statement)
        } else if (pool) {
            return pool.query(statement)
        }
        return Promise.reject(new Error('Must init DB before using'))
    },
    end: (): boolean => {
        if (pool !== undefined) {
            pool.end()
            pool = undefined
            return true
        }
        return false
    }
}

export default db