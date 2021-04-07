import { PoolClient, QueryResult } from 'pg'
import { nanoid } from 'nanoid'
import DB from './db'

export interface TokenResult {
    pwtoken_id: number;
    token: string;
    user_id: number;
    expires: Date;
    expired: boolean;
}

export default class PwTokensTable {

    db: DB

    constructor(db: DB) {
        this.db = db
    }

    async create(user_id: number): Promise<string> {
        const token = nanoid()
        await this.db.query({
            text: `INSERT INTO pwtokens (token, user_id, expires) VALUES ($1, $2, now() + interval '3 hours');`,
            values: [token, user_id]
        })
        return token
    }
    
    findByToken(token: string, client?: PoolClient): Promise<TokenResult> {
        return this.db.query({
            text: 'SELECT *, expires < now() AS expired FROM pwtokens WHERE token = $1;',
            values: [token]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            } else {
                return null
            }
        })
    }

    deleteByToken(token: string, client?: PoolClient): Promise<boolean> {
        return this.db.query({
            text: 'DELETE FROM pwtokens WHERE token = $1;',
            values: [token]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            }
            return false
        })
    }

    async deleteExpired(client?: PoolClient): Promise<number> {
        return this.db.query('DELETE FROM pwtokens WHERE expires < now();', client)
        .then((result) => {
            return result.rowCount
        })
    }

    async deleteAll(client?: PoolClient): Promise<number> {
        return this.db.query('DELETE FROM pwtokens;', client)
        .then((result) => {
            return result.rowCount
        })
    }

}
