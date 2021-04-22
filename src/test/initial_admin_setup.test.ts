import request from 'supertest'
import path from 'path'
import format from 'pg-format'
import getServer from '../server'
import { testConfig, getTestSchema } from './config/db.test'
import DB from '../db/db'
import { LoginRequestBody } from '../routes/login'
import { PasswordRequestBody } from '../routes/password'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const env = { INITIAL_ADMIN: ' orange.cat@example.com ', INITIAL_PASSWORD: 'IHateMondays'}
const server = getServer(db, path.join(__dirname, '..', 'public'), env)

beforeAll(async () => {
    await db.init()
    await db.query(format('DELETE FROM %I.users;', schema))
    await db.query(format('DELETE FROM %I.pwtokens;', schema))
})

afterAll(() => {
    db.end()
})

describe('Initial admin setup', () => {

    it('should allow the initial admin to set a password', async () => {

        // With no users in DB, log in as INITIAL_ADMIN and receive a reset token
        const loginRes = await request(server)
            .post('/login')
            .type('application/json')
            .send({
                user: env.INITIAL_ADMIN.trim(),
                password: env.INITIAL_PASSWORD
            } as LoginRequestBody)
            .expect(200)
        expect(loginRes.body).toHaveProperty('resetToken')

        // Use the reset token to set a password
        const newPassword = 'ILoveLasagna'
        await request(server)
            .post('/password')
            .type('application/json')
            .send({ 
                token: loginRes.body.resetToken,
                user: env.INITIAL_ADMIN.toUpperCase(),
                newPassword
            } as PasswordRequestBody)
            .expect(200)

        // Log in successfully with new password
        await request(server)
            .post('/login')
            .type('application/json')
            .send({
                user: env.INITIAL_ADMIN,
                password: newPassword
            } as LoginRequestBody)
            .expect(200)

        // Old password is no longer authorized
        await request(server)
            .post('/login')
            .type('application/json')
            .send({
                user: env.INITIAL_ADMIN,
                password: env.INITIAL_PASSWORD
            } as LoginRequestBody)
            .expect(401)
    })

})
