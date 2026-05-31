const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const mongoose   = require('mongoose')
const cors       = require('cors')
const path       = require('path')
require('dotenv').config()

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
  pingTimeout: 60000,
  maxHttpBufferSize: 10e6
})

app.set('io', io)
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/users',    require('./routes/users'))
app.use('/api/chats',    require('./routes/chats'))
app.use('/api/messages', require('./routes/messages'))
app.use('/api/status',   require('./routes/status'))
app.use('/api/upload',   require('./routes/upload'))

app.get('/', (_, res) => res.json({ status: 'ChitChat API 🚀 Running!' }))

// Socket
require('./socket/handler')(io)

// Connect DB & Start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected')
    server.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`)
    )
  })
  .catch(err => { console.error('❌ MongoDB Error:', err.message); process.exit(1) })
