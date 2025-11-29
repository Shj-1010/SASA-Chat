const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http'); // [추가] Node.js 기본 HTTP 모듈
const { Server } = require('socket.io'); // [추가] 소켓 IO
const MySQLStore = require('express-mysql-session')(session);
const db = require('./config/db');
const helmet = require('helmet'); // [추가 1] 보안 헤더
const rateLimit = require('express-rate-limit'); // [추가 2] 디도스 방지

dotenv.config();
require('./config/passport')(passport);

const app = express();
const server = http.createServer(app); 

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 한 IP당 허용 횟수
  message: "너무 많은 요청을 보냈습니다. 15분 뒤에 다시 시도해주세요."
});
app.use(limiter);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // 프론트엔드 주소
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    // 세션 테이블 자동 생성 옵션
    createDatabaseTable: true 
});

// 미들웨어
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 라우트
app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/friend', require('./routes/friend'));
app.use('/chat', require('./routes/chat'));
app.use('/recommend', require('./routes/recommend'));
app.use('/admin', require('./routes/admin'));
app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET,
    store: sessionStore, // [중요] 저장소를 MySQL로 설정
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 // 1일 유지
    }
}));


app.get('/', (req, res) => { res.send('SasaChat Server Running'); });

// --- ⚡️ 실시간 채팅 로직 (Socket.io) ---

// 현재 각 방에 누가 있는지 저장할 메모리 (DB 대신 일단 메모리에 저장)
// 구조: { '방ID': [{socketId, nickname}, ...] }
// ... (위쪽 코드는 그대로 유지) ...

// --- ⚡️ 실시간 채팅 로직 (Socket.io + DB 연동) ---

let roomUsers = {}; 

io.on('connection', (socket) => {
  console.log(`⚡️ 소켓 연결됨: ${socket.id}`);

  // 1. 방 입장 (join_room)
  socket.on('join_room', async ({ roomId, nickname }) => {
    socket.join(roomId);

    // [NEW] DB에서 지난 대화 내용 불러오기
    try {
        const [rows] = await db.query(
            `SELECT id, room_id, sender_nickname as sender, content as text, is_system as isSystem, created_at 
             FROM messages 
             WHERE room_id = ? 
             ORDER BY created_at ASC`, 
            [roomId]
        );
        // 입장한 사람에게만 과거 내역 전송
        socket.emit('chat_history', rows);
    } catch (err) {
        console.error("채팅 내역 불러오기 실패:", err);
    }

    // 유저 목록 관리 (메모리)
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    // 중복 입장 방지
    if (!roomUsers[roomId].find(u => u.nickname === nickname)) {
        roomUsers[roomId].push({ socketId: socket.id, nickname });
    }

    // 입장 알림 (실시간)
    io.to(roomId).emit('room_users', {
      roomId,
      users: roomUsers[roomId].map(u => u.nickname),
      count: roomUsers[roomId].length
    });

    // 시스템 메시지: 입장 (DB 저장 X, 그냥 알림만)
    socket.to(roomId).emit('receive_message', {
      id: Date.now(),
      sender: '알림',
      text: `${nickname}님이 입장하셨습니다.`,
      isSystem: true
    });
  });

  // 2. 메시지 전송 (send_message)
  socket.on('send_message', async (data) => {
    // [NEW] DB에 메시지 영구 저장
    try {
        await db.query(
            'INSERT INTO messages (room_id, sender_nickname, content, is_system) VALUES (?, ?, ?, ?)',
            [data.roomId, data.sender, data.text, false]
        );
    } catch (err) {
        console.error("메시지 저장 실패:", err);
    }

    // 나를 포함한 방 사람들에게 전송 (실시간 표시용)
    // 주의: 프론트에서 내가 보낸 건 이미 표시했으므로, 나 제외하고 보낼지, 
    // 아니면 다 보낼지 결정해야 하는데, 기존 로직(나 제외) 유지
    socket.to(data.roomId).emit('receive_message', data);
  });

  // 3. 퇴장 처리
  const handleDisconnect = () => {
    for (const roomId in roomUsers) {
      const index = roomUsers[roomId].findIndex(u => u.socketId === socket.id);
      if (index !== -1) {
        const leaver = roomUsers[roomId][index];
        roomUsers[roomId].splice(index, 1);

        io.to(roomId).emit('room_users', {
          roomId,
          users: roomUsers[roomId].map(u => u.nickname),
          count: roomUsers[roomId].length
        });
        
        io.to(roomId).emit('receive_message', {
          id: Date.now(),
          sender: '알림',
          text: `${leaver.nickname}님이 퇴장하셨습니다.`,
          isSystem: true
        });
        break; 
      }
    }
  };

  socket.on('leave_room', handleDisconnect);
  socket.on('disconnect', handleDisconnect);
});

server.listen(PORT, () => {
    console.log(`📡 서버(Socket+DB)가 ${PORT}번 포트에서 실행 중입니다.`);
});