import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaPlus, FaUserFriends, FaPaperclip, FaArrowLeft, FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import api from '../api';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5000");

const Chat = ({ user }) => {
  const [activeRoom, setActiveRoom] = useState(null); 
  const [showUserList, setShowUserList] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      if (Array.isArray(res.data)) {
          setChatRooms(res.data.map(r => ({
              ...r,
              count: 0,
              hashtags: r.hashtags ? r.hashtags.split(',') : []
          })));
      } else { setChatRooms([]); }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    socket.on('room_users', (data) => { if(data && data.users) setRoomUsers(data.users); });
    socket.on('receive_message', (data) => setMessages((prev) => [...prev, { ...data, isMe: false }]));
    socket.on('chat_history', (history) => {
        if (!Array.isArray(history)) return;
        const formatted = history.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            isSystem: msg.isSystem === 1, 
            isMe: msg.sender === user.nickname,
            created_at: msg.created_at
        }));
        setMessages(formatted);
    });
    return () => {
        socket.off('room_users');
        socket.off('receive_message');
        socket.off('chat_history');
    };
  }, [activeRoom, user]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const joinRoom = (room) => {
      setActiveRoom(room);
      setMessages([]); 
      socket.emit('join_room', { roomId: room.id, nickname: user.nickname });
  };

  const openCreateModal = () => { setNewRoomTitle(''); setNewRoomTags(''); setIsCreateModalOpen(true); };

  // [수정] alert 제거
  const submitCreateRoom = async () => {
    if (!newRoomTitle.trim()) { alert("방 이름을 입력해주세요."); return; }
    try {
        const res = await api.post('/chat/room', { 
            title: newRoomTitle, 
            hashtags: newRoomTags 
        });
        if(res.data.success) {
            // alert("채팅방 생성 완료!");  <-- [삭제함] 이제 조용히 닫힙니다.
            setIsCreateModalOpen(false);
            fetchRooms(); 
        }
    } catch(err) { alert("생성 실패"); }
  };

  const handleBackToList = () => {
      setActiveRoom(null);
      setMessages([]);
      setRoomUsers([]);
      setShowUserList(false);
      fetchRooms();
  };

  const handleLeaveClick = () => { setIsLeaveModalOpen(true); };

  const confirmLeaveRoom = async () => {
      try {
          socket.emit('leave_room');
          await api.delete(`/chat/room/${activeRoom.id}`);
          setActiveRoom(null);
          setMessages([]);
          setRoomUsers([]);
          setShowUserList(false);
          setIsLeaveModalOpen(false);
          fetchRooms();
      } catch (err) { alert("오류 발생"); }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msgData = {
        roomId: activeRoom.id,
        sender: user.nickname,
        text: inputText,
        id: Date.now()
    };
    socket.emit('send_message', msgData);
    setMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    setInputText('');
  };

  const openReportModal = () => { setReportTarget(''); setReportReason(''); setIsReportModalOpen(true); };
  const submitReport = () => {
      if (!reportTarget) { alert("대상을 선택해주세요."); return; }
      if (!reportReason.trim()) { alert("사유를 입력해주세요."); return; }
      alert(`[신고 접수]\n대상: ${reportTarget}\n내용: ${reportReason}`);
      setIsReportModalOpen(false);
  };

  return (
    <Container>
      {!activeRoom && (
        <>
          <Header>
            <Title>채팅방 ({chatRooms?.length || 0})</Title>
            <CreateBtn onClick={openCreateModal}><FaPlus /> 새 방 만들기</CreateBtn>
          </Header>
          <RoomList>
            {chatRooms?.map(room => (
              <RoomItem key={room.id} onClick={() => joinRoom(room)}>
                <RoomInfo>
                  <RoomTitle>{room.title}</RoomTitle>
                  <Tags>{room.hashtags?.length > 0 ? room.hashtags.join(' ') : "#참여가능"}</Tags>
                </RoomInfo>
              </RoomItem>
            ))}
            {chatRooms?.length === 0 && <EmptyMsg>채팅방이 없습니다.</EmptyMsg>}
          </RoomList>
        </>
      )}

      {activeRoom && (
        <ChatRoomContainer>
          <ChatHeader>
            <BackButton onClick={handleBackToList}><FaArrowLeft /></BackButton>
            <RoomTitle>{activeRoom.title}</RoomTitle>
            <HeaderIcons>
               <IconBtn onClick={() => setShowUserList(!showUserList)}><FaUserFriends /></IconBtn>
               <IconBtn onClick={handleLeaveClick}><FaSignOutAlt /></IconBtn>
               <IconBtn isRed onClick={openReportModal}><FaExclamationTriangle /></IconBtn>
            </HeaderIcons>
          </ChatHeader>

          <ChatBody>
            <MessageArea>
                {messages?.map((msg, idx) => (
                    <div key={idx}>
                        {msg.isSystem ? (
                            <SystemMsg>{msg.text}</SystemMsg>
                        ) : (
                            <BubbleWrapper isMe={msg.isMe}>
                                {!msg.isMe && <SenderName>{msg.sender}</SenderName>}
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', flexDirection: msg.isMe ? 'row-reverse' : 'row' }}>
                                    <Bubble isMe={msg.isMe}>{msg.text}</Bubble>
                                    <TimeStamp isMe={msg.isMe}>{msg.created_at ? formatTime(msg.created_at) : formatTime(new Date())}</TimeStamp>
                                </div>
                            </BubbleWrapper>
                        )}
                    </div>
                ))}
                <div ref={messageEndRef} />
            </MessageArea>

            {showUserList && (
                <UserListSidebar>
                    <h3>참여자 ({roomUsers?.length || 0})</h3>
                    <ul>{roomUsers?.map((u, i) => <li key={i}>{u}</li>)}</ul>
                </UserListSidebar>
            )}
          </ChatBody>

          <InputArea onSubmit={handleSendMessage}>
            <AttachBtn type="button"><FaPaperclip /></AttachBtn>
            <ChatInput value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="메시지 입력..." />
            <SendBtn type="submit">전송</SendBtn>
          </InputArea>
        </ChatRoomContainer>
      )}

      {/* 모달들 */}
      {isCreateModalOpen && (
          <ModalOverlay>
              <ModalBox>
                  <h3>새 채팅방 만들기</h3>
                  <Label>방 이름</Label>
                  <ModalInput placeholder="예: 축구 같이 하실 분" value={newRoomTitle} onChange={(e) => setNewRoomTitle(e.target.value)} />
                  <Label>해시태그 (선택)</Label>
                  <ModalInput placeholder="예: #축구 #운동" value={newRoomTags} onChange={(e) => setNewRoomTags(e.target.value)} />
                  <ModalBtnGroup>
                      <ModalBtn onClick={() => setIsCreateModalOpen(false)} color="#888">취소</ModalBtn>
                      <ModalBtn onClick={submitCreateRoom} color="#4a90e2">만들기</ModalBtn>
                  </ModalBtnGroup>
              </ModalBox>
          </ModalOverlay>
      )}

      {isReportModalOpen && (
          <ModalOverlay>
              <ModalBox>
                  <h3 style={{color:'#d9534f'}}>🚨 사용자 신고</h3>
                  <Label>신고 대상</Label>
                  <ModalSelect value={reportTarget} onChange={(e) => setReportTarget(e.target.value)}>
                      <option value="">대상을 선택하세요</option>
                      {roomUsers?.filter(u => u !== user.nickname).map((u, i) => (<option key={i} value={u}>{u}</option>))}
                  </ModalSelect>
                  <Label>신고 사유</Label>
                  <ModalTextArea placeholder="사유를 입력해주세요" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                  <ModalBtnGroup>
                      <ModalBtn onClick={() => setIsReportModalOpen(false)} color="#888">취소</ModalBtn>
                      <ModalBtn onClick={submitReport} color="#d9534f">신고하기</ModalBtn>
                  </ModalBtnGroup>
              </ModalBox>
          </ModalOverlay>
      )}

      {isLeaveModalOpen && (
          <ModalOverlay>
              <ModalBox>
                  <h3>채팅방 나가기</h3>
                  <p style={{color: '#666', marginBottom: '20px'}}>정말 나가시겠습니까?<br/>목록에서 방이 삭제됩니다.</p>
                  <ModalBtnGroup>
                      <ModalBtn onClick={() => setIsLeaveModalOpen(false)} color="#888">취소</ModalBtn>
                      <ModalBtn onClick={confirmLeaveRoom} color="#d9534f">나가기</ModalBtn>
                  </ModalBtnGroup>
              </ModalBox>
          </ModalOverlay>
      )}
    </Container>
  );
};

