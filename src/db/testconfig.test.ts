import { testConfig, testPrefix } from './testconfig'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

describe('Test Config', () => {

    it('Should map TEST_PGHOST to host in the config', () => {
        expect(testConfig).not.toEqual(undefined)
        if (testConfig) {
            expect(testConfig.host).toEqual(process.env.TEST_PGHOST)
        }
    })

})

describe('Test Prefix', () => {

    it('Is a prefix that can be used to name schemas during testing', () => {
        expect(typeof testPrefix).toEqual('string')
        expect(testPrefix).toMatch(/^[a-zA-Z_][a-zA-Z_0-9\$]*$/)
    })

})
