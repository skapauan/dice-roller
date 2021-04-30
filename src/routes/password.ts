import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { cleanEmail } from '../string/string.js'
import { jsonPreCheck, jsonCheck } from '../middleware/json.js'
import DB from '../db/db.js'
import UsersTable, { UserCreate } from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'

export interface PasswordRequestBody {
    token: string;
    user: string;
    newPassword: string;
}

export interface PasswordResponseBody {
    success: boolean;
    error?: string;
}

export const PasswordErrors: {[key: string]: string} = {
    INVALID_FORMAT: 'Request data had invalid format',
    INCORRECT_TOKEN: 'Token or user was incorrect',
    EXPIRED_TOKEN: 'Token was expired',
    INTERNAL: 'Server had a problem, please try again'
}

const reqToRequestBody = (req: any): PasswordRequestBody | null => {
    const body = req.body as any
    if (!body || typeof body.newPassword !== 'string' || typeof body.token !== 'string') {
        return null
    }
    const user = cleanEmail(body.user)
    if (!user) {
        return null
    }
    return {
        token: body.token,
        user,
        newPassword: body.newPassword
    }
}

export const getRouter = (db: DB, env: NodeJS.ProcessEnv) => {
    const usersTable = new UsersTable(db)
    const pwtokensTable = new PwTokensTable(db)
    const router = express.Router()
    router.route('/')
    .post(jsonPreCheck, bodyParser.json(), jsonCheck,
            async (req: Request, res: Response, next: NextFunction) => {
        const body = reqToRequestBody(req)
        if (!body) {
            res.statusCode = 400
            res.json({ success: false, error: PasswordErrors.INVALID_FORMAT } as PasswordResponseBody)
            return
        }
        if (body.user === cleanEmail(env.INITIAL_ADMIN)) {
            let token
            try {
                token = await pwtokensTable.findByToken(body.token)
            } catch (e) {
                res.statusCode = 500
                res.json({ success: false, error: PasswordErrors.INTERNAL } as PasswordResponseBody)
                return
            }
            if (token) {
                if (token.expired) {
                    res.statusCode = 403
                    res.json({ success: false, error: PasswordErrors.EXPIRED_TOKEN } as PasswordResponseBody)
                    return
                }
                const user: UserCreate = {
                    email: body.user,
                    nickname: 'Admin',
                    password: req.body.newPassword,
                    admin: true
                }
                try {
                    await usersTable.create(user)
                } catch (e) {
                    res.statusCode = 500
                    res.json({ success: false, error: PasswordErrors.INTERNAL } as PasswordResponseBody)
                    return
                }
                res.statusCode = 200
                res.json({ success: true } as PasswordResponseBody)
                return
            }
        }
        res.statusCode = 403
        res.json({ success: false, error: PasswordErrors.INCORRECT_TOKEN } as PasswordResponseBody)
        return
    })
    return router
}

export default getRouter
