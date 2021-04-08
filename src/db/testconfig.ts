// These values are to be used in the test environment only

import { PoolConfig } from 'pg'

export let testPrefix: string = ''
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

    testPrefix = 'test_'

}
