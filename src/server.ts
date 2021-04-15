import http from 'http'
import express from 'express'
import passport from 'passport'
import DB from './db/db.js'
import loginRouter from './routes/login.js'
import passwordRouter from './routes/password.js'

export default (db: DB, staticFilePath: string) => {
    const app = express()
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(express.static(staticFilePath))
    app.use(express.json())
    app.use('/login', loginRouter(db))
    app.use('/password', passwordRouter(db))
    return http.createServer(app)
}
