import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg'
import DB from '../../db/db'

export const getQueryResult = (rows?: any[], command?: string): QueryResult => {
    return {
        rowCount: rows ? rows.length : 1,
        rows: rows || [{ myresult: 'yay' }],
        command: command || 'SELECT',
        oid: 0,
        fields: [{
            name: 'myresult',
            tableID: 0,
            columnID: 1,
            dataTypeID: 25,
            dataTypeSize: -1,
            dataTypeModifier: -1,
            format: 'text'
        }]
    }
}

export const getDbMock = (queryResponses: QueryResult[]) => {
    let responses = [...queryResponses]

    return class DBMock extends DB {
        private initStatus: boolean = false
        readonly config: PoolConfig | undefined
        readonly schema: string = 'public'

        constructor(config?: PoolConfig, schema?: string) {
            super(config, schema)
        }

        isInit(): boolean {
            return this.initStatus
        }

        init(): Promise<void> {
            this.initStatus = true
            return Promise.resolve()
        }
        
        getClient(): Promise<PoolClient> {
            return Promise.resolve({} as any)
        }

        query(statement: any, client?: PoolClient): Promise<QueryResult> {
            if (responses.length > 0) {
                const response = responses[0]
                responses.splice(0, 1)
                return Promise.resolve(response)
            }
            return Promise.reject(new Error('Yikes, an error!'))
        }

        end(): boolean {
            if (this.initStatus) {
                this.initStatus = false
                return true
            }
            return false
        }
    }
}

describe('Mock query result factory', () => {

    it('returns a valid example query result without any arguments', () => {
        const qr = getQueryResult()
        const eqr: QueryResult = {
            rowCount: 1,
            rows: [{ myresult: 'yay' }],
            command: 'SELECT',
            oid: 0,
            fields: [{
                name: 'myresult',
                tableID: 0,
                columnID: 1,
                dataTypeID: 25,
                dataTypeSize: -1,
                dataTypeModifier: -1,
                format: 'text'
            }]
        }
        expect(qr).toMatchObject(eqr)
    })

    it('returns a custom query result from arguments', () => {
        const qr = getQueryResult([
            { name: 'popsicle', has_stick: true },
            { name: 'corndog', has_stick: true },
            { name: 'taco', has_stick: false }
        ], 'INSERT')
        const eqr = {
            rowCount: 3,
            rows: [
                { name: 'popsicle', has_stick: true },
                { name: 'corndog', has_stick: true },
                { name: 'taco', has_stick: false }
            ],
            command: 'INSERT',
            oid: 0,
            fields: [{
                name: 'myresult',
                tableID: 0,
                columnID: 1,
                dataTypeID: 25,
                dataTypeSize: -1,
                dataTypeModifier: -1,
                format: 'text'
            }]
        }
        expect(qr).toMatchObject(eqr)
    })

})

describe('Mock DB', () => {

    it('responds to query with the designated results then throws errors thereafter', async () => {
        const results = [
            getQueryResult([{id: 777, flavor: 'vanilla'}]),
            getQueryResult([{id: 888, flavor: 'strawberry'}]),
            getQueryResult([{id: 999, flavor: 'chocolate'}])
        ]
        const DBMock = getDbMock(results)
        const db = new DBMock()
        const runQuery = async () => {
            return await db.query('SELECT * FROM icecreams;')
        }
        expect(runQuery()).resolves.toMatchObject(results[0])
        expect(runQuery()).resolves.toMatchObject(results[1])
        expect(runQuery()).resolves.toMatchObject(results[2])
        expect(runQuery()).rejects.toThrowError()
        expect(runQuery()).rejects.toThrowError()
    })

})
