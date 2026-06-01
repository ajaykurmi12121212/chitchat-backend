const router = require('express').Router()
const multer = require('multer')
const { v2: cloudinary } = require('cloudinary')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const { protect } = require('../middleware/auth')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'chitchat',
    resource_type: 'auto',
    public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
  }),
})

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 },
})

router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  res.json({
    fileUrl:  req.file.path,
    fileName: req.file.originalname,
    fileSize: req.file.size > 1024*1024
      ? `${(req.file.size/1024/1024).toFixed(1)} MB`
      : `${Math.round(req.file.size/1024)} KB`
  })
})

module.exports = router