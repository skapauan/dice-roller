import express from 'express'
import bodyParser from 'body-parser'
import DB from '../db/db'
import UsersTable, { UserCreate } from '../db/users'
import PwTokensTable from '../db/pwtokens'

export const getRouter = (db: DB) => {
    const usersTable = new UsersTable(db)
    const pwtokensTable = new PwTokensTable(db)
    const router = express.Router()
    router.use(bodyParser.json())
    router.route('/')
    .post(async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json')
        const token = await pwtokensTable.findByToken(req.body.token)
        if (token) {
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
