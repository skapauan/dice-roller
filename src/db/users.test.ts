import usersTable from './users'
import db from './db'

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Users table', () => {

    describe('isEmpty', () => {

        it('returns true if users table is empty', async () => {
            await db.query(`DELETE FROM users;`)
            const result = await usersTable.isEmpty()
            expect(result).toEqual(true)
        })

        it('returns false if users table is not empty', async () => {
            const client = await db.getClient()
            try {
                await db.query({
                    text: `INSERT INTO users (email, nickname) VALUES ($1, $2);`,
                    values: ['squirrel@example.com', 'Squirrel']
                }, client)
                const result = await usersTable.isEmpty(client)
                expect(result).toEqual(false)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

    })

    describe('findByEmail', () => {

        it('returns info for a user that has the email', async () => {
            const client = await db.getClient()
            try {
                const email = 'chipmunk@example.com'
                const nickname ='Chipmunk'
                const password = 'password' + parseInt((Math.random() * 1000000000).toString(), 10)
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
                const result = await usersTable.findByEmail(email, client)
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

        it ('returns null if no user has the email', async () => {
            const email = 'vole@example.com'
            await db.query({
                text: 'DELETE FROM users WHERE email = $1',
                values: [email]
            })
            const result = await usersTable.findByEmail(email)
            expect(result).toBeNull()
        })

    })

    describe('create', () => {

        const email = 'shrew@example.com'

        const user1 = {
            email,
            nickname: 'Shrew',
            password: 'shrews-are-the-best',
            hash: '555',
            admin: false
        }

        const user2 = {
            email,
            nickname: 'S. H. Rew',
            password: 'refined-rodent',
            hash: '777',
            admin: true
        }

        it('has error messages defined',
        () => {
            expect(usersTable.errors.CREATE_EMAIL_MISSING).toBeTruthy()
            expect(usersTable.errors.CREATE_EMAIL_INVALID).toBeTruthy()
        })

        it('adds user and returns true if the email is not yet registered',
        async () => {
            await db.query(`DELETE FROM users;`)
            const result = await usersTable.create(user2)
            const info = await usersTable.findByEmail(user2.email)
            expect(info).toMatchObject(user2)
            expect(result).toEqual(true)
        })

        it('rejects, throws, and does not affect existing user if email is already registered',
        async () => {
            const client = await db.getClient()
            try {
                await db.query(`DELETE FROM users;`, client)
                await usersTable.create(user1, client)
                const createUserWithExistingUserEmail = () => {
                    return usersTable.create(user2, client)
                }
                await expect(createUserWithExistingUserEmail())
                    .rejects.toThrow(usersTable.errors.CREATE_EMAIL_ALREADY_IN_USE)
                const info = await usersTable.findByEmail(user2.email, client)
                expect(info).toMatchObject(user1)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('rejects and throws if no email property',
        () => {
            const createUserWithoutEmail = () => {
                const user = { nickname: 'Banksy' }
                return usersTable.create(user as any)
            }
            return expect(createUserWithoutEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_MISSING)
        })

        it('rejects and throws if email is empty string',
        () => {
            const createUserWithEmptyEmail = () => {
                const user = {...user1, email: ''}
                return usersTable.create(user)
            }
            return expect(createUserWithEmptyEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_MISSING)
        })

        it('rejects and throws if email is not a string',
        () => {
            const createUserWithBooleanEmail = () => {
                const user = {...user1, email: true}
                return usersTable.create(user as any)
            }
            return expect(createUserWithBooleanEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_MISSING)
        })

        it('rejects and throws if email is not valid',
        () => {
            const createUserWithInvalidEmail = () => {
                const user = {...user1, email: 'the-local-part-is-invalid-if-it-is-longer-than-sixty-four-characters@sld.net'}
                return usersTable.create(user)
            }
            return expect(createUserWithInvalidEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_INVALID)
        })

    })

})