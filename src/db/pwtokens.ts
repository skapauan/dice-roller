import { PoolClient } from 'pg'
import format from 'pg-format'
import { nanoid } from 'nanoid'
import DB from './db.js'

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
            text: format(
                `INSERT INTO %I.pwtokens (token, user_id, expires)
                    VALUES ($1, $2, now() + interval '3 hours');`,
                this.db.schema),
            values: [token, user_id]
        })
        return token
    }
    
    findByToken(token: string, client?: PoolClient): Promise<TokenResult> {
        return this.db.query({
            text: format(
                'SELECT *, expires < now() AS expired FROM %I.pwtokens WHERE token = $1;',
                this.db.schema),
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
            text: format('DELETE FROM %I.pwtokens WHERE token = $1;', this.db.schema),
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
        return this.db.query(
            format('DELETE FROM %I.pwtokens WHERE expires < now();', this.db.schema),
            client)
        .then((result) => {
            return result.rowCount
        })
    }

    async deleteAll(client?: PoolClient): Promise<number> {
        return this.db.query(
            format('DELETE FROM %I.pwtokens;', this.db.schema),
            client)
        .then((result) => {
            return result.rowCount
        })
    }

}
