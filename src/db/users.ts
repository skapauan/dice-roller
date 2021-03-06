import argon2 from 'argon2'
import { PoolClient } from 'pg'
import format from 'pg-format'
import { cleanEmail } from '../string/string.js'
import DB from './db.js'

export interface UserCreate {
    email: string;
    nickname?: string;
    password?: string;
    admin?: boolean;
}

export interface UserUpdate {
    user_id: number;
    email?: string;
    nickname?: string | null;
    password?: string | null;
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
        return this.db.query(format(
            `SELECT CASE WHEN EXISTS (SELECT 1 FROM %I.users) THEN 0 ELSE 1 END AS isempty`,
            this.db.schema
        ), client)
        .then((result) => {
            if (result.rows[0] && result.rows[0].isempty === 1) {
                return true
            }
            return false
        })
    }
    
    findById(user_id: number, client?: PoolClient): Promise<UserResult | null> {
        return this.db.query({
            text: format('SELECT * FROM %I.users WHERE user_id = $1;', this.db.schema),
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
        const em = cleanEmail(email)
        if (!em) {
            return Promise.resolve(null)
        }
        return this.db.query({
            text: format('SELECT * FROM %I.users WHERE email = $1;', this.db.schema),
            values: [em]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            }
            return null
        })
    }

    deleteByEmail(email: string, client?: PoolClient): Promise<boolean> {
        const em = cleanEmail(email)
        if (!em) {
            return Promise.resolve(false)
        }
        return this.db.query({
            text: format('DELETE FROM %I.users WHERE email = $1;', this.db.schema),
            values: [em]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            }
            return false
        })
    }

    async create(user: UserCreate, client?: PoolClient): Promise<number> {
        let password
        const email = cleanEmail(user.email)
        if (!email) {
            return Promise.reject(new Error(this.errors.CREATE_EMAIL_INVALID))
        }
        const selectResult = await this.db.query({
            text: format(`SELECT CASE WHEN EXISTS (SELECT 1 FROM %I.users WHERE email = $1)
                THEN 1 ELSE 0 END AS emailfound`, this.db.schema),
            values: [email]
        }, client)
        if (selectResult.rows[0].emailfound === 1) {
            return Promise.reject(new Error(this.errors.CREATE_EMAIL_ALREADY_IN_USE))
        }
        if (typeof user.password === 'string') {
            password = await argon2.hash(user.password)
        }
        const insertResult = await this.db.query({
            text: format(`INSERT INTO %I.users (email, nickname, password, admin)
                VALUES ($1, $2, $3, $4) RETURNING user_id;`, this.db.schema),
            values: [email, user.nickname?.trim(), password, user.admin]
        }, client)
        return insertResult.rows[0].user_id
    }

    async update(user: UserUpdate, client?: PoolClient): Promise<UserResult | null> {
        if (!user || typeof user.user_id !== 'number') {
            // Cannot proceed without user_id
            return Promise.resolve(null)
        }
        // Construct query
        const values = []
        let text = 'UPDATE %I.users SET'
        let i = 1
        const email = cleanEmail(user.email)
        if (email) {
            values.push(email)
            text += ` email = $${i++},`
        }
        if ('nickname' in user) {
            if (typeof user.nickname === 'string') {
                values.push(user.nickname.trim())
                text += ` nickname = $${i++},`
            }
            if (user.nickname === null) {
                values.push(undefined)
                text += ` nickname = $${i++},`
            }
        }
        if ('password' in user) {
            if (typeof user.password === 'string') {
                values.push(await argon2.hash(user.password))
                text += ` password = $${i++},`
            }
            if (user.password === null) {
                values.push(undefined)
                text += ` password = $${i++},`
            }
        }
        if ('admin' in user && typeof user.admin === 'boolean') {
            values.push(user.admin)
            text += ` admin = $${i++},`
        }
        if (values.length === 0) {
            // No valid info given to update
            return Promise.resolve(null)
        }
        values.push(user.user_id)
        text = text.slice(0, -1) // remove last comma
        text += ` WHERE user_id = $${i} RETURNING *;`
        // Make query
        const result = await this.db.query({
            text: format(text, this.db.schema),
            values
        }, client)
        return result.rowCount === 0 ? null : { ...result.rows[0] }
    }

    async checkPassword(password: string, userData: UserResult | null): Promise<boolean> {
        if (!userData || typeof userData.password !== 'string') {
            return false
        }
        try {
            return await argon2.verify(userData.password, password)
        } catch (error) {
            return false
        }
    }

}
