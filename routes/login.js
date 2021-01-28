const express = require('express')
const bodyParser = require('body-parser')

const router = express.Router()
router.use(bodyParser.json())

router.route('/')
.post((req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    if (req.body.user === process.env.INITIAL_ADMIN) {
        res.statusCode = 200
        res.json({ success: true })
    } else {
        res.statusCode = 401
        res.json({ success: false })
    }
})

module.exports = router