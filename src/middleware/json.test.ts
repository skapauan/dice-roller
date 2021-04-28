import request from 'supertest'
import bodyParser from 'body-parser'
import express, { Request, Response, NextFunction } from 'express'
import { jsonPreCheck, jsonCheck, jsonErrors } from './json'

describe('Middleware to ensure that content type is json', () => {

    it('responds with 400 and related error message if content type is not json', () => {
        const router = express.Router()
        router.use(jsonPreCheck)
        router.use(bodyParser.json())
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })
        
        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('text/html')
            .send('<p>{"doesThisCountAsJson":"oh yeah totally"}</p>')
            .expect(400)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body.error).toEqual(jsonErrors['notJson'])
                expect(res.body.success).toEqual(false)
            })
    })

    it('passes to next if content type is json', () => {
        const router = express.Router()
        router.use(jsonPreCheck)
        router.use(bodyParser.json())
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })
        
        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('application/json')
            .send({valid: true})
            .expect(200)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body).not.toHaveProperty('error')
                expect(res.body.success).toEqual(true)
            })
    })

})

describe('Middleware to ensure that json was parsed', () => {

    it('has a set of unique error messages', () => {
        Object.values(jsonErrors).forEach((e, i, errors) => {
            expect(typeof e).toEqual('string')
            expect(e.length).toBeGreaterThan(0)
            expect(errors.indexOf(e)).toEqual(i)
        })
    })

    it('responds with 400 and related error message if body-parser finds invalid json', () => {
        const router = express.Router()
        router.use(bodyParser.json())
        router.use(jsonCheck)
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })
        
        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('application/json')
            .send('{"invalid"}')
            .expect(400)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body.error).toEqual(jsonErrors['entity.parse.failed'])
                expect(res.body.success).toEqual(false)
            })
    })

    it(`responds with the error status code and a generic error message
            if the error is not a known body parser error`, () => {
        const router = express.Router()
        router.use((req, res, next) => {
            next({
                message: 'Just some arbitrary error',
                statusCode: 418
            })
        })
        router.use(jsonCheck)
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })

        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('application/json')
            .send({ coffee: true })
            .expect(418)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body.error).toEqual(jsonErrors['default'])
                expect(res.body.success).toEqual(false)
            })
    })

    it('responds with 500 if the error has no status code', () => {
        const router = express.Router()
        router.use((req, res, next) => {
            next({
                message: 'Just some arbitrary error'
            })
        })
        router.use(jsonCheck)
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })

        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('application/json')
            .send({ coffee: true })
            .expect(500)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body.error).toEqual(jsonErrors['default'])
                expect(res.body.success).toEqual(false)
            })
    })

    it('passes error to next if headers were already sent', () => {
        const errorSent = 'Coffee maker is broken!'
        let errorReceived = ''

        const router = express.Router()
        router.use((req, res, next) => {
            res.statusCode = 418
            res.json({ succeeded: false })
            next(new Error(errorSent))
        })
        router.use(jsonCheck)
        router.use((err: any, req: Request, res: Response, next: NextFunction) => {
            errorReceived = err.message
            next(err)
        })
        router.route('/')
        .post((req, res, next) => {
            res.statusCode = 200
            res.json({ success: true })
        })

        const app = express()
        app.use('/', router)

        return request(app)
            .post('/')
            .type('application/json')
            .send({ coffee: true })
            .expect(418)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body).not.toHaveProperty('success')
                expect(res.body).not.toHaveProperty('error')
                expect(res.body.succeeded).toEqual(false)
                expect(errorReceived).toEqual(errorSent)
            })
    })

})
