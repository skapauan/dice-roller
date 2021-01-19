const request = require('supertest')
const server = require('./server')

describe('Home page', () => {
    it('should render', async () => {
        await request(server)
            .get('/')
            .expect(200)
            .expect(/\bDice Roller\b/)
    })
})
