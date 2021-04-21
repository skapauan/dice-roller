import request from 'supertest'
import express from 'express'
import format from 'pg-format'
import getRouter from './login'
import { testConfig, getTestSchema } from '../db/testconfig.test'
import DB from '../db/db'
import PwTokensTable from '../db/pwtokens'
import UsersTable from '../db/users'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)
const usersTable = new UsersTable(db)
const env = { INITIAL_ADMIN: 'mister.cool@example.com', INITIAL_PASSWORD: 'a super witty password'}

const app = express()
app.use(express.json())
app.use('/', getRouter(db, env))

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Login service', () => {

    const expectFailedLoginBody = (res: {body: object}): void => {
        expect(res.body).toHaveProperty('success', false)
        expect(res.body).not.toHaveProperty('forceReset')
        expect(res.body).not.toHaveProperty('resetToken')
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
                    expect(res.body).toHaveProperty('success', true)
                    expect(res.body).toHaveProperty('forceReset', true)
                    expect(res.body).toHaveProperty('resetToken')
                    expect(typeof res.body.resetToken).toEqual('string')
                    expect(res.body.resetToken.length).toBeGreaterThan(0)
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
                    expectFailedLoginBody(res)
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
                    expectFailedLoginBody(res)
                })
        })

        it('should reject login if bad syntax', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({})
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: null, password: 12345 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
            )
        })
    
        it('should reject login if INITIAL_ADMIN is empty string',
        () => {
            const env2 = {
                INITIAL_ADMIN: '',
                INITIAL_PASSWORD: 'BestBuds33',
                NODE_ENV: 'test'
            }
            const app2 = express()
            app2.use(express.json())
            app2.use('/', getRouter(db, env2))
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ user: env2.INITIAL_ADMIN, password: env2.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
        })
    
        it('should reject login if INITIAL_PASSWORD is empty string',
        () => {
            const env2 = {
                INITIAL_ADMIN: 'laurel.and.hardy@example.com',
                INITIAL_PASSWORD: '',
                NODE_ENV: 'test'
            }
            const app2 = express()
            app2.use(express.json())
            app2.use('/', getRouter(db, env2))
            return request(app2)
                .post('/')
                .type('application/json')
                .send({ user: env2.INITIAL_ADMIN, password: env2.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
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

        it('should accept login matching the user\'s info', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: eve.password })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', true)
                    expect(res.body).not.toHaveProperty('forceReset')
                    expect(res.body).not.toHaveProperty('resetToken')
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
                    expectFailedLoginBody(res)
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
                    expectFailedLoginBody(res)
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
                    expectFailedLoginBody(res)
                })
        })

        it('should reject login if bad syntax', () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ apples: 5, oranges: 7 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: undefined, password: 12345 })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
            )
            .then(() => request(app)
                .post('/')
                .type('application/json')
                .send({ user: eve.email, password: null })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
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
                    expectFailedLoginBody(res)
                })
            )
        })

    })

})
