import { cleanEmail, stringOrNothing } from './string'

describe('String processing functions', () => {

    describe('stringOrNothing', () => {
        it('returns the input if it is a string', () => {
            expect(stringOrNothing('a string')).toEqual('a string')
        })

        it('returns undefined if input is not a string', () => {
            expect(stringOrNothing(true)).toEqual(undefined)
        })
    })

    describe('cleanEmail', () => {

        it('returns a trimmed and normalized email if valid', () => {
            expect(cleanEmail(' \r\n jane.doe+pro@gmail.com \xa0 \t ')).toEqual('janedoe@gmail.com')
        })

        it('returns undefined if normalized email is not valid', () => {
            expect(cleanEmail('invalid@.bad.example.com')).toEqual(undefined)
            expect(cleanEmail('')).toEqual(undefined)
        })

        it('returns undefined if input is not a string', () => {
            expect(cleanEmail(null as any)).toEqual(undefined)
        })

    })

})