import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserPlus, FaExclamationCircle } from 'react-icons/fa'; 
import api from '../api';

const SERVER_URL = "https://port-0-sasa-chat-mijx5epp1435215a.sel3.cloudtype.app";

const Recommend = ({ user }) => {
  const [recUsers, setRecUsers] = useState([]);
  const [recRooms, setRecRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // [NEW] 신고 모달 상태
  const [reportModal, setReportModal] = useState({ isOpen: false, targetId: null, nickname: '' });
  const [reportReason, setReportReason] = useState('');

  const getProfileImageUrl = (imgData) => {
      if (!imgData) return "/default.png";
      if (imgData.startsWith("blob:")) return imgData; 
      if (imgData.startsWith("/")) return `${SERVER_URL}${imgData}`; 
      return imgData;
  };

  useEffect(() => {
    const fetchRecommends = async () => {
      try {
        const res = await api.get('/recommend');
        setRecUsers(res.data.users);
        setRecRooms(res.data.rooms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommends();
  }, []);

  const sendRequest = async (receiverId) => {
    if(window.confirm("친구 요청을 보내시겠습니까?")) {
        try {
            const res = await api.post('/friend/request', { receiverId });
            if(res.data.success) alert("요청 전송 완료!");
            else alert(res.data.msg);
        } catch(err) { alert("요청 실패"); }
    }
  };

  const joinRoom = async (roomId) => {
      try {
          await api.post('/chat/join', { roomId });
          alert("채팅방에 참여했습니다!");
          window.location.href = "/"; 
      } catch (err) { alert("참여 실패!"); }
  };

  // [NEW] 신고 모달 열기
  const openReportModal = (target) => {
      setReportModal({ isOpen: true, targetId: target.id, nickname: target.nickname });
      setReportReason('');
  };

  // [NEW] 신고 전송
  const submitReport = async () => {
      if(!reportReason.trim()) return alert("신고 사유를 입력해주세요.");
      try {
          await api.post('/user/report', {
              targetId: reportModal.targetId,
              reason: "부적절한 유저 신고",
              description: reportReason
          });
          alert("신고가 접수되었습니다.");
          setReportModal({ ...reportModal, isOpen: false });
      } catch(err) { alert("신고 실패"); }
  };

  return (
    <Container>
      <Header>
        <Title>맞춤 추천</Title> 
        <Subtitle>
             <b>{user?.nickname}</b>님의 관심사<br/>
             <TagHighlight>{user?.hashtags || "#태그없음"}</TagHighlight>
             를 분석한 결과입니다.
        </Subtitle>
      </Header>

      <Section>
        <SectionTitle>🤝 추천 친구</SectionTitle>
        <ScrollBox>
            {loading ? <LoadingMsg>분석 중...</LoadingMsg> : 
             recUsers.length === 0 ? (
                <EmptyMsg>비슷한 취향의 친구를 찾지 못했어요.<br />태그를 추가해보세요.</EmptyMsg>
             ) :
             recUsers.map(u => (
                <Card key={u.id}>
                    <UserInfo>
                        <ProfileImg src={getProfileImageUrl(u.profile_img)} onError={(e)=>{e.target.src="/default.png"}} />
                        <InfoText>
                            <Name>{u.nickname}</Name>
                            <Status>{u.status_msg || "상태 메시지 없음"}</Status>
                            <HashTags>{u.hashtags}</HashTags>
                        </InfoText>
                    </UserInfo>
                    <BtnGroup>
                        {/* 신고 버튼 추가 */}
                        <ReportBtn onClick={() => openReportModal(u)}><FaExclamationCircle /></ReportBtn>
                        <ActionBtn onClick={() => sendRequest(u.id)}><FaUserPlus /> 요청</ActionBtn>
                    </BtnGroup>
                </Card>
            ))}
        </ScrollBox>
      </Section>

      <Section>
        <SectionTitle>💬 추천 채팅방</SectionTitle>
        <ScrollBox>
            {loading ? <LoadingMsg>분석 중...</LoadingMsg> : 
             recRooms.length === 0 ? <EmptyMsg>추천할 채팅방이 없습니다.</EmptyMsg> :
             recRooms.map(room => (
                <Card key={room.id}>
                    <UserInfo>
                        <RoomIcon>{room.title ? room.title[0] : '?'}</RoomIcon>
                        <InfoText>
                            <Name>{room.title}</Name>
                            <HashTags>{room.hashtags}</HashTags>
                            <SubInfo>참여 {room.user_count || 0}명</SubInfo>
                        </InfoText>
                    </UserInfo>
                    <JoinBtn onClick={() => joinRoom(room.id)}>참여</JoinBtn>
                </Card>
            ))}
        </ScrollBox>
      </Section>

      {/* 신고 모달 */}
      {reportModal.isOpen && (
          <ModalOverlay onClick={() => setReportModal({ ...reportModal, isOpen: false })}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <h3 style={{margin:'0 0 15px 0', fontSize:'18px'}}>🚨 유저 신고</h3>
                  <p style={{color:'#666', marginBottom:'15px'}}>대상: <b>{reportModal.nickname}</b></p>
                  <ModalTextArea 
                      placeholder="신고 사유를 적어주세요." 
                      value={reportReason} 
                      onChange={(e) => setReportReason(e.target.value)}
                  />
                  <div style={{display:'flex', gap:'10px'}}>
                      <SecondaryButton onClick={() => setReportModal({ ...reportModal, isOpen: false })}>취소</SecondaryButton>
                      <DangerButton onClick={submitReport}>신고</DangerButton>
                  </div>
              </ModalBox>
          </ModalOverlay>
      )}
    </Container>
  );
};

export default Recommend;

// --- 스타일 (그대로 유지 + 버튼 추가) ---
const Container = styled.div` padding: 20px; height: 100%; overflow-y: auto; background-color: #fdfdfd; `;
const Header = styled.div` background: white; padding: 30px 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(165, 94, 234, 0.1); margin-bottom: 30px; text-align: center; border: 1px solid #f0f0f0; `;
const Title = styled.h1` font-size: 24px; font-weight: bold; color: #333; margin-bottom: 15px; display: block; `;
const Subtitle = styled.div` font-size: 16px; color: #666; line-height: 1.6; `;
const TagHighlight = styled.span` display: inline-block; background: #f3e5f5; color: #a55eea; padding: 2px 10px; border-radius: 15px; font-weight: bold; margin: 0 5px; `;
const Section = styled.div` margin-bottom: 30px; `;
const SectionTitle = styled.h2` font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #444; display: flex; align-items: center; &:before { content: ''; display: block; width: 5px; height: 20px; background: #a55eea; margin-right: 10px; border-radius: 5px; } `;
const ScrollBox = styled.div` display: flex; flex-direction: column; gap: 15px; `;
const Card = styled.div` background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s; border: 1px solid #f5f5f5; &:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); } `;
const UserInfo = styled.div` display: flex; align-items: center; gap: 15px; flex: 1; `;
const ProfileImg = styled.img` width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #eee; `;
const RoomIcon = styled.div` width: 50px; height: 50px; border-radius: 15px; background: #f3e5f5; color: #a55eea; display: flex; justify-content: center; align-items: center; font-size: 20px; font-weight: bold; `;
const InfoText = styled.div` display: flex; flex-direction: column; `;
const Name = styled.div` font-weight: bold; font-size: 16px; color: #333; `;
const Status = styled.div` font-size: 13px; color: #888; margin-top: 3px; `;
const HashTags = styled.div` font-size: 12px; color: #a55eea; margin-top: 5px; `;
const SubInfo = styled.div` font-size: 12px; color: #aaa; margin-top: 3px; `;
const BtnGroup = styled.div` display: flex; gap: 8px; `;
const ActionBtn = styled.button` background: #a55eea; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: bold; transition: 0.2s; &:hover { background: #8854d0; } `;
const JoinBtn = styled(ActionBtn)` background: #4a90e2; &:hover { background: #357abd; } `;
const ReportBtn = styled.button` background: #fff3e0; color: #ff9800; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: 0.2s; &:hover { background: #ffe0b2; } `;
const LoadingMsg = styled.div` text-align: center; color: #aaa; padding: 20px; `;
const EmptyMsg = styled.div` text-align: center; color: #aaa; padding: 20px; background: #f9f9f9; border-radius: 10px; `;
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; animation: fadeIn 0.2s; `;
const ModalBox = styled.div` background: white; width: 320px; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popUp 0.2s; `;
const ModalTextArea = styled.textarea` width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 20px; outline: none; resize: none; `;
const ModalBtn = styled.button` flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; font-size: 14px; `;
const SecondaryButton = styled(ModalBtn)` background: #f1f3f5; color: #555; `;
const DangerButton = styled(ModalBtn)` background: #ffebee; color: #d9534f; `;