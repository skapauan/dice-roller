import http from 'http'
import express from 'express'
import passport from 'passport'
import path from 'path'
import loginRoute from './routes/login'

const app = express()
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json())
app.use('/login', loginRoute)

const server = http.createServer(app)

export default server