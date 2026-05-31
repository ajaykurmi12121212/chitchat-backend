const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// USER
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, unique: true, sparse: true },
  email:    { type: String, lowercase: true, sparse: true },
  password: { type: String },
  avatar:   { type: String, default: '' },
  about:    { type: String, default: 'Hey there! I am using ChitChat 👋' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true })

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 10); next()
})
userSchema.methods.matchPassword = async function(p) { return bcrypt.compare(p, this.password) }
userSchema.methods.toJSON = function() { const o = this.toObject(); delete o.password; return o }
const User = mongoose.model('User', userSchema)

// CHAT
const chatSchema = new mongoose.Schema({
  name:        { type: String, trim: true },
  isGroup:     { type: Boolean, default: false },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admin:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupAvatar: { type: String, default: '' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true })
const Chat = mongoose.model('Chat', chatSchema)

// MESSAGE
const messageSchema = new mongoose.Schema({
  chat:       { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:    { type: String, default: '' },
  type:       { type: String, enum: ['text','image','video','audio','document','location','voice'], default: 'text' },
  fileUrl:    { type: String },
  fileName:   { type: String },
  fileSize:   { type: String },
  duration:   { type: String },
  readBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isDeleted:  { type: Boolean, default: false },
  reactions:  [{ user: mongoose.Schema.Types.ObjectId, emoji: String }],
}, { timestamps: true })
const Message = mongoose.model('Message', messageSchema)

// STATUS
const statusSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, default: '' },
  type:      { type: String, enum: ['text','image','video'], default: 'text' },
  fileUrl:   { type: String },
  bgColor:   { type: String, default: 'linear-gradient(135deg,#16a34a,#22c55e)' },
  viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) },
}, { timestamps: true })
const Status = mongoose.model('Status', statusSchema)

module.exports = { User, Chat, Message, Status }
