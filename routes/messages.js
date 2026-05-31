const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.get('/:chatId',      protect, c.getMessages)
router.post('/',            protect, c.sendMessage)
router.delete('/:id',       protect, c.deleteMessage)
router.post('/:id/react',   protect, c.addReaction)

module.exports = router
