import { cleanEmail } from './string'

describe('String processing functions', () => {

    describe('cleanEmail', () => {

        it('returns a trimmed and normalized email if valid', () => {
            expect(cleanEmail(' \r\n jane.doe+pro@gmail.com \xa0 \t ')).toEqual('janedoe@gmail.com')
        })

        it('returns undefined if normalized email is not valid', () => {
            expect(cleanEmail('invalid@.bad.example.com')).toEqual(undefined)
            expect(cleanEmail('')).toEqual(undefined)
        })

    })

})