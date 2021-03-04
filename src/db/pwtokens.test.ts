import pwtokensTable from './pwtokens'
import db from './db'

beforeAll(async () => {
    await db.init()
})

afterAll(() => {
    db.end()
})

describe('Password tokens table', () => {

    describe('findByToken', () => {

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
                const values = tokens.reduce((accumulator: Array<any>, current) => {
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
