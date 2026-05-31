const jwt = require('jsonwebtoken')
const { User } = require('../models')

const protect = async (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' })
  try {
    const { id } = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    req.user = await User.findById(id).select('-password')
    if (!req.user) return res.status(401).json({ message: 'User not found' })
    next()
  } catch { res.status(401).json({ message: 'Invalid token' }) }
}

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })

module.exports = { protect, generateToken }
