if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const request = require('supertest')
const express = require('express')
const router = require('./login')

const app = express()
app.use(express.json())
app.use('/', router)

describe('Login service', () => {

    it('should accept login using INITIAL_ADMIN and INITIAL_PASSWORD upon initial app setup',
    async () => {
        await request(app)
            .post('/')
            .type('application/json')
            .send({ user: process.env.INITIAL_ADMIN, password: process.env.INITIAL_PASSWORD })
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => {
                if (!('success' in res.body))
                    throw new Error('Success info not included in response')
                if (res.body.success !== true)
                    throw new Error('Success is not true')
            })
    })

    it('should reject login using a wrong INITIAL_ADMIN value upon initial app setup',
    async () => {
        await request(app)
            .post('/')
            .type('application/json')
            .send({ user: 'ThisUserIsNotTheAdmin@example.com', password: process.env.INITIAL_PASSWORD })
            .expect(401)
            .expect('Content-Type', /json/)
            .expect((res) => {
                if (!('success' in res.body))
                    throw new Error('Success info not included in response')
                else if (res.body.success !== false)
                    throw new Error('Success is not false')
            })
    })

})
