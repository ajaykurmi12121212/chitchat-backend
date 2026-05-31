const router = require('express').Router()
const c      = require('../controllers')
const { protect } = require('../middleware/auth')

router.post('/',           protect, c.createStatus)
router.get('/',            protect, c.getStatuses)
router.put('/:id/view',    protect, c.viewStatus)

module.exports = router
