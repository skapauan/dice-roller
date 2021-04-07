import argon2 from 'argon2'
import emailValidator from 'email-validator'
import { PoolClient, QueryResult } from 'pg'
import DB from './db'

export interface UserCreate {
    email: string;
    nickname?: string;
    password?: string;
    admin?: boolean;
}

export interface UserResult {
    user_id: number;
    email: string;
    nickname: string | null;
    password: string | null;
    admin: boolean;
}

export default class UsersTable {

    errors = {
        CREATE_EMAIL_INVALID: 'Email is invalid',
        CREATE_EMAIL_ALREADY_IN_USE: 'Email is already in use'
    }

    db: DB

    constructor(db: DB) {
        this.db = db
    }

    isEmpty(client?: PoolClient): Promise<boolean> {
        return this.db.query(
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
    }
    
    findById(user_id: number, client?: PoolClient): Promise<UserResult | null> {
        return this.db.query({
            text: 'SELECT * FROM users WHERE user_id = $1;',
            values: [user_id]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            }
            return null
        })
    }
    
    findByEmail(email: string, client?: PoolClient): Promise<UserResult | null> {
        return this.db.query({
            text: 'SELECT * FROM users WHERE email = $1;',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            }
            return null
        })
    }

    deleteByEmail(email: string, client?: PoolClient): Promise<boolean> {
        return this.db.query({
            text: 'DELETE FROM users WHERE email = $1;',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            }
            return false
        })
    }

    async create(user: UserCreate, client?: PoolClient): Promise<number> {
        if (!emailValidator.validate(user.email)) {
            return Promise.reject(new Error(this.errors.CREATE_EMAIL_INVALID))
        }
        let password
        const email = user.email.trim()
        const selectResult = await this.db.query({
            text: `SELECT CASE WHEN EXISTS (SELECT 1 FROM users WHERE email = $1) THEN 1 ELSE 0 END AS emailfound`,
            values: [email]
        }, client)
        if (selectResult.rows[0].emailfound === 1) {
            return Promise.reject(new Error(this.errors.CREATE_EMAIL_ALREADY_IN_USE))
        }
        if (typeof user.password === 'string') {
            password = await argon2.hash(user.password)
        }
        const insertResult = await this.db.query({
            text: `INSERT INTO users (email, nickname, password, admin) VALUES ($1, $2, $3, $4) RETURNING user_id;`,
            values: [email, user.nickname?.trim(), password, user.admin]
        }, client)
        return insertResult.rows[0].user_id
    }

    async checkPassword(password: string, userData: UserResult): Promise<boolean> {
        if (typeof userData.password !== 'string') {
            return false
        }
        try {
            return await argon2.verify(userData.password, password)
        } catch (error) {
            return false
        }
    }

}
