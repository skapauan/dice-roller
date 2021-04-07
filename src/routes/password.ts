import express from 'express'
import bodyParser from 'body-parser'
import DB from '../db/db'
import UsersTable, { UserCreate } from '../db/users'

export const getRouter = (db: DB) => {
    const usersTable = new UsersTable(db)
    const router = express.Router()
    router.use(bodyParser.json())
    router.route('/')
    .post(async (req, res, next) => {
        const user: UserCreate = {
            email: req.body.user,
            nickname: 'Admin',
            password: req.body.newPassword,
            admin: true
        }
        await usersTable.create(user)
        res.setHeader('Content-Type', 'application/json')
        res.statusCode = 200
        res.json({ success: true })
    })
    return router
}

export default getRouter
