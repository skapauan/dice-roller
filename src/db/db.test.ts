if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const db = require('./db')

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('DB manager', () => {

    it('should connect to DB successfully', () => {
        return db.query('SELECT NOW();')
    })

    it('should create a users table', () => {
        return db.query(`SELECT * FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'public' AND TABLE_NAME = 'users';`)
        .then((res) => {
            if (res.rowCount !== 1) {
                throw new Error('Users table not found')
            }
        })
    })

    it('should create a pwtokens table', () => {
        return db.query(`SELECT * FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'public' AND TABLE_NAME = 'pwtokens';`)
        .then((res) => {
            if (res.rowCount !== 1) {
                throw new Error('Tokens table not found')
            }
        })
    })

})
