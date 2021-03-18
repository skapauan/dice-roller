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

        it('returns info for the user that has the email', async () => {
            const client = await db.getClient()
            try {
                const email = 'chipmunk@example.com'
                const nickname ='Chipmunk'
                const password = 'password' + parseInt((Math.random() * 1000000000).toString(), 10)
                const admin = true
                await db.query({
                    text: 'DELETE FROM users WHERE email = $1;',
                    values: [email]
                }, client)
                await db.query({
                    text: `INSERT INTO users (email, nickname, password, admin) VALUES ($1, $2, $3, $4);`,
                    values: [email, nickname, password, admin]
                }, client)
                const result = await usersTable.findByEmail(email, client)
                expect(result).not.toBeNull()
                if (!result) return // make ts compiler happy
                expect(result).toMatchObject({
                    email,
                    nickname,
                    password,
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

    describe('deleteByEmail', () => {

        it('returns true and removes the user with the email if it exists', async () => {
            const email = 'capybara@example.com'
            await usersTable.create({email})
            const deleteResult = await usersTable.deleteByEmail(email)
            expect(deleteResult).toEqual(true)
            const user = await usersTable.findByEmail(email)
            expect(user).toBeNull()
        })

        it('returns false if no user has the email', async () => {
            const email = 'beaver@example.com'
            await db.query({
                text: 'DELETE FROM users WHERE email = $1',
                values: [email]
            })
            const result = await usersTable.deleteByEmail(email)
            expect(result).toEqual(false)
        })

    })

    describe('findById', () => {

        it('returns info for the user that has the ID', async () => {
            const client = await db.getClient()
            try {
                // Add user
                const email = 'mouse@example.com'
                const nickname = undefined
                const password = 'password' + parseInt((Math.random() * 1000000000).toString(), 10)
                const admin = false
                await db.query({
                    text: 'DELETE FROM users WHERE email = $1;',
                    values: [email]
                }, client)
                await db.query({
                    text: `INSERT INTO users (email, nickname, password, admin) VALUES ($1, $2, $3, $4);`,
                    values: [email, nickname, password, admin]
                }, client)
                // Get user_id of the added user
                const resultByEmail = await usersTable.findByEmail(email, client)
                expect(resultByEmail).not.toBeNull()
                if (!resultByEmail) return // make ts compiler happy
                expect(typeof resultByEmail.user_id).toEqual('number')
                // Test findById
                const resultById = await usersTable.findById(resultByEmail.user_id, client)
                expect(resultById).not.toBeNull()
                if (!resultById) return // make ts compiler happy
                expect(resultById).toMatchObject({
                    email,
                    nickname: null,
                    password,
                    admin
                })
                expect(typeof resultById.user_id).toEqual('number')
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it ('returns null if no user has the ID', async () => {
            const id = 9999999
            await db.query({
                text: 'DELETE FROM users WHERE user_id = $1',
                values: [id]
            })
            const result = await usersTable.findById(id)
            expect(result).toBeNull()
        })

    })

    describe('create', () => {

        const email = 'shrew@example.com'

        const user1 = {
            email,
            nickname: 'Shrew',
            password: 'shrews-are-the-best',
            admin: false
        }

        const user2 = {
            email,
            nickname: 'S. H. Rew',
            password: 'refined-rodent',
            admin: true
        }

        it('has error messages defined',
        () => {
            expect(usersTable.errors.CREATE_EMAIL_INVALID).toBeTruthy()
        })

        it('adds a user and returns its user_id if the email is not yet registered',
        async () => {
            await db.query(`DELETE FROM users;`)
            const id = await usersTable.create(user2)
            const info = await usersTable.findById(id)
            expect(info).toMatchObject(user2)
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

        it('rejects and throws if email is empty string',
        () => {
            const createUserWithEmptyEmail = () => {
                const user = {...user1, email: ''}
                return usersTable.create(user)
            }
            return expect(createUserWithEmptyEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_INVALID)
        })

        it('rejects and throws if email is whitespace',
        () => {
            const createUserWithWhitespaceEmail = () => {
                const user = {...user1, email: ' \t'}
                return usersTable.create(user)
            }
            return expect(createUserWithWhitespaceEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_INVALID)
        })

        it('rejects and throws if email is invalid',
        () => {
            const createUserWithInvalidEmail = () => {
                const user = {...user1, email: 'null'}
                return usersTable.create(user)
            }
            return expect(createUserWithInvalidEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_INVALID)
        })

        it('rejects and throws if email is too long',
        () => {
            const createUserWithTooLongEmail = () => {
                const user = {...user1, email: 'the-local-part-is-invalid-if-it-is-longer-than-sixty-four-characters@sld.net'}
                return usersTable.create(user)
            }
            return expect(createUserWithTooLongEmail()).rejects.toThrow(usersTable.errors.CREATE_EMAIL_INVALID)
        })

    })

})
