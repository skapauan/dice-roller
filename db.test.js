if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const db = require('./db')

beforeAll(async () => {
    db.init(db.configForTest)
    await db.setup()
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

    describe('usersIsEmpty', () => {

        it('should return true if users table is empty', async () => {
            const client = await db.getClient()
            try {
                await client.query('TRUNCATE TABLE users;')
                const result = await db.usersIsEmpty(client)
                expect(result).toEqual(true)
            } catch (error) {
                client.release()
                throw error
            }
            client.release()
        })

        it('should return false if users table is not empty', async () => {
            const client = await db.getClient()
            try {
                await client.query(`INSERT INTO users (email, nickname)
                    VALUES ('squirrel@example.com', 'Squirrel');`)
                const result = await db.usersIsEmpty(client)
                expect(result).toEqual(false)
            } catch (error) {
                client.release()
                throw error
            }
            client.release()
        })

    })

})

afterAll(() => {
    db.end()
})
