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

        it('should return true if users table is empty', () => {
            return db.getClient()
            .then((client) => {
                client.query('TRUNCATE TABLE users;')
                return client
            })
            .then((client) => {
                return db.usersIsEmpty(client)
                .then((result) => {
                    expect(result).toEqual(true)
                    client.release()
                })
            })
        })

        it('should return false if users table is not empty', () => {
            return db.getClient()
            .then((client) => {
                client.query(`INSERT INTO users (email, nickname) VALUES ('squirrel@example.com', 'Squirrel');`)
                return client
            })
            .then((client) => {
                return db.usersIsEmpty(client)
                .then((result) => {
                    expect(result).toEqual(false)
                    client.release()
                })
            })
        })

    })

})

afterAll(() => {
    db.end()
})
