import express from 'express'
import bodyParser from 'body-parser'
import DB from '../db/db.js'
import UsersTable, { UserCreate } from '../db/users.js'
import PwTokensTable from '../db/pwtokens.js'

export const getRouter = (db: DB, env: NodeJS.ProcessEnv) => {
    const usersTable = new UsersTable(db)
    const pwtokensTable = new PwTokensTable(db)
    const router = express.Router()
    router.use(bodyParser.json())
    router.route('/')
    .post(async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json')
        const token = await pwtokensTable.findByToken(req.body.token)
        if (token && !token.expired && req.body.user === env.INITIAL_ADMIN) {
            const user: UserCreate = {
                email: req.body.user,
                nickname: 'Admin',
                password: req.body.newPassword,
                admin: true
            }
            await usersTable.create(user)
            res.statusCode = 200
            res.json({ success: true })
        } else {
            res.statusCode = 403
            res.json({ success: false })
        }
    })
    return router
}

export default getRouter
