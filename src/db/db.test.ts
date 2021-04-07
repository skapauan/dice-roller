import DB from './db'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const db = new DB()

afterAll(async () => {
    await db.end()
})

describe('DB manager', () => {

    it('isInit returns false before init', () => {
        expect(db.isInit()).toEqual(false)
    })

    it('isInit returns true after init', async () => {
        await db.init()
        expect(db.isInit()).toEqual(true)
    })

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

    it('isInit returns false after end', () => {
        db.end()
        expect(db.isInit()).toEqual(false)
    })

})
