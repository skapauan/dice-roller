import emailValidator from 'email-validator'
import { PoolClient, QueryResult } from 'pg'
import db from './db'

interface User {
    email: string,
    nickname?: string,
    password?: string,
    hash?: string,
    admin: boolean
}

interface UserResult {
    user_id: number,
    email: string,
    nickname: string | null,
    password: string | null,
    hash: string | null,
    admin: boolean
}

const usersTable = {

    errors: {
        CREATE_EMAIL_MISSING: 'Email is missing',
        CREATE_EMAIL_INVALID: 'Email is invalid',
        CREATE_EMAIL_ALREADY_IN_USE: 'Email is already in use'
    },

    isEmpty: (client?: PoolClient): Promise<boolean> => {
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
    
    findByEmail: (email: string, client?: PoolClient): Promise<UserResult> => {
        return db.query({
            text: 'SELECT * FROM users WHERE email = $1;',
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

    create: async (user: User, client?: PoolClient): Promise<boolean> => {
        if (!user.email || typeof user.email !== 'string') {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_MISSING))
        }
        if (!emailValidator.validate(user.email)) {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_INVALID))
        }
        const email = user.email.trim()
        const result = await db.query({
            text: `SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = $1) THEN 1 ELSE 0 END AS emailfound`,
            values: [email]
        })
        if (result.rows[0].emailfound === 1) {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_ALREADY_IN_USE))
        }
        return db.query({
            text: `INSERT INTO users (email, nickname, password, hash, admin) VALUES ($1, $2, $3, $4, $5);`,
            values: [user.email, user.nickname, user.password, user.hash, user.admin]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            } else {
                // We should not reach here
                return false
            }
        })
        .catch((error) => {
            return false
        })
    }

}

export default usersTable