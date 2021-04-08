
import format from 'pg-format'
import DB from './db'
import { testConfig } from './testconfig'

const schema = 'just_testing_db'

// Test Helpers

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

// Tests

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

    describe('query', () => {
        const db1 = new DB(testConfig, schema)

        beforeAll(async () => await db1.init())
        afterAll(() => db1.end())

        it('connects to DB successfully', () => {
            return db1.query('SELECT NOW();')
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
            const db1 = new DB(testConfig)
            await db1.init()
            await dropTable(db1, schema, 'users')
            await dropTable(db1, schema, 'pwtokens')
            db1.end()
            // Init should re-create the tables in the schema
            const db2 = new DB(testConfig, schema)
            await db2.init()
            expect(await hasTable(db2, schema, 'users')).toEqual(true)
            expect(await hasTable(db2, schema, 'pwtokens')).toEqual(true)
            db2.end()
        })

    })

})

describe('Test helpers for DB manager', () => {

    describe('hasSchema', () => {
        const db1 = new DB(testConfig)
        const schema1 = 'just_testing_has_schema'

        beforeAll(async () => await db1.init())
        afterAll(() => db1.end())

        it('returns false if schema does not exist', async () => {
            await db1.query(format('DROP SCHEMA IF EXISTS %I CASCADE;', schema1))
            expect(await hasSchema(db1, schema1)).toEqual(false)
        })

        it('returns true if schema exists', async () => {
            await db1.query(format('CREATE SCHEMA %I;', schema1))
            expect(await hasSchema(db1, schema1)).toEqual(true)
        })

    })

    describe('dropSchema', () => {
        const db1 = new DB(testConfig)
        const schema1 = 'just_testing_drop_schema'

        beforeAll(async () => await db1.init())
        afterAll(() => db1.end())

        it('drops a schema if it exists', async () => {
            await db1.query(format('CREATE SCHEMA IF NOT EXISTS %I;', schema1))
            expect(await hasSchema(db1, schema1)).toEqual(true)
            await dropSchema(db1, schema1)
            expect(await hasSchema(db1, schema1)).toEqual(false)
        })

        it('throws no errors if schema does not exist', async () => {
            await dropSchema(db1, schema1)
            await dropSchema(db1, schema1)
        })

    })

    describe('hasTable', () => {
        const db1 = new DB(testConfig)
        const schema1 = 'just_testing_has_table'
        const table1 = 'testable'

        beforeAll(async () => await db1.init())
        afterAll(() => db1.end())

        it('returns false if table does not exist', async () => {
            await db1.query(format('CREATE SCHEMA IF NOT EXISTS %I;', schema1))
            await db1.query(format('DROP TABLE IF EXISTS %I.%I CASCADE;', schema1, table1))
            expect(await hasTable(db1, schema1, table1)).toEqual(false)
        })

        it('returns true if table exists', async () => {
            await db1.query(format('CREATE TABLE %I.%I ( favorite integer );', schema1, table1))
            expect(await hasTable(db1, schema1, table1)).toEqual(true)
        })

    })

    describe('dropTable', () => {
        const db1 = new DB(testConfig)
        const schema1 = 'just_testing_drop_table'
        const table1 = 'testable'

        beforeAll(async () => await db1.init())
        afterAll(() => db1.end())

        it('drops a table if it exists', async () => {
            await db1.query(format('CREATE SCHEMA IF NOT EXISTS %I;', schema1))
            await db1.query(
                format('CREATE TABLE IF NOT EXISTS %I.%I ( favorite integer );', schema1, table1)
            )
            expect(await hasTable(db1, schema1, table1)).toEqual(true)
            await dropTable(db1, schema1, table1)
            expect(await hasTable(db1, schema1, table1)).toEqual(false)
        })

        it('throws no errors if table does not exist', async () => {
            await dropTable(db1, schema1, table1)
            await dropTable(db1, schema1, table1)
        })

    })

})
