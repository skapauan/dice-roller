import { testConfig, testPrefix, getTestSchema } from './testconfig'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

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