export default Chat;

// --- 스타일 (동일) ---
const Container = styled.div` height: 100vh; display: flex; flex-direction: column; background-color: #f8f9fa; `;
const Header = styled.div` padding: 20px; display: flex; justify-content: space-between; align-items: center; background: white; border-bottom: 1px solid #ddd; `;
const Title = styled.h2` font-size: 20px; font-weight: bold; `;
const CreateBtn = styled.button` background: #4a90e2; color: white; border: none; padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 5px; cursor: pointer; &:hover { background: #357abd; } `;
const RoomList = styled.div` padding: 20px; overflow-y: auto; `;
const RoomItem = styled.div` background: white; padding: 20px; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: 0.2s; &:hover { transform: translateY(-2px); box-shadow: 0 5px 10px rgba(0,0,0,0.1); } `;
const RoomInfo = styled.div``;
const RoomTitle = styled.div` font-size: 18px; font-weight: bold; `;
const Tags = styled.div` color: #4a90e2; font-size: 13px; margin-top: 5px; `;
const ChatRoomContainer = styled.div` display: flex; flex-direction: column; height: 100%; `;
const ChatHeader = styled.div` height: 60px; background: white; border-bottom: 1px solid #ddd; display: flex; align-items: center; padding: 0 15px; justify-content: space-between; `;
const BackButton = styled.button` background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 15px; `;
const HeaderIcons = styled.div` display: flex; gap: 15px; `;
const IconBtn = styled.button` background: none; border: none; font-size: 20px; cursor: pointer; color: ${props => props.isRed ? '#ff6b6b' : '#333'}; `;
const ChatBody = styled.div` display: flex; flex: 1; overflow: hidden; position: relative; `;
const MessageArea = styled.div` flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; `;
const SystemMsg = styled.div` text-align: center; color: #aaa; font-size: 13px; margin: 10px 0; `;
const UserListSidebar = styled.div` width: 200px; background: white; border-left: 1px solid #ddd; padding: 20px; overflow-y: auto; h3 { font-size: 16px; margin-bottom: 15px; font-weight: bold; } ul { list-style: none; padding: 0; } li { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; } `;
const BubbleWrapper = styled.div` display: flex; flex-direction: column; align-items: ${props => props.isMe ? 'flex-end' : 'flex-start'}; `;
const SenderName = styled.div` font-size: 12px; color: #666; margin-bottom: 4px; margin-left: 5px; `;
const Bubble = styled.div` max-width: 70%; padding: 10px 15px; border-radius: 15px; font-size: 15px; background-color: ${props => props.isMe ? '#4a90e2' : 'white'}; color: ${props => props.isMe ? 'white' : '#333'}; border: ${props => props.isMe ? 'none' : '1px solid #eee'}; border-top-left-radius: ${props => !props.isMe && '0'}; border-top-right-radius: ${props => props.isMe && '0'}; `;
const TimeStamp = styled.span` font-size: 10px; color: #999; margin-bottom: 5px; min-width: 50px; text-align: ${props => props.isMe ? 'right' : 'left'};`;
const InputArea = styled.form` height: 60px; background: white; padding: 0 10px; border-top: 1px solid #ddd; display: flex; align-items: center; gap: 10px; `;
const AttachBtn = styled.button` background: none; border: none; font-size: 20px; color: #666; cursor: pointer; `;
const ChatInput = styled.input` flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; `;
const SendBtn = styled.button` background: #4a90e2; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: bold; &:hover { background: #357abd; } `;
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; `;
const ModalBox = styled.div` background: white; padding: 30px; border-radius: 15px; width: 350px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2); h3 { margin-bottom: 15px; font-size: 18px; font-weight: bold; }`;
const ModalInput = styled.input` padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; outline: none; font-size: 15px; `;
const ModalSelect = styled.select` padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 15px; outline: none; font-size: 14px; background: white; `;
const ModalTextArea = styled.textarea` padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px; outline: none; font-size: 14px; height: 80px; resize: none; `;
const ModalBtnGroup = styled.div` display: flex; justify-content: flex-end; gap: 10px; `;
const ModalBtn = styled.button` padding: 8px 16px; border-radius: 5px; border: none; background-color: ${props => props.color}; color: white; font-weight: bold; cursor: pointer; &:hover { opacity: 0.8; }`;
const Label = styled.div` font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #444; `;
const EmptyMsg = styled.div` text-align: center; color: #999; margin-top: 50px; font-size: 14px; `;