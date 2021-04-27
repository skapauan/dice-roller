import request from 'supertest'
import bodyParser from 'body-parser'
import express from 'express'
import { jsonCheck, jsonErrors } from './json'

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

describe('Middleware to check that json was parsed', () => {

    it('has a set of unique error messages', () => {
        Object.values(jsonErrors).forEach((e, i, errors) => {
            expect(typeof e).toEqual('string')
            expect(e.length).toBeGreaterThan(0)
            expect(errors.indexOf(e)).toEqual(i)
        })
    })

    it('responds with 400 and proper error message if request has invalid json', () => {
        return request(app)
            .post('/')
            .type('application/json')
            .send('{"invalid"}')
            .expect(400)
            .expect('Content-Type', /json/)
            .then((res) => {
                expect(res.body.error).toEqual(jsonErrors['entity.parse.failed'])
            })
    })

})
