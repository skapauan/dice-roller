import request from 'supertest'
import express from 'express'
import format from 'pg-format'
import getRouter from './password'
import { testConfig, getTestSchema } from '../db/testconfig'
import DB from '../db/db'
import PwTokensTable from '../db/pwtokens'
import UsersTable from '../db/users'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)
const usersTable = new UsersTable(db)

const app = express()
app.use(express.json())
app.use('/', getRouter(db))

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Password service', () => {

    const expectFailBody = (res: {body: object}): void => {
        expect(res.body).toHaveProperty('success', false)
        expect(res.body).not.toHaveProperty('forceReset')
        expect(res.body).not.toHaveProperty('resetToken')
    }

    describe('before any users created', () => {

        beforeEach(async () => {
            await db.query(format('DELETE FROM %I.users;', schema))
        })

        it('creates initial admin user if token exists and is not expired', () => {
            const initialAdmin: string = (process.env.INITIAL_ADMIN || '').trim()
            if (!initialAdmin) {
                return Promise.reject(new Error('Please set environment variable INITIAL_ADMIN'))
            }
            const newPassword = 'my new password'
            return pwtokensTable.create(-999)
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, user: initialAdmin, newPassword })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', true)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).not.toBeNull()
                    if (!user) return false // make ts compiler happy
                    expect(user).toMatchObject({
                        email: initialAdmin,
                        nickname: 'Admin',
                        admin: true
                    })
                    return usersTable.checkPassword(newPassword, user)
                })
                .then((passwordMatches) => {
                    expect(passwordMatches).toEqual(true)
                })
            )
        })

        it('does not create initial admin user if token does not exist', () => {
            const initialAdmin: string = (process.env.INITIAL_ADMIN || '').trim()
            if (!initialAdmin) {
                return Promise.reject(new Error('Please set environment variable INITIAL_ADMIN'))
            }
            const token = 'oh yes a totally legit token right here'
            const newPassword = 'my new password'
            return pwtokensTable.deleteByToken(token)
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ token, user: initialAdmin, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })
        
        it('does not create initial admin user if token is expired', () => {
            const initialAdmin: string = (process.env.INITIAL_ADMIN || '').trim()
            if (!initialAdmin) {
                return Promise.reject(new Error('Please set environment variable INITIAL_ADMIN'))
            }
            const newPassword = 'my new password'
            const expires = new Date('October 31, 1998 23:11:00')
            let token: string
            return pwtokensTable.create(-999)
            .then((t) => {
                token = t
                return db.query({
                    text: format('UPDATE %I.pwtokens SET expires = $1 WHERE token = $2;', schema), 
                    values: [expires, token]
                })
            })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ token, user: initialAdmin, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

    })

})
