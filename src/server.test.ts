import request from 'supertest'
import server from './server'

describe('Home page', () => {
    it('should render', async () => {
        await request(server)
            .get('/')
            .expect(200)
            .expect(/\bDice Roller\b/)
    })
})
