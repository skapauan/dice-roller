import { Request, Response, NextFunction } from 'express'
import { bodyParserErrors } from './body-parser-errors.js'

export const jsonErrors = {...bodyParserErrors}
jsonErrors['entity.parse.failed'] = 'Request did not have valid JSON syntax'
jsonErrors['default'] = 'Could not parse JSON body'

export const jsonCheck = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err)
    } else {
        let error: string = ''
        if (typeof err.type === 'string') {
            error = jsonErrors[err.type] || jsonErrors.default
        } else {
            error = jsonErrors.default
        }
        res.statusCode = err.statusCode
        res.json({ error })
    }
}
