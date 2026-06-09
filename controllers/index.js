const { User, Chat, Message, Status } = require('../models')
const { generateToken } = require('../middleware/auth')
const twilio = require('twilio')

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// ── AUTH ─────────────────────────────────────────────────────

// Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ message: 'Phone required' })

    await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({ to: `+91${phone}`, channel: 'sms' })

    res.json({ success: true, message: 'OTP sent' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

// Verify OTP + Login
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, code, name } = req.body
    if (!phone || !code) return res.status(400).json({ message: 'Phone and OTP required' })

    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code })

    if (result.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    let user = await User.findOne({ phone })
    if (!user) {
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || phone)}&background=16a34a&color=fff&size=128`
      user = await User.create({ name: name || phone, phone, avatar })
    }

    res.json({ ...user.toJSON(), token: generateToken(user._id) })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
}

exports.getMe = async (req, res) => res.json(req.user)

// ── USERS ─────────────────────────────────────────────────────
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json([])
    const users = await User.find({
      $or: [{ name:{$regex:q,$options:'i'} }, { phone:{$regex:q,$options:'i'} }],
      _id: { $ne: req.user._id }
    }).select('-password').limit(20)
    res.json(users)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id:{ $ne: req.user._id } }).select('-password').sort({ name:1 })
    res.json(users)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.updateProfile = async (req, res) => {
  try {
    const { name, about, phone, avatar } = req.body
    if (phone && phone !== req.user.phone) {
      const exists = await User.findOne({ phone, _id:{ $ne: req.user._id } })
      if (exists) return res.status(400).json({ message: 'Phone already taken' })
    }
    const user = await User.findByIdAndUpdate(req.user._id,
      { ...(name&&{name}), ...(about&&{about}), ...(phone&&{phone}), ...(avatar&&{avatar}) },
      { new: true }
    )
    res.json(user)
  } catch (e) { res.status(400).json({ message: e.message }) }
}

// ── CHATS ─────────────────────────────────────────────────────
exports.accessChat = async (req, res) => {
  try {
    const { userId } = req.body
    let chat = await Chat.findOne({ isGroup:false, members:{ $all:[req.user._id, userId] } })
      .populate('members', '-password')
      .populate({ path:'lastMessage', populate:{ path:'sender', select:'name avatar phone' } })
    if (!chat) {
      chat = await Chat.create({ members:[req.user._id, userId] })
      chat = await Chat.findById(chat._id).populate('members', '-password')
    }
    res.json(chat)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user._id })
      .populate('members', '-password')
      .populate('admin', '-password')
      .populate({ path:'lastMessage', populate:{ path:'sender', select:'name avatar phone' } })
      .sort({ updatedAt:-1 })
    res.json(chats)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body
    if (!name || !members || members.length < 2)
      return res.status(400).json({ message: 'Need name + at least 2 members' })
    const all    = [...new Set([...members, req.user._id.toString()])]
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&size=128`
    let group    = await Chat.create({ name, isGroup:true, members:all, admin:req.user._id, groupAvatar:avatar })
    group        = await Chat.findById(group._id).populate('members','-password').populate('admin','-password')
    res.status(201).json(group)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.addToGroup = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.id,
      { $addToSet:{ members: req.body.userId } }, { new:true })
      .populate('members','-password').populate('admin','-password')
    res.json(chat)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.removeFromGroup = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.id,
      { $pull:{ members: req.body.userId } }, { new:true })
      .populate('members','-password').populate('admin','-password')
    res.json(chat)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// ── MESSAGES ──────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const msgs = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id }
    })
      .populate('sender', 'name avatar phone')
      .populate('replyTo', 'content type sender')
      .sort({ createdAt:1 })
    await Message.updateMany(
      { chat: req.params.chatId, readBy:{ $ne: req.user._id } },
      { $addToSet:{ readBy: req.user._id } }
    )
    res.json(msgs)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, content, type='text', fileUrl, fileName, fileSize, duration, replyTo } = req.body
    let msg = await Message.create({
      chat:chatId, sender:req.user._id,
      content, type, fileUrl, fileName, fileSize, duration,
      replyTo, readBy:[req.user._id]
    })
    msg = await Message.findById(msg._id)
      .populate('sender', 'name avatar phone')
      .populate('replyTo', 'content type')
    await Chat.findByIdAndUpdate(chatId, { lastMessage:msg._id })
    res.status(201).json(msg)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.deleteMessage = async (req, res) => {
  try {
    const { forEveryone } = req.body
    if (forEveryone) {
      await Message.findByIdAndUpdate(req.params.id, { isDeleted:true, content:'This message was deleted' })
    } else {
      await Message.findByIdAndUpdate(req.params.id, { $addToSet:{ deletedFor: req.user._id } })
    }
    res.json({ success:true })
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.addReaction = async (req, res) => {
  try {
    const { emoji } = req.body
    const msg = await Message.findById(req.params.id)
    const ex  = msg.reactions.find(r => r.user.toString() === req.user._id.toString())
    if (ex) ex.emoji = emoji
    else msg.reactions.push({ user:req.user._id, emoji })
    await msg.save()
    res.json(msg.reactions)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

// ── STATUS ────────────────────────────────────────────────────
exports.createStatus = async (req, res) => {
  try {
    const { content, type='text', fileUrl, bgColor } = req.body
    const status = await Status.create({ user:req.user._id, content, type, fileUrl, bgColor })
    await status.populate('user', 'name avatar phone')
    res.status(201).json(status)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({ expiresAt:{ $gt: new Date() } })
      .populate('user', 'name avatar phone')
      .sort({ createdAt:-1 })
    const grouped = {}
    statuses.forEach(s => {
      const uid = s.user._id.toString()
      if (!grouped[uid]) grouped[uid] = { user:s.user, statuses:[] }
      grouped[uid].statuses.push(s)
    })
    res.json(Object.values(grouped))
  } catch (e) { res.status(500).json({ message: e.message }) }
}

exports.viewStatus = async (req, res) => {
  try {
    await Status.findByIdAndUpdate(req.params.id, { $addToSet:{ viewers: req.user._id } })
    res.json({ success:true })
  } catch (e) { res.status(500).json({ message: e.message }) }
}
