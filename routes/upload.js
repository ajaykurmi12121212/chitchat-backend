const router  = require('express').Router()
const multer  = require('multer')
const path    = require('path')
const { v4: uuid } = require('uuid')
const { protect } = require('../middleware/auth')

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename:    (_, file, cb) => cb(null, uuid() + path.extname(file.originalname))
})

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /jpeg|jpg|png|gif|mp4|mp3|ogg|webm|pdf|doc|docx|txt|xlsx/.test(
      path.extname(file.originalname).toLowerCase()
    )
    cb(null, ok)
  }
})

router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const fileUrl  = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  const fileSize = req.file.size > 1024*1024
    ? `${(req.file.size/1024/1024).toFixed(1)} MB`
    : `${Math.round(req.file.size/1024)} KB`
  res.json({ fileUrl, fileName: req.file.originalname, fileSize })
})

module.exports = router
