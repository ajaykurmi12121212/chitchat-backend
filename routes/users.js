const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.get('/search',  protect, c.searchUsers)
router.get('/all',     protect, c.getAllUsers)
router.put('/profile', protect, c.updateProfile)

module.exports = router
