import testConfig, { testDbPrefix } from './testconfig'

if (process.env.NODE_ENV !== 'production') require('dotenv').config()

describe('Test Config', () => {

    it('Should map TEST_PGHOST to host in the config', () => {
        expect(testConfig).not.toEqual(undefined)
        if (testConfig) {
            expect(testConfig.host).toEqual(process.env.TEST_PGHOST)
        }
    })

    it('Should export a test DB prefix based on TEST_PGDATABASE', () => {
        expect(testDbPrefix).toEqual(process.env.TEST_PGDATABASE + '_')
    })

})
