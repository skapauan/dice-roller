import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg'

export default class DB {
    
    private pool: Pool | undefined
    readonly config: PoolConfig | undefined

    constructor(config?: PoolConfig) {
        // If no config provided, pg will get it from environment variables
        if (config) {
            this.config = { ...config }
        }
    }

    isInit(): boolean {
        return !!this.pool
    }

    async init(): Promise<void> {
        if (!this.pool) {
            this.pool = new Pool(this.config)
        }
        const createUsersTable = this.query(
            `CREATE TABLE IF NOT EXISTS users (
                user_id INT GENERATED ALWAYS AS IDENTITY,
                email VARCHAR(320) NOT NULL UNIQUE,
                password TEXT,
                nickname TEXT,
                admin BOOL DEFAULT 'f'
            );`
        )
        const createPwTokensTable = this.query(
            `CREATE TABLE IF NOT EXISTS pwtokens (
                pwtoken_id INT GENERATED ALWAYS AS IDENTITY,
                token TEXT NOT NULL UNIQUE,
                user_id INT NOT NULL,
                expires TIMESTAMP NOT NULL
            );`
        )
        await createUsersTable
        await createPwTokensTable
    }
    
    getClient(): Promise<PoolClient> {
        if (this.pool) {
            return this.pool.connect()
        }
        return Promise.reject(new Error('Must init DB before using'))
    }

    query(statement: any, client?: PoolClient): Promise<QueryResult> {
        if (client && typeof client.query === 'function') {
            return client.query(statement)
        } else if (this.pool) {
            return this.pool.query(statement)
        }
        return Promise.reject(new Error('Must init DB before using'))
    }

    end(config?: string): boolean {
        if (this.pool) {
            this.pool.end()
            this.pool = undefined
            return true
        }
        return false
    }

}
