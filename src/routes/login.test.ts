import request from 'supertest'
import express from 'express'
import router from './login'
import db from '../db/db'
import pwtokensTable from '../db/pwtokens'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const app = express()
app.use(express.json())
app.use('/', router)

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
            await db.query('DELETE FROM users;')
        })

        it('should accept login using INITIAL_ADMIN and INITIAL_PASSWORD and force a password reset',
        () => {
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: process.env.INITIAL_ADMIN, password: process.env.INITIAL_PASSWORD })
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
                .send({ user: 'ThisUserIsNotTheAdmin@example.com', password: process.env.INITIAL_PASSWORD })
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
                .send({ user: process.env.INITIAL_ADMIN, password: 'ThisIsNotThePasswordYouAreLookingFor' })
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
            const admin = process.env.INITIAL_ADMIN
            process.env.INITIAL_ADMIN = ''
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: '', password: process.env.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
                .finally(() => {
                    process.env.INITIAL_ADMIN = admin
                })
        })
    
        it('should reject login if INITIAL_PASSWORD is empty string',
        () => {
            const password = process.env.INITIAL_PASSWORD
            process.env.INITIAL_PASSWORD = ''
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: process.env.INITIAL_ADMIN, password: '' })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expectFailedLoginBody(res)
                })
                .finally(() => {
                    process.env.INITIAL_PASSWORD = password
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
            await db.query({
                text: 'DELETE FROM users WHERE email = $1;',
                values: [eve.email]
            })
            await db.query({
                text: `INSERT INTO users (email, nickname, password, admin) VALUES ($1, $2, $3, $4);`,
                values: [eve.email, eve.nickname, eve.password, eve.admin]
            })
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
            expect(process.env.INITIAL_ADMIN).not.toEqual(eve.email)
            expect(process.env.INITIAL_PASSWORD).not.toEqual(eve.password)
            return request(app)
                .post('/')
                .type('application/json')
                .send({ user: process.env.INITIAL_ADMIN, password: process.env.INITIAL_PASSWORD })
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
                .send({ user: eve.email, password: process.env.INITIAL_PASSWORD })
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
                .send({ user: process.env.INITIAL_ADMIN, password: eve.password })
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
                text: `UPDATE users SET password = $1 WHERE email = $2;`,
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
