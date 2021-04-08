import http from 'http'
import express from 'express'
import passport from 'passport'
import path from 'path'
import DB from './db/db'
import loginRouter from './routes/login'
import passwordRouter from './routes/password'

export default (db: DB) => {
    const app = express()
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(express.static(path.join(__dirname, '..', 'public')))
    app.use(express.json())
    app.use('/login', loginRouter(db))
    app.use('/password', passwordRouter(db))
    return http.createServer(app)
}
