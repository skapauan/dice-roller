import argon2 from 'argon2'
import { PoolClient } from 'pg'
import format from 'pg-format'
import UsersTable, { UserCreate, UserResult } from './users'
import { testConfig, getTestSchema } from '../test/config/db.test'
import DB from './db'
import { cleanEmail } from '../string/string'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const usersTable = new UsersTable(db)

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

const insertUser = (config?: {email: string, nickname?: string, password?: string, 
                                admin?: boolean, client?: PoolClient}): Promise<number> => {
    let { email, nickname, password, admin, client } = config || {}
    return db.query({
        text: format(`INSERT INTO %I.users (email, nickname, password, admin)
            VALUES ($1, $2, $3, $4) RETURNING user_id;`, schema),
        values: [email, nickname, password, admin]
    }, client)
    .then((insertResult) => {
        return insertResult.rows[0].user_id
    })
}

const deleteUsers = (config?: {email?: string, id?: number, client?: PoolClient}) => {
    let { email, id, client } = config || {}
    if (typeof email === 'string') {
        return db.query({
            text: format('DELETE FROM %I.users WHERE email = $1;', schema),
            values: [email]
        }, client)
    }
    if (typeof id === 'number') {
        return db.query({
            text: format('DELETE FROM %I.users WHERE user_id = $1', schema),
            values: [id]
        }, client)
    }
    return db.query(format(`DELETE FROM %I.users;`, schema), client)
}

const convertToResult = (user: UserCreate): UserResult => {
    const obj: any = {...user}
    obj.email = cleanEmail(obj.email)
    delete obj.password
    return obj
}

