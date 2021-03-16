import express from 'express'
import bodyParser from 'body-parser'
import usersTable from '../db/users'

const router = express.Router()
router.use(bodyParser.json())

router.route('/')
.post(async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    if (await usersTable.isEmpty()) {
        if (req.body.user === process.env.INITIAL_ADMIN && req.body.password === process.env.INITIAL_PASSWORD) {
            res.statusCode = 200
            res.json({ success: true, forceReset: true, resetToken: 'a token' })
        } else {
            res.statusCode = 401
            res.json({ success: false })
        }
    } else {
        const user = await usersTable.findByEmail(req.body.user)
        if (user && req.body.password === user.password) {
            res.statusCode = 200
            res.json({ success: true })
        } else {
            res.statusCode = 401
            res.json({ success: false })
        }
    }
})

export default router