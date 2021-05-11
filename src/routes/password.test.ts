import request from 'supertest'
import express from 'express'
import format from 'pg-format'
import getRouter, { PasswordErrors } from './password'
import { jsonErrors } from '../middleware/json'
import { getDbMock, getQueryResult } from '../test/mock/db.test'
import { testConfig, getTestSchema } from '../test/config/db.test'
import DB from '../db/db'
import PwTokensTable from '../db/pwtokens'
import UsersTable from '../db/users'
import { QueryResult } from 'pg'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)
const usersTable = new UsersTable(db)
const initialAdmin = 'initial.admin@example.com'
const env = { INITIAL_ADMIN: initialAdmin }
const newPassword = 'my new password'

const app = express()
app.use('/', getRouter(db, env))

const expectFailBody = (res: {body: object}, err: string): void => {
    expect(res.body).toHaveProperty('success', false)
    expect(res.body).toHaveProperty('error', err)
}

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Password service', () => {

    describe('before any users created', () => {

        beforeEach(async () => {
            await db.query(format('DELETE FROM %I.users;', schema))
        })

        it('creates initial admin user if token exists and is not expired', () => {
            return pwtokensTable.create(-999)
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
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

        it('does not create initial admin user if request is missing the token', () => {
            return pwtokensTable.create(-999)
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ newPassword })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INVALID_FORMAT)
                    return usersTable.isEmpty()
                })
                .then((empty) => {
                    expect(empty).toEqual(true)
                })
            )
        })

        it('does not create initial admin user if token is not in DB', () => {
            const token = 'oh yes a totally legit token right here'
            return pwtokensTable.deleteByToken(token)
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return usersTable.isEmpty()
                })
                .then((empty) => {
                    expect(empty).toEqual(true)
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
                .send({ token, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.EXPIRED_TOKEN)
                    return usersTable.isEmpty()
                })
                .then((empty) => {
                    expect(empty).toEqual(true)
                })
            )
        })

        it('does not create initial admin user if INITIAL_ADMIN is not set', () => {
            const env2 = {}
            const app2 = express()
            app2.use('/', getRouter(db, env2))
            return pwtokensTable.create(-999)
            .then((token) => request(app2)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.MISSING_CONFIG)
                    return usersTable.isEmpty()
                })
                .then((empty) => {
                    expect(empty).toEqual(true)
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
                .send({ token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.MISSING_CONFIG)
                    return usersTable.isEmpty()
                })
                .then((empty) => {
                    expect(empty).toEqual(true)
                })
            )
        })

    })

    describe('after a user is created', () => {

        const adam = {
            email: 'adam@example.com',
            nickname: 'Adam',
            password: 'HelloWorld12',
            admin: true
        }

        let adamId = -999

        beforeAll(async () => {
            await db.query(format('DELETE FROM %I.pwtokens;', schema))
            await db.query(format('DELETE FROM %I.users;', schema))
            adamId = await usersTable.create(adam)
        })

        it(`makes no change if the token's user does not exist`, () => {
            return pwtokensTable.create(adamId - 1) // token for non-existent user
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                    return db.query(format('SELECT * FROM %I.users;', db.schema))
                })
                .then((result) => {
                    expect(result).toMatchObject({
                        rowCount: 1,
                        rows: [{
                            user_id: adamId,
                            email: adam.email,
                            admin: true
                        }]
                    })
                    return usersTable.checkPassword(adam.password, result.rows[0])
                })
                .then((pwMatches) => expect(pwMatches).toEqual(true))
            )
        })

        it(`changes an existing user's password`, () => {
            const coolNewPassword = 'ApplePie21'
            return pwtokensTable.create(adamId) // token for existing user
            .then((token) => request(app)
                .post('/')
                .type('application/json')
                .send({ token, newPassword: coolNewPassword })
                .expect(200)
                .expect('Content-Type', /json/)
            )
            .then(() => usersTable.findById(adamId))
            .then((user) => usersTable.checkPassword(coolNewPassword, user))
            .then((pwMatches) => expect(pwMatches).toEqual(true))
        })

    })

    describe('handles DB exceptions', () => {
        const getApp = (results: QueryResult[]) => {
            const DBMock = getDbMock(results)
            const db2 = new DBMock(testConfig, schema)
            const app2 = express()
            app2.use('/', getRouter(db2, env))
            return app2
        }
        const findByTokenResult = getQueryResult([{
            pwtoken_id: 0,
            token: 'mock token',
            user_id: 123,
            expires: new Date().setTime(Date.now() + 1000*60*60)
        }])
        const isEmptyTrueResult = getQueryResult([{ isempty: 1 }])
        const isEmptyFalseResult = getQueryResult([{ isempty: 0 }])
        const findByIdResult = getQueryResult([{
            user_id: 123,
            email: 'loki@example.com',
            nickname: 'Loki',
            password: null,
            admin: false
        }])
        const updateFailResult = getQueryResult([])

        it('from pwtokensTable.findByToken()', () => {
            const app2 = getApp([])
            return pwtokensTable.create(-999)
            .then((token) => request(app2)
                .post('/')
                .type('application/json')
                .send({ token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INTERNAL)
                })
            )
        })

        it('from usersTable.isEmpty()', () => {
            const app2 = getApp([ findByTokenResult ])
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ token: findByTokenResult.rows[0].token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INTERNAL)
                })
        })

        it('from usersTable.create()', () => {
            const app2 = getApp([ findByTokenResult, isEmptyTrueResult ])
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ token: findByTokenResult.rows[0].token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INTERNAL)
                })
        })

        it('from usersTable.findById()', () => {
            const app2 = getApp([ findByTokenResult, isEmptyFalseResult ])
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ token: findByTokenResult.rows[0].token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INTERNAL)
                })
        })

        it('from usersTable.update()', () => {
            const app2 = getApp([ findByTokenResult, isEmptyFalseResult, findByIdResult ])
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ token: findByTokenResult.rows[0].token, newPassword })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INTERNAL)
                })
        })

        it('handles user disappearing between usersTable.findById() and usersTable.update()', () => {
            const app2 = getApp([ findByTokenResult, isEmptyFalseResult,
                findByIdResult, updateFailResult ])
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ token: findByTokenResult.rows[0].token, newPassword })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailBody(res, PasswordErrors.INCORRECT_TOKEN)
                })
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
