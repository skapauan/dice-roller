import http from 'http'
import express from 'express'
import passport from 'passport'
import path from 'path'
import dbconnection from './dbconnection'
import loginRouter from './routes/login'
import passwordRouter from './routes/password'

const app = express()
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(express.json())
app.use('/login', loginRouter(dbconnection))
app.use('/password', passwordRouter(dbconnection))

const server = http.createServer(app)

export default server