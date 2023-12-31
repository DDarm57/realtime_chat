const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const port = 3000
var session = require('express-session')
const sharedSession = require('socket.io-express-session')

const { Server } = require('socket.io');
const { createServer } = require('node:http');
const server = createServer(app);
const io = new Server(server);

// Menentukan folder tempat file HTML berada
app.use(bodyParser.urlencoded({ extended: true }))
const htmlFolderPath = path.join(__dirname, 'views');

// Menyajikan file HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(htmlFolderPath, 'index.html'));
});

const sessionMiddleware = session({
  secret: 'your-secret-key', // Ganti dengan kunci rahasia yang aman
  resave: true,
  saveUninitialized: true,
});

app.use(sessionMiddleware);
io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));

// Middleware untuk pengecekan sesi
const checkSession = (req, res, next) => {
  if (!req.session.sess_name) {
    // Jika sesi tidak terisi, redirect ke halaman login
    return res.redirect('/');
  }
  next();
};

app.post('/login_chat', (req, res) => {
    const {name} = req.body
    req.session.sess_name = name
    io.on('connection', (socket) => {
      socket.handshake.session.username = name;
      socket.handshake.session.save(); // Menyimpan perubahan sesi
    });
    res.redirect('/chat_room')
})


app.get('/chat_room', checkSession, (req, res, next) => {
  res.sendFile(path.join(htmlFolderPath, 'chat_room.html'));
});


app.get('/get_session', (req, res)=>{
  const session_name = req.session.sess_name
  res.json({session_name})
})

io.on('connection', (socket) => {
  let socket_id = socket.id
  let get_user = 'a user connected Name : ' + socket.handshake.session.sess_name;
  socket.broadcast.emit("join chat", get_user)
  socket.on('chat message', (msg, name) => { 
    console.log(name + " : "+ msg ) 
    socket.broadcast.emit('new message', {message: msg, name: name});
  });

  socket.on('disconnect', () => {
    console.log('user '+socket.handshake.session.sess_name+' disconnected');
    socket.broadcast.emit('user disconnect', 'user '+socket.handshake.session.sess_name+' disconnected');
  });

  console.log('Session data:', socket.handshake.session);
});



server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})