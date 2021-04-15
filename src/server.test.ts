import request from 'supertest'
import path from 'path'
import getServer from './server'
import DB from './db/db'
import { testConfig, getTestSchema } from './db/testconfig'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const server = getServer(db, path.join(__dirname, '..', 'public'))

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Home page', () => {
    it('should render', async () => {
        await request(server)
            .get('/')
            .expect(200)
            .expect(/\bDice Roller\b/)
    })
})
