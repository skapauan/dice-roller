import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { cleanEmail } from '../string/string.js'
import { jsonPreCheck, jsonCheck } from '../middleware/json.js'
import DB from '../db/db.js'
import UsersTable, { UserCreate } from '../db/users.js'
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
        const initialAdmin = cleanEmail(env.INITIAL_ADMIN)
        if (!initialAdmin) {
            res.statusCode = 500
            res.json({ success: false, error: PasswordErrors.MISSING_CONFIG } as PasswordResponseBody)
            return
        }
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
                email: initialAdmin,
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
        res.statusCode = 403
        res.json({ success: false, error: PasswordErrors.INCORRECT_TOKEN } as PasswordResponseBody)
        return
    })
    return router
}

export default getRouter
