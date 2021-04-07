import request from 'supertest'
import dbconnection from './dbconnection'
import server from './server'

beforeAll(async () => {
    await dbconnection.init()
})

afterAll(() => {
    dbconnection.end()
})

describe('Home page', () => {
    it('should render', async () => {
        await request(server)
            .get('/')
            .expect(200)
            .expect(/\bDice Roller\b/)
    })
})
