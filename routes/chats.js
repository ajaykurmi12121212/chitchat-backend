const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.post('/',               protect, c.accessChat)
router.get('/',                protect, c.getChats)
router.post('/group',          protect, c.createGroup)
router.put('/:id/add',         protect, c.addToGroup)
router.put('/:id/remove',      protect, c.removeFromGroup)

module.exports = router
