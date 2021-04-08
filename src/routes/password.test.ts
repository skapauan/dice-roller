import request from 'supertest'
import express from 'express'
import getRouter from './password'
import { testConfig } from '../db/testconfig'
import DB from '../db/db'
import UsersTable from '../db/users'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const db = new DB(testConfig)
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
            await db.query('DELETE FROM users;')
        })

        it('creates an initial admin user if token is valid and user is INITIAL_ADMIN', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ token: 'a token', user: process.env.INITIAL_ADMIN, newPassword: 'my new password' })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', true)
                    expect(typeof process.env.INITIAL_ADMIN).toEqual('string')
                    if (!process.env.INITIAL_ADMIN) return null // make ts compiler happy
                    return usersTable.findByEmail(process.env.INITIAL_ADMIN)
                })
                .then((user) => {
                    expect(user).not.toBeNull()
                    if (!user) return false // make ts compiler happy
                    expect(user).toMatchObject({
                        email: process.env.INITIAL_ADMIN,
                        nickname: 'Admin',
                        admin: true
                    })
                    return usersTable.checkPassword('my new password', user)
                })
                .then((passwordMatches) => {
                    expect(passwordMatches).toEqual(true)
                })
        })

    })

})
