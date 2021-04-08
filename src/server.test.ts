import request from 'supertest'
import getServer from './server'
import DB from './db/db'
import { testConfig } from './db/testconfig'

const db = new DB(testConfig)
const server = getServer(db)

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
