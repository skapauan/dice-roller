if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const db = require('./db')

beforeAll(() => {
    db.init(db.configForTest)
})

describe('DB manager', () => {
    it('should connect to DB successfully', () => {
        return db.testConnection()
    })
})

afterAll(() => {
    db.end()
})
