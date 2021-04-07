import dbconnection from './dbconnection'

describe('DB connection', () => {

    it('Should return an uninitialized DB instance', () => {
        // Reconsider this test if dbconnection.init() might get called in another test first
        expect(typeof dbconnection.isInit).toEqual('function')
        expect(dbconnection.isInit()).toEqual(false)
    })

})
