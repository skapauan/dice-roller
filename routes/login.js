const express = require('express')

const router = express.Router()

router.route('/')
.post((req, res, next) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true });
})

module.exports = router