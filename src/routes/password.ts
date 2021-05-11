import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { cleanEmail } from '../string/string.js'
import { jsonPreCheck, jsonCheck } from '../middleware/json.js'
import DB from '../db/db.js'
import UsersTable, { UserCreate, UserUpdate } from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'

export interface PasswordRequestBody {
    token: string;
    newPassword: string;
}

export interface PasswordResponseBody {
    success: boolean;
    error?: string;
}

export const PasswordErrors: {[key: string]: string} = {
    INVALID_FORMAT: 'Request data had invalid format',
    INCORRECT_TOKEN: 'Token was incorrect',
    EXPIRED_TOKEN: 'Token was expired',
    MISSING_CONFIG: 'Server configuration was missing or invalid',
    INTERNAL: 'Server had a problem, please try again'
}

const reqToRequestBody = (req: any): PasswordRequestBody | null => {
    const body = req.body as any
    if (!body || typeof body.newPassword !== 'string' || typeof body.token !== 'string') {
        return null
    }
    return {
        token: body.token,
        newPassword: body.newPassword
    }
}

const respondInternalError = (res: Response): void => {
    res.statusCode = 500
    res.json({ success: false, error: PasswordErrors.INTERNAL } as PasswordResponseBody)
}

export const getRouter = (db: DB, env: NodeJS.ProcessEnv) => {
    const usersTable = new UsersTable(db)
    const pwtokensTable = new PwTokensTable(db)
    const router = express.Router()
    router.route('/')
    .post(jsonPreCheck, bodyParser.json(), jsonCheck,
            async (req: Request, res: Response, next: NextFunction) => {
        // Verify request format
        const body = reqToRequestBody(req)
        if (!body) {
            res.statusCode = 400
            res.json({ success: false, error: PasswordErrors.INVALID_FORMAT } as PasswordResponseBody)
            return
        }
        // Verify token
        let token
        try {
            token = await pwtokensTable.findByToken(body.token)
        } catch (e) {
            respondInternalError(res)
            return
        }
        if (!token) {
            res.statusCode = 403
            res.json({ success: false, error: PasswordErrors.INCORRECT_TOKEN } as PasswordResponseBody)
            return
        }
        if (token.expired) {
            res.statusCode = 403
            res.json({ success: false, error: PasswordErrors.EXPIRED_TOKEN } as PasswordResponseBody)
            return
        }
        // Create admin user if users table is empty
        let noUsers
        try {
            noUsers = await usersTable.isEmpty()
        } catch (e) {
            respondInternalError(res)
            return
        }
        if (noUsers) {
            const email = cleanEmail(env.INITIAL_ADMIN)
            if (!email) {
                res.statusCode = 500
                res.json({ success: false, error: PasswordErrors.MISSING_CONFIG } as PasswordResponseBody)
                return
            }
            const admin: UserCreate = {
                email,
                nickname: 'Admin',
                password: body.newPassword,
                admin: true
            }
            try {
                await usersTable.create(admin)
            } catch (e) {
                respondInternalError(res)
                return
            }
            res.statusCode = 200
            res.json({ success: true } as PasswordResponseBody)
            return
        }
        // Update password for existing user
        let user
        try {
            user = await usersTable.findById(token.user_id)
        } catch (e) {
            respondInternalError(res)
            return
        }
        if (user) {
            const update: UserUpdate = {
                user_id: token.user_id,
                password: body.newPassword 
            }
            let updateResult
            try {
                updateResult = await usersTable.update(update)
            } catch (e) {
                respondInternalError(res)
                return
            }
            if (updateResult) {
                res.statusCode = 200
                res.json({ success: true } as PasswordResponseBody)
                return
            }
        }
        res.statusCode = 403
        res.json({ success: false, error: PasswordErrors.INCORRECT_TOKEN } as PasswordResponseBody)
    })

    return router
}

export default getRouter
