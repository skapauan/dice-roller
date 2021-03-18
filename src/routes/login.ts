import express, { Request } from 'express'
import bodyParser from 'body-parser'
import usersTable from '../db/users'
import pwtokensTable from '../db/pwtokens'

const router = express.Router()
router.use(bodyParser.json())

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

router.route('/')
.post(async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    const body = reqToLoginRequestBody(req)
    if (!body) {
        res.statusCode = 400
        res.json({ success: false } as LoginResponseBody)
    } else if (await usersTable.isEmpty()) {
        // No users in table
        if (!process.env.INITIAL_ADMIN || !process.env.INITIAL_PASSWORD) {
            if (process.env.NODE_ENV !== 'test') {
                console.log('Please set INITIAL_ADMIN and INITIAL_PASSWORD environmental variables to non-empty values.')
            }
            res.statusCode = 401
            res.json({ success: false } as LoginResponseBody)
        } else if (body.user === process.env.INITIAL_ADMIN && body.password === process.env.INITIAL_PASSWORD) {
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
        const user = await usersTable.findByEmail(body.user)
        if (user && user.password && body.password === user.password) {
            res.statusCode = 200
            res.json({ success: true } as LoginResponseBody)
        } else {
            res.statusCode = 401
            res.json({ success: false } as LoginResponseBody)
        }
    }
})

export default router