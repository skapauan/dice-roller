import { PoolClient, QueryResult } from 'pg'
import { nanoid } from 'nanoid'
import db from './db'

export interface TokenResult {
    pwtoken_id: number;
    token: string;
    user_id: number;
    expires: Date;
}

const pwtokensTable = {

    create: async (user_id: number): Promise<string> => {
        const token = nanoid()
        const expires = new Date()
        expires.setHours( expires.getHours() + 3 );
        await db.query({
            text: 'INSERT INTO pwtokens (token, user_id, expires) VALUES ($1, $2, $3);',
            values: [token, user_id, expires]
        })
        return token
    },
    
    findByToken: (token: string, client?: PoolClient): Promise<TokenResult> => {
        return db.query({
            text: 'SELECT * FROM pwtokens WHERE token = $1;',
            values: [token]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            } else {
                return null
            }
        })
    },

    deleteByToken: (token: string, client?: PoolClient): Promise<boolean> => {
        return db.query({
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

}

export default pwtokensTable