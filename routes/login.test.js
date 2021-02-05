if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const request = require('supertest')
const express = require('express')
const router = require('./login')
const db = require('../db')

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

    describe('before any users created', () => {

        beforeEach(async () => {
            await db.query('DELETE FROM users;')
        })

        it('should accept login using INITIAL_ADMIN and INITIAL_PASSWORD',
        async () => {
            await request(app)
                .post('/')
                .type('application/json')
                .send({ user: process.env.INITIAL_ADMIN, password: process.env.INITIAL_PASSWORD })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', true)
                })
        })
    
        it('should reject login using a wrong INITIAL_ADMIN value',
        async () => {
            await request(app)
                .post('/')
                .type('application/json')
                .send({ user: 'ThisUserIsNotTheAdmin@example.com', password: process.env.INITIAL_PASSWORD })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', false)
                })
        })
    
        it('should reject login using a wrong INITIAL_PASSWORD value',
        async () => {
            await request(app)
                .post('/')
                .type('application/json')
                .send({ user: process.env.INITIAL_ADMIN, password: 'ThisIsNotThePasswordYouAreLookingFor' })
                .expect(401)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', false)
                })
        })

    })

})
