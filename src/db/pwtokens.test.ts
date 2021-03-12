import pwtokensTable, {TokenResult} from './pwtokens'
import db from './db'
import { PoolClient } from 'pg'

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
    { token: '321', user_id: 2, expires: new Date('18 Jan 2058 17:00:00 GMT') },
    { token: '231', user_id: 3, expires: new Date() }
]

const absentTokens: Array<TokenToInsert> = [
    { token: '999', user_id: 4, expires: new Date(0) },
    { token: '888', user_id: 5, expires: new Date('23 Sep 1972 06:00:00 GMT') }
]

const clearTable = async (client?: PoolClient): Promise<void> => {
    await db.query('DELETE FROM pwtokens;', client)
}

const insertToken = async (token: TokenToInsert, client?: PoolClient): Promise<void> => {
    await db.query({
        text: 'INSERT INTO pwtokens (token, user_id, expires) VALUES ($1, $2, $3);',
        values: [token.token, token.user_id, token.expires]
    }, client)
}

const populateTestTokens = async (): Promise<void> => {
    const client = await db.getClient()
    try {
        await clearTable(client)
        for (let i = 0; i < testTokens.length; i++) {
            insertToken(testTokens[i], client)
        }
    } catch (error) {
        throw error
    } finally {
        client.release()
    }
}

const tableMatchesData = async (data: Array<TokenToInsert>): Promise<boolean> => {
    const table = await db.query(`SELECT * FROM pwtokens;`)
    if (table.rowCount !== data.length) {
        return false
    }
    const remainingTokens: Map<string, TokenToInsert> = new Map()
    data.forEach((token) => {
        remainingTokens.set(token.token, token)
    })
    for (let i = 0; i < data.length; i++) {
        const tableToken = table.rows[i]
        const originalToken = remainingTokens.get(tableToken.token)
        if (!originalToken) {
            return false
        }
        if (tableToken.user_id !== originalToken.user_id ||
            tableToken.expires.getTime() !== originalToken.expires.getTime()) {
            return false
        }
        remainingTokens.delete(tableToken.token)
    }
    return true
}

describe('Test helpers for password tokens table', () => {

    describe('tableMatchesData', () => {

        beforeEach(async () => {
            await clearTable()
        })

        it('returns true if table and data have the same list of entries', async () => {
            // List of zero
            expect(await tableMatchesData([])).toEqual(true)
            // List of one
            await insertToken(testTokens[0])
            expect(await tableMatchesData([ testTokens[0] ])).toEqual(true)
            // List of two
            await insertToken(testTokens[2])
            expect(await tableMatchesData([ testTokens[2], testTokens[0] ])).toEqual(true)
            expect(await tableMatchesData([ testTokens[0], testTokens[2] ])).toEqual(true)
        })

        it('returns false if table and data have different numbers of entries', async () => {
            // Table 0 vs. Data 1
            expect(await tableMatchesData([ testTokens[1] ])).toEqual(false)
            // Table 1 vs. Data 0
            await insertToken(testTokens[1])
            expect(await tableMatchesData([])).toEqual(false)
            // Table 1 vs. Data 2
            expect(await tableMatchesData([ testTokens[1], testTokens[2] ])).toEqual(false)
            // Table 3 vs. Data 2
            await insertToken(testTokens[0])
            await insertToken(testTokens[2])
            expect(await tableMatchesData([ testTokens[1], testTokens[2] ])).toEqual(false)
        })

        it('returns false if table and data entries differ (same number of entries)', async () => {
            // One entry
            await insertToken(testTokens[0])
            expect(await tableMatchesData([ testTokens[1] ])).toEqual(false)
            const aBitDifferent = { ...testTokens[0], expires: testTokens[1].expires }
            expect(await tableMatchesData([ aBitDifferent ])).toEqual(false)
            // Two entries
            await insertToken(testTokens[1])
            expect(await tableMatchesData([ testTokens[1], testTokens[2] ])).toEqual(false)
            const aLittleDifferent = { ...testTokens[1], user_id: testTokens[0].user_id }
            expect(await tableMatchesData([ testTokens[0], aLittleDifferent ])).toEqual(false)
        })
    
    })

    describe('populateTestTokens', () => {

        it('makes database match the test tokens list', async () => {
            await populateTestTokens()
            expect(await tableMatchesData(testTokens)).toEqual(true)
        })

    })

})

describe('Password tokens table', () => {

    describe('create', () => {
        
        it('creates a token from valid info and returns the token value', async () => {
            await clearTable()
            const user_id = testTokens[0].user_id
            const token = await pwtokensTable.create(user_id)
            expect(token.length).toBeGreaterThan(0)
            const data = await pwtokensTable.findByToken(token)
            expect(data).toMatchObject({ token, user_id })
            expect(typeof data.expires.getMonth).toEqual('function')
            expect(data.expires.getTime()).toBeGreaterThan(Date.now())
        })

    })

    describe('findByToken', () => {

        beforeAll(async () => {
            await populateTestTokens()
        })

        it('returns info for an existing token', async () => {
            for (let i = 0; i < testTokens.length; i++) {
                const pwToken = await pwtokensTable.findByToken(testTokens[i].token)
                expect(pwToken).toMatchObject(testTokens[i])
            }
        })

        it('returns null for a nonexistant token', async () => {
            for (let i = 0; i < absentTokens.length; i++) {
                const pwToken = await pwtokensTable.findByToken(absentTokens[i].token)
                expect(pwToken).toBeNull()
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

})
