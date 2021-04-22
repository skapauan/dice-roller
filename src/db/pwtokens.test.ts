import { PoolClient } from 'pg'
import format from 'pg-format'
import PwTokensTable from './pwtokens'
import { testConfig, getTestSchema } from '../test/config/db.test'
import DB from './db'

const schema = getTestSchema()
const db = new DB(testConfig, schema)
const pwtokensTable = new PwTokensTable(db)

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

interface TokenToInsert {
    token: string;
    user_id: number;
    expires: Date;
}

const testTokens: Array<TokenToInsert> = [
    { token: '123', user_id: 1, expires: new Date('21 May 1990 09:00:00 GMT') },
    { token: '132', user_id: 2, expires: new Date('18 Jan 2058 17:00:00 GMT') },
    { token: '213', user_id: 3, expires: new Date('11 Mar 2020 11:00:00 GMT') },
    { token: '231', user_id: 4, expires: new Date('13 Feb 1989 18:00:00 GMT') },
    { token: '312', user_id: 5, expires: new Date('06 Jun 2067 23:00:00 GMT') },
    { token: '321', user_id: 6, expires: new Date('01 Apr 2071 02:00:00 GMT') }
]

const absentTokens: Array<TokenToInsert> = [
    { token: '777', user_id: 7, expires: new Date('23 Sep 1972 06:00:00 GMT') },
    { token: '888', user_id: 8, expires: new Date('30 Oct 2046 13:00:00 GMT') }
]

const clearTable = async (client?: PoolClient): Promise<void> => {
    await db.query(format('DELETE FROM %I.pwtokens;', schema), client)
}

const insertToken = async (token: TokenToInsert, client?: PoolClient): Promise<void> => {
    await db.query({
        text: format(
            'INSERT INTO %I.pwtokens (token, user_id, expires) VALUES ($1, $2, $3);',
            schema),
        values: [token.token, token.user_id, token.expires]
    }, client)
}

const populateTestTokens = async (): Promise<void> => {
    const client = await db.getClient()
    try {
        await clearTable(client)
        for (let i = 0; i < testTokens.length; i++) {
            await insertToken(testTokens[i], client)
        }
    } catch (error) {
        throw error
    } finally {
        client.release()
    }
}

const tableMatchesData = async (data: Array<TokenToInsert>): Promise<boolean> => {
    const remainingTokens: Map<string, TokenToInsert> = new Map()
    data.forEach((token) => {
        remainingTokens.set(token.token, token)
    })
    if (remainingTokens.size !== data.length) {
        return Promise.reject(new Error('Duplicate tokens in data'))
    }
    const table = await db.query(format('SELECT * FROM %I.pwtokens;', schema))
    if (table.rowCount !== data.length) {
        return false
    }
    for (let i = 0; i < data.length; i++) {
        const tableToken = table.rows[i]
        const originalToken = remainingTokens.get(tableToken.token)
        if (!originalToken) {
            return false
        }
        if (tableToken.expires.getTime() !== originalToken.expires.getTime()) {
            return false
        }
        if (tableToken.user_id !== originalToken.user_id) {
            return false
        }
        remainingTokens.delete(tableToken.token)
    }
    return true
}

describe('Password tokens table', () => {

    describe('findByToken', () => {

        beforeAll(async () => {
            await populateTestTokens()
        })

        it('returns info for an existing token', async () => {
            for (let i = 0; i < testTokens.length; i++) {
                const pwToken = await pwtokensTable.findByToken(testTokens[i].token)
                expect(pwToken).toMatchObject(testTokens[i])
                expect(pwToken.expired).toEqual(Date.now() > testTokens[i].expires.getTime())
            }
        })

        it('returns null for a nonexistant token', async () => {
            for (let i = 0; i < absentTokens.length; i++) {
                const pwToken = await pwtokensTable.findByToken(absentTokens[i].token)
                expect(pwToken).toBeNull()
            }
        })

    })

    describe('create', () => {
        
        it('creates a token and returns the token value', async () => {
            await clearTable()
            for (let i = 0; i < testTokens.length; i++) {
                const user_id = testTokens[i].user_id
                const token = await pwtokensTable.create(user_id)
                expect(token.length).toBeGreaterThan(0)
                const data = await pwtokensTable.findByToken(token)
                expect(data).toMatchObject({ token, user_id })
                expect(data.expires.getTime()).toBeGreaterThan(Date.now())
                expect(data.expired).toEqual(false)
            }
        })

    })

    describe('deleteByToken', () => {

        beforeEach(async () => {
            await populateTestTokens()
        })

        it('returns true and deletes an existing token', async () => {
            const result = await pwtokensTable.deleteByToken(testTokens[1].token)
            expect(result).toEqual(true)
            const expectedData = [...testTokens]
            expectedData.splice(1, 1)
            const matches = await tableMatchesData(expectedData)
            expect(matches).toEqual(true)
        })

        it('returns false and makes no changes if token does not exist', async () => {
            const result = await pwtokensTable.deleteByToken(absentTokens[0].token)
            expect(result).toEqual(false)
            const matches = await tableMatchesData(testTokens)
            expect(matches).toEqual(true)
        })

    })

    describe('deleteExpired', () => {
        
        it('deletes expired tokens and returns how many it deleted', async () => {
            const now = Date.now()
            const currentTokens: Array<TokenToInsert> = []
            const expiredCount = testTokens.reduce((count, token) => {
                if (token.expires.getTime() < now) {
                    // token is expired
                    return count + 1
                }
                currentTokens.push(token)
                return count
            }, 0)
            await populateTestTokens()
            const result = await pwtokensTable.deleteExpired()
            expect(result).toEqual(expiredCount)
            expect(await tableMatchesData(currentTokens)).toEqual(true)
        })

    })

    describe('deleteAll', () => {
        
        it('deletes all tokens and returns how many it deleted', async () => {
            await populateTestTokens()
            const result = await pwtokensTable.deleteAll()
            expect(result).toEqual(testTokens.length)
            expect(await tableMatchesData([])).toEqual(true)
        })

    })

})
