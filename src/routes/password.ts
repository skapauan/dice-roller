import express from 'express'
import bodyParser from 'body-parser'
import DB from '../db/db.js'
import UsersTable, { UserCreate } from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'
import { cleanEmail, stringOrNothing } from '../string/string.js'

export interface PasswordRequestBody {
    token: string;
    user: string;
    newPassword: string;
}

export interface PasswordResponseBody {
    success: boolean;
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
    router.use(bodyParser.json())
    router.route('/')
    .post(async (req, res, next) => {
        const body = reqToRequestBody(req)
        if (!body) {
            res.statusCode = 400
            res.json({ success: false } as PasswordResponseBody)
            return
        }
        if (body.user === cleanEmail(env.INITIAL_ADMIN)) {
            const token = await pwtokensTable.findByToken(body.token)
            if (token && !token.expired) {
                const user: UserCreate = {
                    email: body.user,
                    nickname: 'Admin',
                    password: req.body.newPassword,
                    admin: true
                }
                await usersTable.create(user)
                res.statusCode = 200
                res.json({ success: true } as PasswordResponseBody)
                return
            }
        }
        res.statusCode = 403
        res.json({ success: false } as PasswordResponseBody)
        return
    })
    return router
}

export default getRouter
