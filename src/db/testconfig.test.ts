import { PoolConfig } from 'pg'

export const testPrefix: string = 'test_'
export const getTestSchema = () => testPrefix + process.env.JEST_WORKER_ID
export let testConfig: PoolConfig | undefined

if (process.env.NODE_ENV === 'test') {
    
    require('dotenv').config()

    interface Mapping {[index: string]: string}

    const mapEnvToConfig = (mapping: Mapping): Mapping | undefined => {
        let config: Mapping | undefined
        Object.keys(mapping).forEach((key) => {
            const value: string | undefined = process.env[mapping[key]]
            if (typeof value === 'string') {
                config = config || {}
                config[key] = value
            }
        })
        return config
    }

    testConfig = mapEnvToConfig({
        host: 'TEST_PGHOST',
        port: 'TEST_PGPORT',
        database: 'TEST_PGDATABASE',
        user: 'TEST_PGUSER',
        password: 'TEST_PGPASSWORD'
    })

}


// Verify the DB test config

const validIdentifier = /^[a-zA-Z_][a-zA-Z_0-9\$]*$/

describe('Test Config', () => {

    describe('testConfig', () => {

        it('maps TEST_PGHOST environment variable to host in the config', () => {
            expect(testConfig).not.toEqual(undefined)
            if (testConfig) {
                expect(testConfig.host).toEqual(process.env.TEST_PGHOST)
            }
        })

    })

    describe('testPrefix', () => {

        it('is a prefix that can be used to name schemas during testing', () => {
            expect(typeof testPrefix).toEqual('string')
            expect(testPrefix).toMatch(validIdentifier)
        })

    })

    describe('getTestSchema', () => {

        it('returns a schema name using testPrefix and the current Jest worker ID', () => {
            const schema = getTestSchema()
            expect(schema).toMatch(testPrefix + process.env.JEST_WORKER_ID)
            expect(schema).toMatch(validIdentifier)
        })

    })

})
