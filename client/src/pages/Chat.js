import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaPlus, FaUserFriends, FaPaperclip, FaArrowLeft, FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import api from '../api';
import io from 'socket.io-client';

// 환경변수 또는 하드코딩된 주소 사용
const socket = io.connect("https://port-0-sasa-chat-mijx5epp1435215a.sel3.cloudtype.app");

const Chat = ({ user }) => {
  const [activeRoom, setActiveRoom] = useState(null); 
  const [showUserList, setShowUserList] = useState(false);
  const [chatRooms, setChatRooms] = useState([]); // 초기값 빈 배열
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [roomUsers, setRoomUsers] = useState([]); 
  const messageEndRef = useRef(null);

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomTags, setNewRoomTags] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // 시간 포맷
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
  };

  // 1. 내 채팅방 목록 가져오기 (안전장치 추가)
  const fetchRooms = async () => {
    try {
      // [수정] 전체 목록이 아니라 '내 목록'을 가져옴
      const res = await api.get('/chat/my-rooms');
      
      // [중요] 데이터가 배열인지 확인하고 넣음 (화면 하얘짐 방지)
      if (Array.isArray(res.data)) {
        setChatRooms(res.data);
      } else {
        console.error("채팅방 데이터가 배열이 아닙니다:", res.data);
        setChatRooms([]); 
      }
    } catch (err) {
      console.error("채팅방 목록 불러오기 실패:", err);
      setChatRooms([]); // 에러나면 빈 목록 보여줌
    }
  };

  useEffect(() => {
    fetchRooms();

    // 소켓 이벤트 리스너
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('chat_history', (history) => {
        setMessages(history);
    });

    socket.on('room_users', (data) => {
        setRoomUsers(data.users);
    });

    return () => {
      socket.off('receive_message');
      socket.off('chat_history');
      socket.off('room_users');
    };
  }, []);

  // 스크롤 자동 이동
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 방 만들기
  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim()) return alert("방 제목을 입력하세요.");
    try {
        await api.post('/chat/room', { 
            title: newRoomTitle, 
            hashtags: newRoomTags 
        });
        setIsCreateModalOpen(false);
        setNewRoomTitle('');
        setNewRoomTags('');
        fetchRooms(); // 목록 새로고침
    } catch (err) {
        alert("방 만들기 실패!");
    }
  };

  // 방 입장
  const enterRoom = (room) => {
    setActiveRoom(room);
    // 소켓으로 방 입장 알림
    socket.emit('join_room', { roomId: room.id, nickname: user.nickname });
  };

  // 메시지 전송
  const sendMessage = () => {
    if (!inputText.trim() || !activeRoom) return;
    const msgData = {
      roomId: activeRoom.id,
      sender: user.nickname,
      text: inputText,
      time: new Date().toISOString(), // DB 저장용 시간
      isSystem: false
    };

    // 소켓 전송 -> (서버가 DB 저장 후) -> 나를 포함한 모두에게 receive_message
    // 참고: 내 화면에 바로 띄우고 싶다면 여기서 setMessages 해도 됨
    socket.emit('send_message', msgData);
    
    // [옵션] 즉각 반응을 위해 내 화면엔 바로 추가 (서버 응답 기다리지 않음)
    setMessages((prev) => [...prev, msgData]);
    
    setInputText('');
  };

  // 방 나가기
  const handleLeaveRoom = async () => {
      if(!activeRoom) return;
      try {
          // 서버 API 호출 (참여자 목록에서 삭제)
          await api.delete(`/chat/room/${activeRoom.id}`);
          
          socket.emit('leave_room');
          setActiveRoom(null);
          setIsLeaveModalOpen(false);
          fetchRooms(); // 목록 새로고침
      } catch(err) {
          alert("나가기 실패");
      }
  };

  // 신고하기
  const handleReport = async () => {
      if(!reportTarget || !reportReason) return alert("내용을 입력해주세요.");
      try {
          await api.post('/admin/report', { targetId: null, reason: reportReason, description: `채팅방 신고: ${reportTarget}` });
          alert("신고가 접수되었습니다.");
          setIsReportModalOpen(false);
      } catch(err) {
          alert("신고 실패");
      }
  };

  return (
    <Container>
      {/* 1. 채팅방 목록 화면 (activeRoom이 없을 때) */}
      {!activeRoom && (
        <>
          <Header>
            <Title>채팅</Title>
            <CreateBtn onClick={() => setIsCreateModalOpen(true)}>
                <FaPlus /> 방 만들기
            </CreateBtn>
          </Header>
          <RoomList>
            {/* [안전장치] chatRooms가 있을 때만 map 실행 */}
            {chatRooms && chatRooms.length > 0 ? (
                chatRooms.map((room) => (
                    <RoomItem key={room.id} onClick={() => enterRoom(room)}>
                        <RoomIcon>{room.title ? room.title[0] : '?'}</RoomIcon>
                        <RoomInfo>
                        <RoomTitle>
                            {room.title}
                            {/* 해시태그 표시 */}
                            {room.hashtags && <Tags>{room.hashtags}</Tags>}
                        </RoomTitle>
                        <LastMsg>입장하여 대화를 시작하세요.</LastMsg>
                        </RoomInfo>
                    </RoomItem>
                ))
            ) : (
                <EmptyMsg>참여 중인 채팅방이 없습니다.<br/>추천 탭에서 새로운 방을 찾아보세요!</EmptyMsg>
            )}
          </RoomList>
        </>
      )}

      {/* 2. 채팅방 내부 화면 (activeRoom이 있을 때) */}
      {activeRoom && (
        <ChatRoom>
            <ChatHeader>
                <BackBtn onClick={() => { setActiveRoom(null); socket.emit('leave_room'); }}>
                    <FaArrowLeft />
                </BackBtn>
                <RoomName>{activeRoom.title}</RoomName>
                <HeaderIcons>
                    <IconBtn onClick={() => setShowUserList(!showUserList)}><FaUserFriends /></IconBtn>
                    <IconBtn onClick={() => setIsReportModalOpen(true)}><FaExclamationTriangle /></IconBtn>
                    <IconBtn onClick={() => setIsLeaveModalOpen(true)}><FaSignOutAlt /></IconBtn>
                </HeaderIcons>
            </ChatHeader>
            
            {showUserList && (
                <UserListBar>
                    <h4>참여자 ({roomUsers.length})</h4>
                    {roomUsers.map((u, i) => <UserItem key={i}>{u}</UserItem>)}
                </UserListBar>
            )}

            <MessageArea>
                {messages.map((msg, idx) => (
                    <MessageRow key={idx} isMe={msg.sender === user.nickname} isSystem={msg.isSystem}>
                        {msg.isSystem ? (
                            <SystemMsg>{msg.text}</SystemMsg>
                        ) : (
                            <>
                                {!msg.isSystem && msg.sender !== user.nickname && <Sender>{msg.sender}</Sender>}
                                <Bubble isMe={msg.sender === user.nickname}>{msg.text}</Bubble>
                                <Time>{msg.time ? formatTime(msg.time) : ''}</Time>
                            </>
                        )}
                    </MessageRow>
                ))}
                <div ref={messageEndRef} />
            </MessageArea>

            <InputArea>
                <AttachBtn><FaPaperclip /></AttachBtn>
                <Input 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="메시지를 입력하세요..." 
                />
                <SendBtn onClick={sendMessage}>전송</SendBtn>
            </InputArea>
        </ChatRoom>
      )}

      {/* --- 모달들 --- */}
      
      {/* 방 만들기 모달 */}
      {isCreateModalOpen && (
          <ModalOverlay onClick={() => setIsCreateModalOpen(false)}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <h3>새 채팅방 만들기</h3>
                  <ModalInput placeholder="방 제목 (예: 2학년 모여라)" value={newRoomTitle} onChange={e=>setNewRoomTitle(e.target.value)} />
                  <ModalInput placeholder="해시태그 (예: #운동 #농구)" value={newRoomTags} onChange={e=>setNewRoomTags(e.target.value)} />
                  <ModalFooter>
                      <Button onClick={() => setIsCreateModalOpen(false)}>취소</Button>
                      <PrimaryButton onClick={handleCreateRoom}>만들기</PrimaryButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

      {/* 나가기 확인 모달 */}
      {isLeaveModalOpen && (
          <ModalOverlay onClick={() => setIsLeaveModalOpen(false)}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <h3>채팅방 나가기</h3>
                  <p>정말 이 방을 나가시겠습니까?<br/>대화 내용이 사라질 수 있습니다.</p>
                  <ModalFooter>
                      <Button onClick={() => setIsLeaveModalOpen(false)}>취소</Button>
                      <DangerButton onClick={handleLeaveRoom}>나가기</DangerButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

      {/* 신고 모달 */}
      {isReportModalOpen && (
          <ModalOverlay onClick={() => setIsReportModalOpen(false)}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <h3>신고하기</h3>
                  <ModalInput placeholder="신고 대상 (닉네임)" value={reportTarget} onChange={e=>setReportTarget(e.target.value)} />
                  <ModalTextArea placeholder="신고 사유를 적어주세요." value={reportReason} onChange={e=>setReportReason(e.target.value)} />
                  <ModalFooter>
                      <Button onClick={() => setIsReportModalOpen(false)}>취소</Button>
                      <DangerButton onClick={handleReport}>신고접수</DangerButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}
    </Container>
  );
};

export default Chat;

// --- Styled Components (기존 유지) ---
const Container = styled.div` padding: 20px; height: 100%; display: flex; flex-direction: column; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; `;
const Title = styled.h2` font-size: 24px; font-weight: bold; `;
const CreateBtn = styled.button` background: #4a90e2; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: bold; &:hover { background: #357abd; } `;
const RoomList = styled.div` flex: 1; overflow-y: auto; `;
const EmptyMsg = styled.div` text-align: center; margin-top: 50px; color: #aaa; `;
const RoomItem = styled.div` background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; align-items: center; cursor: pointer; transition: 0.2s; &:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); } `;
const RoomIcon = styled.div` width: 50px; height: 50px; background: #e3f2fd; color: #4a90e2; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin-right: 15px; `;
const RoomInfo = styled.div` flex: 1; `;
const RoomTitle = styled.div` font-weight: bold; font-size: 16px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; `;
const Tags = styled.span` font-size: 12px; color: #4a90e2; background: #f0f8ff; padding: 2px 8px; border-radius: 10px; font-weight: normal; `;
const LastMsg = styled.div` font-size: 13px; color: #888; `;
const ChatRoom = styled.div` height: 100%; display: flex; flex-direction: column; background: #f5f6fa; border-radius: 15px; overflow: hidden; `;
const ChatHeader = styled.div` background: white; padding: 15px; display: flex; align-items: center; border-bottom: 1px solid #eee; `;
const BackBtn = styled.button` background: none; border: none; font-size: 18px; cursor: pointer; margin-right: 15px; color: #555; `;
const RoomName = styled.div` font-weight: bold; font-size: 18px; flex: 1; `;
const HeaderIcons = styled.div` display: flex; gap: 15px; `;
const IconBtn = styled.button` background: none; border: none; font-size: 18px; color: #555; cursor: pointer; &:hover { color: #333; } `;
const UserListBar = styled.div` background: white; padding: 10px 15px; border-bottom: 1px solid #eee; h4 { margin: 0 0 10px 0; font-size: 14px; color: #666; } `;
const UserItem = styled.span` display: inline-block; background: #eee; padding: 4px 10px; border-radius: 15px; font-size: 12px; margin-right: 5px; margin-bottom: 5px; `;
const MessageArea = styled.div` flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; `;
const MessageRow = styled.div` display: flex; flex-direction: column; align-items: ${props => props.isSystem ? 'center' : (props.isMe ? 'flex-end' : 'flex-start')}; margin-bottom: 5px; `;
const SystemMsg = styled.div` background: rgba(0,0,0,0.05); padding: 5px 15px; border-radius: 20px; font-size: 12px; color: #666; margin: 10px 0; `;
const Sender = styled.div` font-size: 12px; color: #666; margin-bottom: 4px; margin-left: 5px; `;
const Bubble = styled.div` max-width: 70%; padding: 10px 15px; border-radius: 15px; font-size: 14px; line-height: 1.5; background: ${props => props.isMe ? '#4a90e2' : 'white'}; color: ${props => props.isMe ? 'white' : '#333'}; border-top-right-radius: ${props => props.isMe ? '2px' : '15px'}; border-top-left-radius: ${props => props.isMe ? '15px' : '2px'}; box-shadow: 0 1px 2px rgba(0,0,0,0.1); `;
const Time = styled.span` font-size: 10px; color: #aaa; margin-top: 4px; margin-right: 5px; `;
const InputArea = styled.div` background: white; padding: 15px; display: flex; align-items: center; gap: 10px; `;
const AttachBtn = styled.button` background: none; border: none; font-size: 20px; color: #888; cursor: pointer; `;
const Input = styled.input` flex: 1; padding: 12px; border-radius: 20px; border: 1px solid #ddd; outline: none; background: #f8f9fa; `;
const SendBtn = styled.button` background: #4a90e2; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; &:hover { background: #357abd; } `;
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; `;
const ModalBox = styled.div` background: white; padding: 30px; border-radius: 15px; width: 350px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2); h3 { margin-bottom: 15px; font-size: 18px; font-weight: bold; }`;
const ModalInput = styled.input` padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; outline: none; font-size: 15px; `;
const ModalTextArea = styled.textarea` padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; outline: none; font-size: 14px; height: 80px; resize: none; `;
const ModalFooter = styled.div` display: flex; justify-content: flex-end; gap: 10px; `;
const Button = styled.button` padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; background: #eee; &:hover { background: #ddd; } `;
const PrimaryButton = styled(Button)` background: #4a90e2; color: white; &:hover { background: #357abd; } `;
const DangerButton = styled(Button)` background: #d9534f; color: white; &:hover { background: #c9302c; } `;