const db = require('./db')

const pwtokensTable = {
    
    findByToken: (token, client) => {
        return db.query({
            text: 'SELECT * FROM pwtokens WHERE token = $1;',
            values: [token]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            } else {
                return null
            }
        })
    }

}

module.exports = pwtokensTable