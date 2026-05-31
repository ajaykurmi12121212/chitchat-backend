const { User } = require('../models')
const online   = new Map() // userId -> socketId

module.exports = (io) => {
  io.on('connection', (socket) => {

    // User online
    socket.on('user:online', async (userId) => {
      online.set(userId, socket.id)
      socket.userId = userId
      await User.findByIdAndUpdate(userId, { isOnline:true, lastSeen:Date.now() })
      io.emit('user:status', { userId, isOnline:true })
      socket.emit('users:online', Array.from(online.keys()))
    })

    // Join / leave chat room
    socket.on('chat:join',  (chatId) => socket.join(chatId))
    socket.on('chat:leave', (chatId) => socket.leave(chatId))

    // New message
    socket.on('message:send', (msg) => {
      socket.to(msg.chat).emit('message:receive', msg)
    })

    // Typing
    socket.on('typing:start', ({ chatId, user }) => {
      socket.to(chatId).emit('typing:start', { chatId, user })
    })
    socket.on('typing:stop', ({ chatId, userId }) => {
      socket.to(chatId).emit('typing:stop', { chatId, userId })
    })

    // Read receipt
    socket.on('message:read', ({ chatId, userId }) => {
      socket.to(chatId).emit('message:read', { chatId, userId })
    })

    // Reactions
    socket.on('message:react', ({ messageId, chatId, emoji, userId }) => {
      socket.to(chatId).emit('message:react', { messageId, emoji, userId })
    })

    // Status
    socket.on('status:new', (status) => {
      socket.broadcast.emit('status:new', status)
    })

    // Voice/Video call
    socket.on('call:offer',  ({ to, offer, callType, caller }) => {
      const sid = online.get(to)
      if (sid) io.to(sid).emit('call:incoming', { offer, callType, caller })
    })
    socket.on('call:answer', ({ to, answer }) => {
      const sid = online.get(to)
      if (sid) io.to(sid).emit('call:answer', { answer })
    })
    socket.on('call:ice',    ({ to, ice }) => {
      const sid = online.get(to)
      if (sid) io.to(sid).emit('call:ice', { ice })
    })
    socket.on('call:reject', ({ to }) => {
      const sid = online.get(to)
      if (sid) io.to(sid).emit('call:rejected')
    })
    socket.on('call:end',    ({ to }) => {
      const sid = online.get(to)
      if (sid) io.to(sid).emit('call:ended')
    })

    // Disconnect
    socket.on('disconnect', async () => {
      if (socket.userId) {
        online.delete(socket.userId)
        const lastSeen = Date.now()
        await User.findByIdAndUpdate(socket.userId, { isOnline:false, lastSeen })
        io.emit('user:status', { userId:socket.userId, isOnline:false, lastSeen })
      }
    })
  })
}
