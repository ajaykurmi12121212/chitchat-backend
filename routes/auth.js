const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.post('/send-otp',    c.sendOTP)
router.post('/verify-otp',  c.verifyOTP)

router.get('/me',           protect, c.getMe)

module.exports = router
