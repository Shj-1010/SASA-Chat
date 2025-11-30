const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http'); // Node.js 기본 HTTP 모듈
const { Server } = require('socket.io'); // 소켓 IO
const MySQLStore = require('express-mysql-session')(session);
const db = require('./config/db');
const helmet = require('helmet'); // 보안 헤더
const rateLimit = require('express-rate-limit'); // 디도스 방지
const fs = require('fs'); // [추가 1] 파일 시스템 모듈 (폴더 만들기용)

dotenv.config();
require('./config/passport')(passport);

const app = express();

// [추가 2] 서버 켜질 때 'uploads' 폴더가 없으면 자동으로 만들기! (핵심)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('📁 uploads 폴더가 자동으로 생성되었습니다.');
}

// [중요] 클라우드타입(Proxy) 환경 신뢰 설정
app.set('trust proxy', 1);

const server = http.createServer(app); 

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5000, // 한 IP당 허용 횟수
  message: "너무 많은 요청을 보냈습니다. 15분 뒤에 다시 시도해주세요."
});
app.use(limiter);

// 소켓 설정
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: 3306, // 내부 접속용 포트 (mariadb 호스트 쓸 땐 3306)
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    createDatabaseTable: true 
});

// 미들웨어 설정
app.use(cors({ 
    origin: process.env.CLIENT_URL || "http://localhost:3000", 
    credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// [중요] 세션 설정 (하나만 있어야 함!)
app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET || 'secret_key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    
    // [중요 1] 클라우드타입(Proxy) 환경에서 쿠키를 믿도록 설정
    proxy: true, 

    // [중요 2] 쿠키 보안 설정 (HTTPS 전용)
    cookie: {
        httpOnly: true,
        secure: true,      // https 환경에서는 true여야 함!
        sameSite: 'none',  // 서로 다른 주소(프론트/백엔드) 간 쿠키 허용
        maxAge: 1000 * 60 * 60 * 24 // 1일
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// [중요] 업로드된 사진을 웹에서 볼 수 있게 열어주기
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 라우트
app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/friend', require('./routes/friend'));
app.use('/chat', require('./routes/chat'));
app.use('/recommend', require('./routes/recommend'));
app.use('/admin', require('./routes/admin'));

// (여기에 있던 중복된 session 설정은 지웠습니다!)

app.get('/', (req, res) => { res.send('SasaChat Server Running'); });

// --- ⚡️ 실시간 채팅 로직 (Socket.io + DB 연동) ---

let roomUsers = {}; 

io.on('connection', (socket) => {
  console.log(`⚡️ 소켓 연결됨: ${socket.id}`);

  // 1. 방 입장 (join_room)
  socket.on('join_room', async ({ roomId, nickname }) => {
    socket.join(roomId);

    // DB에서 지난 대화 내용 불러오기
    try {
        const [rows] = await db.query(
            `SELECT id, room_id, sender_nickname as sender, content as text, is_system as isSystem, created_at 
             FROM messages 
             WHERE room_id = ? 
             ORDER BY created_at ASC`, 
            [roomId]
        );
        socket.emit('chat_history', rows);
    } catch (err) {
        console.error("채팅 내역 불러오기 실패:", err);
    }

    // 유저 목록 관리
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    if (!roomUsers[roomId].find(u => u.nickname === nickname)) {
        roomUsers[roomId].push({ socketId: socket.id, nickname });
    }

    io.to(roomId).emit('room_users', {
      roomId,
      users: roomUsers[roomId].map(u => u.nickname),
      count: roomUsers[roomId].length
    });

    socket.to(roomId).emit('receive_message', {
      id: Date.now(),
      sender: '알림',
      text: `${nickname}님이 입장하셨습니다.`,
      isSystem: true
    });
  });

  // 2. 메시지 전송 (send_message)
  socket.on('send_message', async (data) => {
    try {
        await db.query(
            'INSERT INTO messages (room_id, sender_nickname, content, is_system) VALUES (?, ?, ?, ?)',
            [data.roomId, data.sender, data.text, false]
        );
    } catch (err) {
        console.error("메시지 저장 실패:", err);
    }
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