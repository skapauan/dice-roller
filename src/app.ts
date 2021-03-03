const express = require('express')
const passport = require('passport')
const path = require('path')

const app = express()
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json())
app.use('/login', require('./routes/login'))

module.exports = app