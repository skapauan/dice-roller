import express, { Request } from 'express'
import bodyParser from 'body-parser'
import DB from '../db/db.js'
import UsersTable from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'

export interface LoginRequestBody {
    user: string;
    password: string;
}

export interface LoginResponseBody {
    success: boolean;
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
    router.use(bodyParser.json())
    router.route('/')
    .post(async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json')
        const body = reqToLoginRequestBody(req)
        if (!body) {
            res.statusCode = 400
            res.json({ success: false } as LoginResponseBody)
        } else if (await usersTable.isEmpty()) {
            // No users in table
            if (!env.INITIAL_ADMIN || !env.INITIAL_PASSWORD) {
                res.statusCode = 401
                res.json({ success: false } as LoginResponseBody)
            } else if (body.user === env.INITIAL_ADMIN && body.password === env.INITIAL_PASSWORD) {
                await pwtokensTable.deleteAll()
                const resetToken = await pwtokensTable.create(-1)
                res.statusCode = 200
                res.json({ success: true, forceReset: true, resetToken } as LoginResponseBody)
            } else {
                res.statusCode = 401
                res.json({ success: false } as LoginResponseBody)
            }
        } else {
            // One or more users in table
            const userData = await usersTable.findByEmail(body.user)
            if (!userData || typeof userData.password !== 'string') {
                res.statusCode = 401
                res.json({ success: false } as LoginResponseBody)
            } else if (await usersTable.checkPassword(body.password, userData)) {
                res.statusCode = 200
                res.json({ success: true } as LoginResponseBody)
            } else {
                res.statusCode = 401
                res.json({ success: false } as LoginResponseBody)
            }
        }
    })
    return router
}

export default getRouter
