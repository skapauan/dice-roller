import request from 'supertest'
import express from 'express'
import format from 'pg-format'
import getRouter, { PasswordErrors } from './password'
import { jsonErrors } from '../middleware/json'
import { testConfig, getTestSchema } from '../test/config/db.test'
import DB from '../db/db'
import PwTokensTable from '../db/pwtokens'
import UsersTable from '../db/users'
import { cleanEmail } from '../string/string'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)
const usersTable = new UsersTable(db)
const initialAdmin = 'initial.admin@example.com'
const env = { INITIAL_ADMIN: initialAdmin }
const newPassword = 'my new password'

const app = express()
app.use('/', getRouter(db, env))

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Password service', () => {

    const expectFailBody = (res: {body: object}, err: string): void => {
        expect(res.body).toHaveProperty('success', false)
        expect(res.body).toHaveProperty('error', err)
    }

    describe('before any users created', () => {

        beforeEach(async () => {
            await db.query(format('DELETE FROM %I.users;', schema))
        })

        it('creates initial admin user if token exists and is not expired, and user is valid email INITIAL_ADMIN', () => {
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

        it('creates initial admin user if email is equivalent to INITIAL_ADMIN', () => {
            const env2 = { INITIAL_ADMIN: '  Ada.Lovelace+home@googlemail.com' }
            const cleanAdmin = cleanEmail(env2.INITIAL_ADMIN) || ''
            const equivAdmin = 'adalovelace+office@gmail.com \t '
            expect(cleanEmail(equivAdmin)).toEqual(cleanAdmin)

            const app2 = express()
            app2.use('/', getRouter(db, env2))

            return pwtokensTable.create(-999)
            .then((token) => request(app2)
                .post('/')
                .type('application/json')
                .send({ token, user: equivAdmin, newPassword })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', true)
                    return usersTable.findByEmail(cleanAdmin)
                })
                .then((user) => {
                    expect(user).not.toBeNull()
                    if (!user) return false // make ts compiler happy
                    expect(user).toMatchObject({
                        email: cleanAdmin,
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

        it('does not create initial admin user if request is missing the token', () => {
            return pwtokensTable.create(-999)
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ user: initialAdmin, newPassword })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INVALID_FORMAT)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

        it('does not create initial admin user if token is not in DB', () => {
            const token = 'oh yes a totally legit token right here'
            return pwtokensTable.deleteByToken(token)
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ token, user: initialAdmin, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })
        
        it('does not create initial admin user if token is expired', () => {
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
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

        it('does not create initial admin user if request is missing the user', () => {
            return pwtokensTable.create(-999)
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INVALID_FORMAT)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

        it('does not create initial admin user if user is not INITIAL_ADMIN', () => {
            const notAdminUser = 'NotAdmin@example.com'
            return pwtokensTable.create(-999)
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, user: notAdminUser, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return usersTable.findByEmail(initialAdmin)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
                .then(() => {
                    return usersTable.findByEmail(notAdminUser)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

        it('does not create initial admin user if INITIAL_ADMIN is not set', () => {
            const email = 'some.email@example.com'
            const env2 = {}
            const app2 = express()
            app2.use('/', getRouter(db, env2))
            return pwtokensTable.create(-999)
            .then((token) => request(app2)
                .post('/')
                .type('application/json')
                .send({ token, user: email, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return usersTable.findByEmail(email)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

        it('does not create initial admin user if INITIAL_ADMIN is not a valid email', () => {
            const env2 = { INITIAL_ADMIN: 'a poor choice of email' }
            const app2 = express()
            app2.use('/', getRouter(db, env2))
            return pwtokensTable.create(-999)
            .then((token) => request(app2)
                .post('/')
                .type('application/json')
                .send({ token, user: env2.INITIAL_ADMIN, newPassword })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INVALID_FORMAT)
                    return usersTable.findByEmail(env2.INITIAL_ADMIN)
                })
                .then((user) => {
                    expect(user).toBeNull()
                })
            )
        })

    })

    describe('uses middleware to enforce valid json requests', () => {

        it('responds with 400 and related error message if content type is not json', () => {
            return request(app)
                .post('/')
                .type('text/plain')
                .send('{"grapes":12}')
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body.success).toEqual(false)
                    expect(res.body.error).toEqual(jsonErrors['notJson'])
                })
        })

        it('responds with 400 and related error message if json is invalid', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send('{"invalid"}')
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body.success).toEqual(false)
                    expect(res.body.error).toEqual(jsonErrors['entity.parse.failed'])
                })
        })

    })

})
