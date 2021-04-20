import normalizeEmail from 'normalize-email'
import emailValidator from 'email-validator'

export const cleanEmail = (a: string): string | undefined => {
    const b = normalizeEmail(a.trim())
    return emailValidator.validate(b) ? b : undefined
}
