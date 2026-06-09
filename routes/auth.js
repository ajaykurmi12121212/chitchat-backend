const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.post('/send-otp',    c.sendOTP)
router.post('/verify-otp',  c.verifyOTP)
router.post('/phone-login', c.phoneLogin)  // purana bhi rakha backward compat ke liye
router.get('/me',           protect, c.getMe)

module.exports = router
