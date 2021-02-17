const db = require('./db')

const usersTable = {

    errors: {
        CREATE_EMAIL_REQUIRED: 'An email is required'
    },

    isEmpty: (client) => {
        return db.query(
            `SELECT CASE WHEN EXISTS (SELECT 1 FROM users) THEN 0 ELSE 1 END AS isempty`
            , client)
        .then((result) => {
            if (result.rows.length === 1) {
                if (result.rows[0].isempty === 0) {
                    return false
                }
                if (result.rows[0].isempty === 1) {
                    return true
                }
                throw new Error('Unexpected format in result')
            } else {
                throw new Error('Unexpected number of rows in result')
            }
        })
    },
    
    findByEmail: (email, client) => {
        return db.query({
            text: 'SELECT * FROM users WHERE email = $1;',
            values: [email]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return { ...result.rows[0] }
            } else {
                return null
            }
        })
    },

    create: (user, client) => {
        if (!user.email) {
            return Promise.reject(new Error(usersTable.errors.CREATE_EMAIL_REQUIRED))
        }
        return db.query({
            text: `INSERT INTO users (email, nickname, password, hash, admin) VALUES ($1, $2, $3, $4, $5);`,
            values: [user.email, user.nickname, user.password, user.hash, user.admin]
        }, client)
        .then((result) => {
            if (result.rowCount > 0) {
                return true
            } else {
                // We should not reach here
                return false
            }
        })
        .catch((error) => {
            return false
        })
    }

}

module.exports = usersTable