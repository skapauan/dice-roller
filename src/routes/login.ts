import express from 'express'
import bodyParser from 'body-parser'

const router = express.Router()
router.use(bodyParser.json())

router.route('/')
.post((req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    if (req.body.user === process.env.INITIAL_ADMIN && req.body.password === process.env.INITIAL_PASSWORD) {
        res.statusCode = 200
        res.json({ success: true, forceReset: true, resetToken: 'a token' })
    } else {
        res.statusCode = 401
        res.json({ success: false })
    }
})

export default router