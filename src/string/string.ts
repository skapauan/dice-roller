import normalizeEmail from 'normalize-email'
import emailValidator from 'email-validator'

export const stringOrNothing = (a:any): string | undefined => {
    return (typeof a === 'string') ? a : undefined
}

export const cleanEmail = (a: any): string | undefined => {
    if (typeof a !== 'string') {
        return undefined
    }
    const b = normalizeEmail(a.trim())
    return emailValidator.validate(b) ? b : undefined
}
