import request from 'supertest'
import express from 'express'
import format from 'pg-format'
import getRouter, { LoginResponseBody, LoginErrors } from './login'
import { cleanEmail } from '../string/string'
import { jsonErrors } from '../middleware/json'
import { testConfig, getTestSchema } from '../test/config/db.test'
import DB from '../db/db'
import PwTokensTable from '../db/pwtokens'
import UsersTable from '../db/users'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)
const usersTable = new UsersTable(db)
const env = { INITIAL_ADMIN: 'mister.cool@example.com', INITIAL_PASSWORD: 'a super witty password'}

const app = express()
app.use('/', getRouter(db, env))

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Login service', () => {

    const expectFailedLoginBody = (res: {body: LoginResponseBody}, err: string): void => {
        expect(res.body).toHaveProperty('success', false)
        expect(res.body).toHaveProperty('error', err)
        expect(res.body).not.toHaveProperty('forceReset')
        expect(res.body).not.toHaveProperty('resetToken')
    }

    const expectSuccessLoginBody = (res: {body: LoginResponseBody}, forceReset?: boolean): void => {
        expect(res.body).toHaveProperty('success', true)
        expect(res.body).not.toHaveProperty('error')
        if (forceReset) {
            expect(res.body).toHaveProperty('forceReset', true)
            expect(res.body).toHaveProperty('resetToken')
            if (!res.body.resetToken) return // make ts compiler happy
            expect(typeof res.body.resetToken).toEqual('string')
            expect(res.body.resetToken.length).toBeGreaterThan(0)
        } else {
            expect(res.body).not.toHaveProperty('forceReset')
            expect(res.body).not.toHaveProperty('resetToken')
        }
    }

    describe('before any users created', () => {

        beforeEach(async () => {
            await db.query(format('DELETE FROM %I.users;', schema))
        })

        it('should accept login using INITIAL_ADMIN and INITIAL_PASSWORD and force a password reset',
        () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: env.INITIAL_ADMIN, password: env.INITIAL_PASSWORD })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    // Response indicates successful login and force password reset
                    expectSuccessLoginBody(res, true)
                    // Check that token exists in table
                    return pwtokensTable.findByToken(res.body.resetToken)
                })
                .then((tokenData) => {
                    expect(tokenData).not.toBeNull()
                })
        })

        it('should similarly accept login if email is equivalent to INITIAL_ADMIN',
        () => {
            const equivEmail = 'Mister.Cool@example.com \r\n'
            expect(cleanEmail(equivEmail)).toEqual(env.INITIAL_ADMIN)
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: equivEmail, password: env.INITIAL_PASSWORD })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    // Response indicates successful login and force password reset
                    expectSuccessLoginBody(res, true)
                    // Check that token exists in table
                    return pwtokensTable.findByToken(res.body.resetToken)
                })
                .then((tokenData) => {
                    expect(tokenData).not.toBeNull()
                })
        })
    
        it('should reject login using a wrong INITIAL_ADMIN value',
        () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: 'ThisUserIsNotTheAdmin@example.com', password: env.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })
    
        it('should reject login using a wrong INITIAL_PASSWORD value',
        () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: env.INITIAL_ADMIN, password: 'ThisIsNotThePasswordYouAreLookingFor' })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })

        it('should reject login if data has unexpected format', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({})
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INVALID_FORMAT)
                })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: null, password: 12345 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INVALID_FORMAT)
                })
            )
        })
    
        it('should reject login if INITIAL_ADMIN is invalid email',
        () => {
            const env2 = {
                INITIAL_ADMIN: 'laurel.and.hardy',
                INITIAL_PASSWORD: 'BestBuds33'
            }
            const app2 = express()
            app2.use('/', getRouter(db, env2))
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ user: env2.INITIAL_ADMIN, password: env2.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })
    
        it('should reject login if INITIAL_PASSWORD is empty string',
        () => {
            const env2 = {
                INITIAL_ADMIN: 'laurel.and.hardy@example.com',
                INITIAL_PASSWORD: ''
            }
            const app2 = express()
            app2.use('/', getRouter(db, env2))
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ user: env2.INITIAL_ADMIN, password: env2.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })

    })

    describe('after a user is created', () => {

        const eve = {
            email: 'eve@example.com',
            nickname: 'Eve',
            password: 'helloworld',
            admin: true
        }

        beforeAll(async () => {
            await usersTable.deleteByEmail(eve.email)
            await usersTable.create(eve)
        })

        it('should accept login using user\'s email and password', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: eve.password })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectSuccessLoginBody(res)
                })
        })

        it('should accept login with email equivalent to user and correct password', () => {
            const equivEmail = ' EVE@EXAMPLE.COM '
            expect(cleanEmail(equivEmail)).toEqual(eve.email)
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: equivEmail, password: eve.password })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectSuccessLoginBody(res)
                })
        })

        it('should reject login using INITIAL_ADMIN and INITIAL_PASSWORD (different from user)', () => {
            expect(env.INITIAL_ADMIN).not.toEqual(eve.email)
            expect(env.INITIAL_PASSWORD).not.toEqual(eve.password)
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: env.INITIAL_ADMIN, password: env.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })

        it('should reject login using user\'s email but incorrect password', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: env.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })

        it('should reject login using user\'s password but incorrect email', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: env.INITIAL_ADMIN, password: eve.password })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
                })
        })

        it('should reject login if data has unexpected syntax', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ apples: 5, oranges: 7 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INVALID_FORMAT)
                })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: undefined, password: 12345 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INVALID_FORMAT)
                })
            )
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: null })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INVALID_FORMAT)
                })
            )
        })

        it('should reject login if user does not have a password in the database', () => {
            return db.query({
                text: format(`UPDATE %I.users SET password = $1 WHERE email = $2;`, schema),
                values: [undefined, eve.email]
            })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: 'null' })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res, LoginErrors.INCORRECT_LOGIN)
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
