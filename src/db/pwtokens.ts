import { PoolClient, QueryResult } from 'pg'
import db from './db'

export interface TokenCreate {
    email: string;
}

export interface TokenResult {
    token: string;
    email: string;
    expires: Date;
}

const pwtokensTable = {

    create: (data: TokenCreate): string => {
        const token = 'a'
        const expires = new Date()
        expires.setHours( expires.getHours() + 3 );
        db.query({
            text: 'INSERT INTO pwtokens (token, email, expires) VALUES ($1, $2, $3);',
            values: [token, data.email, expires]
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
    }

}

export default pwtokensTable