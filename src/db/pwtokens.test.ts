import pwtokensTable from './pwtokens'
import db from './db'

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Password tokens table', () => {

    const tokens = [
        { token: '123', user_id: 1, expires: new Date('21 May 1990 09:00:00 GMT') },
        { token: '321', user_id: 2, expires: new Date('18 Jan 2058 17:00:00 GMT') },
        { token: '231', user_id: 3, expires: new Date() }
    ]

    const absentTokens = [
        { token: '999', user_id: 4, expires: new Date(0) },
        { token: '888', user_id: 5, expires: new Date('23 Sep 1972 06:00:00 GMT') }
    ]

    describe('create', () => {
        
        it('creates a token from valid info and returns the token value', async () => {
            await db.query('DELETE FROM pwtokens;')
            const user_id = tokens[0].user_id
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
            const client = await db.getClient()
            try {
                await db.query(`DELETE FROM pwtokens;`, client)
                const values = tokens.reduce((accumulator: Array<any>, current) => {
                    accumulator.push(current.token, current.user_id, current.expires)
                    return accumulator
                }, [])
                await db.query({
                    text: `INSERT INTO pwtokens (token, user_id, expires)
                        VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9);`,
                    values
                }, client)
            } catch (error) {
                throw error
            } finally {
                client.release()
            }
        })

        it('returns info for an existing token',
        () => {
            for (let i = 0; i < tokens.length; i++) {
                pwtokensTable.findByToken(tokens[i].token)
                .then((pwToken) => {
                    expect(pwToken).toMatchObject(tokens[i])
                })
            }
        })

        it('returns null for a nonexistant token',
        () => {
            for (let i = 0; i < absentTokens.length; i++) {
                pwtokensTable.findByToken(absentTokens[i].token)
                .then((pwToken) => {
                    expect(pwToken).toBeNull()
                })
            }
        })

    })

})