describe('Users table', () => {

    describe('isEmpty', () => {

        it('returns true if users table is empty', async () => {
            await deleteUsers()
            const result = await usersTable.isEmpty()
            expect(result).toEqual(true)
        })

        it('returns false if users table is not empty', async () => {
            const client = await db.getClient()
            try {
                await insertUser({email: 'squirrel@example.com', nickname: 'Squirrel', client})
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

        const email = cleanEmail('chipmunk@example.com') || ''
        const nickname ='Chipmunk'
        const password = 'password' + parseInt((Math.random() * 1000000000).toString(), 10)
        const admin = true

        it('returns info for the user that has the normalized email', async () => {
            const client = await db.getClient()
            try {
                await deleteUsers({email, client})
                const user_id = await insertUser({email, nickname, password, admin, client})
                const result = await usersTable.findByEmail(email, client)
                expect(result).not.toBeNull()
                if (!result) return // make ts compiler happy
                expect(result).toMatchObject({
                    user_id,
                    email,
                    nickname,
                    password,
                    admin
                })
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('returns info for the user that has the equivalent email', async () => {
            const email2 = ' \t ChipMunk@example.com \r\n  '
            expect(cleanEmail(email2)).toEqual(email)
            const client = await db.getClient()
            try {
                await deleteUsers({email, client})
                const user_id = await insertUser({email, nickname, password, admin, client})
                const result = await usersTable.findByEmail(email2, client)
                expect(result).not.toBeNull()
                if (!result) return // make ts compiler happy
                expect(result).toMatchObject({
                    user_id,
                    email,
                    nickname,
                    password,
                    admin
                })
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it ('returns null if no user has the email', async () => {
            const email = 'vole@example.com'
            await deleteUsers({email})
            const result = await usersTable.findByEmail(email)
            expect(result).toBeNull()
        })

        it ('returns null if email is invalid', async () => {
            const email = 'vole at example dot com'
            await deleteUsers({email})
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

        it('returns true and removes the user with an equivalent email if it exists', async () => {
            const email1 = 'capy.bara@live.com'
            const email2 = 'CapyBara+blog@live.com'
            expect(cleanEmail(email1)).toEqual(cleanEmail(email2))
            await usersTable.create({email: email1})
            const deleteResult = await usersTable.deleteByEmail(email2)
            expect(deleteResult).toEqual(true)
            const user1 = await usersTable.findByEmail(email1)
            expect(user1).toBeNull()
            const user2 = await usersTable.findByEmail(email2)
            expect(user2).toBeNull()
        })

        it('returns false if no user has the email', async () => {
            const email = 'beaver@example.com'
            await deleteUsers({email})
            const result = await usersTable.deleteByEmail(email)
            expect(result).toEqual(false)
        })

        it('returns false if email is invalid', async () => {
            const email = 'beaver'
            await deleteUsers({email})
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
                await deleteUsers({email, client})
                const user_id = await insertUser({email, nickname, password, admin, client})
                // Test findById
                const resultById = await usersTable.findById(user_id, client)
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
            await deleteUsers({id})
            const result = await usersTable.findById(id)
            expect(result).toBeNull()
        })

    })

    describe('checkPassword', () => {

        const user: UserResult = {
            user_id: 1,
            email: 'rat@example.com',
            nickname: 'Nigel Ratburn',
            password: '',
            admin: false
        }

        const plaintext = 'IHopeIRememberMyPassword'

        beforeAll(async () => {
            user.password = await argon2.hash(plaintext)
        })

        it('returns true if password matches', async () => {
            expect(await usersTable.checkPassword(plaintext, user)).toEqual(true)
        })

        it('returns false if password does not match', async () => {
            expect(await usersTable.checkPassword('OhNoIThinkIForgotIt', user)).toEqual(false)
        })

        it('returns false if user data does not have password', async () => {
            const userNoPw = {...user, password: null}
            expect(await usersTable.checkPassword('null', userNoPw)).toEqual(false)
        })

        it('returns false if user data has invalid password', async () => {
            const userBadPw = {...user, password: '12345'}
            // argon2.verify will throw "TypeError: pchstr must contain a $ as first char"
            expect(await usersTable.checkPassword(plaintext, userBadPw)).toEqual(false)
        })

    })

    describe('create', () => {

        const email = 'shrew@googlemail.com'
        const equivEmail = ' S.H.Rew+sartorial@gmail.com '

        const user1: UserCreate = {
            email,
            nickname: 'Shrew',
            password: 'shrews-are-the-best',
            admin: false
        }

        const user2: UserCreate = {
            email,
            nickname: 'S. H. Rew',
            password: 'refined-rodent',
            admin: true
        }

        const user1result = convertToResult(user1)
        const user2result = convertToResult(user2)

        it('has error messages defined',
        () => {
            expect(usersTable.errors.CREATE_EMAIL_INVALID).toBeTruthy()
        })

        it('adds a user and returns its user_id if the email is not yet registered',
        async () => {
            await deleteUsers()
            const id = await usersTable.create(user2)
            const info = await usersTable.findById(id)
            expect(info).toMatchObject(user2result)
        })

        it('normalizes email before saving', async () => {
            await deleteUsers()
            const id = await usersTable.create({...user2, email: equivEmail})
            const info = await usersTable.findById(id)
            expect(info).toMatchObject({ ...user2result, email: cleanEmail(equivEmail) })
        })

        it('trims nickname before saving', async () => {
            await deleteUsers()
            const id = await usersTable.create({...user2, nickname: ` \r\n \t ${user2.nickname}  \xa0 `})
            const info = await usersTable.findById(id)
            expect(info).toMatchObject(user2result)
        })

        it('hashes password before saving', async () => {
            await deleteUsers()
            const id = await usersTable.create(user2)
            const info = await usersTable.findById(id)
            expect(info).not.toBeNull()
            if (!info) return // make ts compiler happy
            expect(typeof info.password).toEqual('string')
            expect(typeof user2.password).toEqual('string')
            expect(await argon2.verify(info.password as string, user2.password as string)).toEqual(true)
        })

        it('saves an undefined password as null in the database', async () => {
            await deleteUsers()
            const user = {...user2}
            user.password = undefined
            const id = await usersTable.create(user)
            const info = await usersTable.findById(id)
            expect(info).toMatchObject({...convertToResult(user), password: null})
        })

        it('rejects, throws, and does not affect existing user if email is already registered',
        async () => {
            expect(user1.email).toEqual(user2.email)
            const client = await db.getClient()
            try {
                await deleteUsers({client})
                await usersTable.create(user1, client)
                const createUserWithExistingUserEmail = () => {
                    return usersTable.create(user2, client)
                }
                await expect(createUserWithExistingUserEmail())
                    .rejects.toThrow(usersTable.errors.CREATE_EMAIL_ALREADY_IN_USE)
                const info = await usersTable.findByEmail(user2.email, client)
                expect(info).toMatchObject(user1result)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('rejects, throws, and does not affect existing user if an equivalent email is already registered',
        async () => {
            const user3 = {...user2, email: equivEmail }
            expect(cleanEmail(user3.email)).toEqual(cleanEmail(user1.email))
            const client = await db.getClient()
            try {
                await deleteUsers({client})
                await usersTable.create(user1, client)
                const createUserWithExistingEquivalentEmail = () => {
                    return usersTable.create(user3, client)
                }
                await expect(createUserWithExistingEquivalentEmail())
                    .rejects.toThrow(usersTable.errors.CREATE_EMAIL_ALREADY_IN_USE)
                const info = await usersTable.findByEmail(user3.email, client)
                expect(info).toMatchObject(user1result)
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

    describe('update', () => {
        const plaintextPassword = 'caviidae63'
        const gp = {
            email: 'guineapig@example.com',
            nickname: 'Guinea Pig',
            password: 'hash the plaintext password here',
            admin: false
        }
        let user_id = -999

        beforeAll(async () => {
            gp.password = await argon2.hash(plaintextPassword)
        })

        beforeEach(async () => {
            await deleteUsers()
            user_id = await insertUser(gp)
        })

        it('updates existing user with the ID and returns the updated info', async () => {
            const update = {
                user_id,
                email: ' \t  Guinea-Pig@example.com  \r\n ',
                nickname: ' Sir Pig of Guinea ',
                password: 'Cav11d43',
                admin: true
            }
            const match = {
                user_id,
                email: cleanEmail(update.email),
                nickname: update.nickname.trim(),
                admin: true
            }
            const result = await usersTable.update(update)
            expect(result).toMatchObject(match)
            expect(await usersTable.checkPassword(update.password, result)).toEqual(true)
        })

        it('does not update fields that are not provided', async () => {
            const update = {
                user_id,
                email: ' guinea.pig+party@example.com ',
                admin: !gp.admin
            }
            const match = {
                user_id,
                email: cleanEmail(update.email),
                nickname: gp.nickname,
                admin: update.admin
            }
            const result = await usersTable.update(update)
            expect(result).toMatchObject(match)
            expect(await usersTable.checkPassword(plaintextPassword, result)).toEqual(true)
        })

        it('can set the password or nickname to null', async () => {
            const update = {
                user_id,
                nickname: null,
                password: null
            }
            const match = {
                user_id,
                email: gp.email,
                nickname: null,
                password: null,
                admin: gp.admin
            }
            const result = await usersTable.update(update)
            expect(result).toMatchObject(match)
        })

        it('returns null if no user with the ID exists', async () => {
            const update = {
                user_id: user_id + 1,
                admin: true
            }
            const result = await usersTable.update(update)
            expect(result).toBeNull()
        })

        it('returns null if the ID is not a number', async () => {
            const update = {
                user_id: 'awesome',
                admin: true
            }
            const result = await usersTable.update(update as any)
            expect(result).toBeNull()
        })

        it('returns null if there is no valid info given to update', async () => {
            const update = {
                user_id,
                nickname: 12345
            }
            const result = await usersTable.update(update as any)
            expect(result).toBeNull()
        })

    })

})
