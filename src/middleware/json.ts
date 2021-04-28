import contentType from 'content-type'
import { Request, Response, NextFunction } from 'express'
import { bodyParserErrors } from './body-parser-errors.js'

export const jsonErrors = {...bodyParserErrors}
jsonErrors['entity.parse.failed'] = 'Request did not have valid JSON syntax'
jsonErrors['notJson'] = 'Request is required to be in JSON format',
jsonErrors['default'] = 'Could not parse JSON body'

export const jsonPreCheck = (req: Request, res: Response, next: NextFunction) => {
    if (contentType.parse(req).type === 'application/json') {
        next()
    } else {
        res.statusCode = 400
        res.json({ error: jsonErrors['notJson'] })
    }
}

export const jsonCheck = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err)
    } else {
        let error: string = ''
        if (typeof err.type === 'string' && jsonErrors[err.type]) {
            error = jsonErrors[err.type]
        } else {
            error = jsonErrors.default
        }
        if (typeof err.statusCode === 'number' && err.statusCode >= 100 && err.statusCode <= 999) {
            res.statusCode = err.statusCode
        } else {
            res.statusCode = 500
        }
        res.json({ error })
    }
}
