
import format from 'pg-format'
import DB from './db'
import { testConfig, getTestSchema } from '../test/config/db.test'

const schema = getTestSchema()

const hasSchema = (database: DB, schemaName: string): Promise<boolean> => {
    return database.query({
        text: 'SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1;',
        values: [schemaName]
    }).then((result) => result.rowCount > 0)
}

const dropSchema = (database: DB, schemaName: string): Promise<void> => {
    return database.query(
        format('DROP SCHEMA IF EXISTS %I CASCADE;', schemaName)
    ).then(() => undefined)
}

const hasTable = (database: DB, schemaName: string, tableName: string): Promise<boolean> => {
    return database.query({
        text: `SELECT * FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2;`,
        values: [schemaName, tableName]
    }).then((result) => result.rowCount > 0)
}

const dropTable = (database: DB, schemaName: string, tableName: string): Promise<void> => {
    return database.query(
        format('DROP TABLE IF EXISTS %I.%I CASCADE;', schemaName, tableName)
    ).then(() => undefined)
}

describe('DB manager', () => {

    describe('constructor', () => {

        it('sets config and schema values', () => {
            const db1 = new DB(testConfig, schema)
            expect(db1.config).toMatchObject(testConfig as {})
            expect(db1.schema).toMatch(schema)
        })

        it('sets config to undefined if not provided', () => {
            const db1 = new DB(undefined, schema)
            expect(db1.config).toBeUndefined()
            expect(db1.schema).toMatch(schema)
        })

        it('sets schema to "public" if not provided', () => {
            const db1 = new DB(testConfig, undefined)
            expect(db1.config).toMatchObject(testConfig as {})
            expect(db1.schema).toMatch('public')
        })

    })

    describe('end', () => {

        it('returns false before init', () => {
            const db1 = new DB(testConfig, schema)
            expect(db1.end()).toEqual(false)
        })

        it('returns true after init', async () => {
            const db1 = new DB(testConfig, schema)
            await db1.init()
            expect(db1.end()).toEqual(true)
        })

        it('returns false after init and end', async () => {
            const db1 = new DB(testConfig, schema)
            await db1.init()
            db1.end()
            expect(db1.end()).toEqual(false)
        })

    })

    describe('query', () => {
        const db1 = new DB(testConfig, schema)

        it('successfully performs a query if DB is init', async () => {
            await db1.init()
            await db1.query('SELECT NOW();')
        })

        it('rejects if DB is not init', () => {
            db1.end()
            expect(db1.query('SELECT NOW();')).rejects.toThrowError('Must init DB before using')
        })

    })

    describe('getClient', () => {
        const db1 = new DB(testConfig, schema)

        it('rejects if DB is not init', () => {
            expect(db1.getClient()).rejects.toThrowError('Must init DB before using')
        })

        it('returns a PoolClient if DB is init', async () => {
            await db1.init()
            const client = await db1.getClient()
            try {
                await db1.query('SELECT NOW();', client)
            } catch(e) {
                throw e
            } finally {
                client.release()
                db1.end()
            }
        })

    })

    describe('isInit', () => {
        const db1 = new DB(testConfig, schema)

        it('returns false before init', () => {
            expect(db1.isInit()).toEqual(false)
        })
    
        it('returns true after init', async () => {
            await db1.init()
            expect(db1.isInit()).toEqual(true)
        })
    
        it('returns false after end', () => {
            db1.end()
            expect(db1.isInit()).toEqual(false)
        })

    })

    describe('init', () => {

        it('creates a schema if given', async () => {
            // Drop the schema
            const db1 = new DB(testConfig)
            await db1.init()
            await dropSchema(db1, schema)
            db1.end()
            // Init with the schema should re-create the schema
            const db2 = new DB(testConfig, schema)
            await db2.init()
            expect(await hasSchema(db2, schema)).toEqual(true)
            db2.end()
        })

        it('creates the users and pwtokens tables', async () => {
            // Drop the tables from the schema
            const db1 = new DB(testConfig, schema)
            await db1.init()
            await dropTable(db1, schema, 'users')
            await dropTable(db1, schema, 'pwtokens')
            // Init should re-create the tables in the schema
            await db1.init()
            expect(await hasTable(db1, schema, 'users')).toEqual(true)
            expect(await hasTable(db1, schema, 'pwtokens')).toEqual(true)
            db1.end()
        })

    })

})
