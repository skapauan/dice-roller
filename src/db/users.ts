import emailValidator from 'email-validator'
import { PoolClient, QueryResult } from 'pg'
import db from './db'

export interface User {
    email: string;
    nickname?: string;
    password?: string;
    hash?: string;
    admin?: boolean;
}

export interface UserResult {
    user_id: number;
    email: string;
    nickname: string | null;
    password: string | null;
    hash: string | null;
    admin: boolean;
}

const usersTable = {

    errors: {
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
    
    findById: (user_id: number, client?: PoolClient): Promise<UserResult | null> => {
        return db.query({
            text: 'SELECT * FROM users WHERE user_id = $1;',
            values: [user_id]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            }
            return null
        })
    },
    
    findByEmail: (email: string, client?: PoolClient): Promise<UserResult | null> => {
        return db.query({
            text: 'SELECT * FROM users WHERE email = $1;',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            }
            return null
        })
    },

    deleteByEmail: (email: string, client?: PoolClient): Promise<boolean> => {
        return db.query({
            text: 'DELETE FROM users WHERE email = $1;',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            }
            return false
        })
    },

    create: async (user: User, client?: PoolClient): Promise<boolean> => {
        if (!emailValidator.validate(user.email)) {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_INVALID))
        }
        const email = user.email.trim()
        const result = await db.query({
            text: `SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = $1) THEN 1 ELSE 0 END AS emailfound`,
            values: [email]
        }, client)
        if (result.rows[0].emailfound === 1) {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_ALREADY_IN_USE))
        }
        await db.query({
            text: `INSERT INTO users (email, nickname, password, hash, admin) VALUES ($1, $2, $3, $4, $5);`,
            values: [user.email, user.nickname, user.password, user.hash, user.admin]
        }, client)
        return true
    }

}

export default usersTable