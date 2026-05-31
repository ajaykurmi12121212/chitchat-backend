const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.post('/phone-login', c.phoneLogin)
router.get('/me',           protect, c.getMe)

module.exports = router
