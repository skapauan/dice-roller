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

    describe('usersIsEmpty', () => {

        it('should return true if users table is empty', async () => {
            const client = await db.getClient()
            try {
                await db.query(`DELETE FROM users;`, client)
                const result = await db.usersIsEmpty(client)
                expect(result).toEqual(true)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('should return false if users table is not empty', async () => {
            const client = await db.getClient()
            try {
                await db.query({
                    text: `INSERT INTO users (email, nickname) VALUES ($1, $2);`,
                    values: ['squirrel@example.com', 'Squirrel']
                }, client)
                const result = await db.usersIsEmpty(client)
                expect(result).toEqual(false)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

    })

    describe('lookupUser', () => {

        it('should return info for a user that has the email', async () => {
            const client = await db.getClient()
            try {
                const email = 'chipmunk@example.com'
                const nickname ='Chipmunk'
                const password = 'password' + parseInt(Math.random() * 1000000000, 10)
                const hash = 'hash ' + new Date().toString()
                const admin = true
                await db.query({
                    text: 'DELETE FROM users WHERE email = $1;',
                    values: [email]
                }, client)
                await db.query({
                    text: `INSERT INTO users (email, nickname, password, hash, admin) VALUES ($1, $2, $3, $4, $5);`,
                    values: [email, nickname, password, hash, admin]
                }, client)
                const result = await db.lookupUser(email, client)
                expect(result).toMatchObject({
                    email,
                    nickname,
                    password,
                    hash,
                    admin
                })
                expect(typeof result.user_id).toEqual('number')
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it ('should return null if no user has the email', async () => {
            const client = await db.getClient()
            try {
                const email = 'vole@example.com'
                await db.query({
                    text: 'DELETE FROM users WHERE email = $1',
                    values: [email]
                }, client)
                const result = await db.lookupUser(email, client)
                expect(result).toBeNull()
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

    })

    describe('lookupPwtoken', () => {

        const tokens = [
            { token: '123', email: 'bananagrams@example.com', expires: new Date('21 May 1990 09:00:00 GMT') },
            { token: '321', email: 'bananaphone@example.com', expires: new Date('18 Jan 2058 17:00:00 GMT') },
            { token: '231', email: 'bananasinpajamas@example.com', expires: new Date() }
        ]

        const absentTokens = [
            { token: '999', email: 'bananabread@example.com', expires: new Date(0) },
            { token: '888', email: 'bananabowl@example.com', expires: new Date('23 Sep 1972 06:00:00 GMT') }
        ]

        beforeAll(async () => {
            const client = await db.getClient()
            try {
                await db.query(`DELETE FROM pwtokens;`, client)
                const values = tokens.reduce((accumulator, current) => {
                    accumulator.push(current.token, current.email, current.expires)
                    return accumulator
                }, [])
                await db.query({
                    text: `INSERT INTO pwtokens (token, email, expires)
                        VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9);`,
                    values
                }, client)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('should retrieve token info for an existing token',
        () => {
            for (let i = 0; i < tokens.length; i++) {
                db.lookupPwToken(tokens[i].token)
                .then((pwToken) => {
                    expect(pwToken).toMatchObject(tokens[i])
                })
            }
        })

        it('should return null for a nonexistant token',
        () => {
            for (let i = 0; i < absentTokens.length; i++) {
                db.lookupPwToken(absentTokens[i].token)
                .then((pwToken) => {
                    expect(pwToken).toBeNull()
                })
            }
        })

    })

})
