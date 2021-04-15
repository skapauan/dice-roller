import pg, { Pool, PoolClient, PoolConfig, QueryResult } from 'pg'
import format from 'pg-format'

export default class DB {
    
    private pool: Pool | undefined
    readonly config: PoolConfig | undefined
    readonly schema: string = 'public'

    constructor(config?: PoolConfig, schema?: string) {
        if (config) {
            this.config = { ...config }
        }
        const schemaClean = schema?.trim().toLowerCase()
        this.schema = schemaClean ? schemaClean : 'public'
    }

    isInit(): boolean {
        return !!this.pool
    }

    async init(): Promise<void> {
        if (!this.pool) {
            this.pool = new pg.Pool(this.config)
        }
        if (this.schema !== 'public') {
            await this.query(format(
                `CREATE SCHEMA IF NOT EXISTS %I;`,
                this.schema
            )) 
        }
        const createUsersTable = this.query(format(
            `CREATE TABLE IF NOT EXISTS %I.users (
                user_id INT GENERATED ALWAYS AS IDENTITY,
                email VARCHAR(320) NOT NULL UNIQUE,
                password TEXT,
                nickname TEXT,
                admin BOOL DEFAULT 'f'
            );`,
            this.schema
        ))
        const createPwTokensTable = this.query(format(
            `CREATE TABLE IF NOT EXISTS %I.pwtokens (
                pwtoken_id INT GENERATED ALWAYS AS IDENTITY,
                token TEXT NOT NULL UNIQUE,
                user_id INT NOT NULL,
                expires TIMESTAMP NOT NULL
            );`,
            this.schema
        ))
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

    end(): boolean {
        if (this.pool) {
            this.pool.end()
            this.pool = undefined
            return true
        }
        return false
    }

}
