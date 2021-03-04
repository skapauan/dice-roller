import { PoolClient, QueryResult } from 'pg'
import db from './db'

const pwtokensTable = {
    
    findByToken: (token: string, client?: PoolClient): Promise<QueryResult> => {
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