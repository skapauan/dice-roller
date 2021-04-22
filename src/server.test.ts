import request from 'supertest'
import path from 'path'
import getServer from './server'
import DB from './db/db'
import { testConfig, getTestSchema } from './test/config/db.test'
import PwtokensTable from './db/pwtokens'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const server = getServer(db, path.join(__dirname, '..', 'public'), {})
const pwtokensTable = new PwtokensTable(db)

beforeAll(async () => {
    await db.init()
    await pwtokensTable.deleteAll()
})

afterAll(() => {
    db.end()
})

describe('Server', () => {

    describe('Home page', () => {
        it('should be reachable', async () => {
            await request(server)
                .get('/')
                .expect(200)
                .expect(/\bDice Roller\b/)
        })
    })
    
    describe('Login service', () => {
        it('should be reachable', () => {
            return request(server)
                .post('/login')
                .type('application/json')
                .send({ user: 'mystery@example.com', password: null })
                .expect(400)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', false)
                })
        })
    })
    
    describe('Password service', () => {
        it('should be reachable', () => {
            return request(server)
                .post('/password')
                .type('application/json')
                .send({
                    token: 'mystery token',
                    user: 'mystery@example.com',
                    newPassword: 'mystery password'
                })
                .expect(403)
                .expect('Content-Type', /json/)
                .then((res) => {
                    expect(res.body).toHaveProperty('success', false)
                })
        })
    })

})
