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
            .type('form')
            .send({ user: process.env.INITIAL_ADMIN, password: process.env.INITIAL_PASSWORD })
            .expect(200)
            .expect('Content-Type', /json/)
            .expect((res) => {
                if (!('success' in res.body) || res.body.success != true)
                    throw new Error('Success is not true')
            })
    })
})
