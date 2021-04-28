import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import { cleanEmail } from '../string/string.js'
import { jsonPreCheck, jsonCheck } from '../middleware/json.js'
import DB from '../db/db.js'
import UsersTable from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'

export interface LoginRequestBody {
    user: string;
    password: string;
}

export interface LoginResponseBody {
    success: boolean;
    error?: string;
    forceReset?: boolean;
    resetToken?: string;
}

const reqToLoginRequestBody = (req: Request): LoginRequestBody | null => {
    const body = req.body as any
    if (!body || typeof body.user !== 'string' || typeof body.password !== 'string') {
        return null
    }
    return {
        user: body.user,
        password: body.password
    }
}

const getRouter = (db: DB, env: NodeJS.ProcessEnv) => {
    const usersTable = new UsersTable(db)
    const pwtokensTable = new PwTokensTable(db)

    const router = express.Router()
    router.route('/')
    .post(jsonPreCheck, bodyParser.json(), jsonCheck,
            async (req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Content-Type', 'application/json')
        const body = reqToLoginRequestBody(req)
        if (!body) {
            // Invalid request
            res.statusCode = 400
            res.json({ success: false } as LoginResponseBody)
            return
        } else if (await usersTable.isEmpty()) {
            // No users in table, so check against INITIAL_ADMIN
            if (env.INITIAL_PASSWORD && body.password === env.INITIAL_PASSWORD) {
                const initAdmin = cleanEmail(env.INITIAL_ADMIN)
                if (initAdmin && cleanEmail(body.user) === initAdmin) {
                    await pwtokensTable.deleteAll()
                    const resetToken = await pwtokensTable.create(-1)
                    res.statusCode = 200
                    res.json({ success: true, forceReset: true, resetToken } as LoginResponseBody)
                    return
                }
            }
        } else {
            // Check against users in table
            const userData = await usersTable.findByEmail(body.user)
            if (userData && typeof userData.password === 'string'
                    && await usersTable.checkPassword(body.password, userData)) {
                res.statusCode = 200
                res.json({ success: true } as LoginResponseBody)
                return
            }
        }
        // Unauthorized
        res.statusCode = 401
        res.json({ success: false } as LoginResponseBody)
        return
    })

    return router
}

export default getRouter
