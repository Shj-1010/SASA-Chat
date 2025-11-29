import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserPlus, FaSignInAlt, FaHashtag, FaMagic } from 'react-icons/fa';
import api from '../api';

const Recommend = ({ user }) => {
  const [recUsers, setRecUsers] = useState([]);
  const [recRooms, setRecRooms] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // 친구 요청 (기존 API 재활용)
  const sendRequest = async (receiverId) => {
    if(window.confirm("친구 요청을 보내시겠습니까?")) {
        const res = await api.post('/friend/request', { receiverId });
        if(res.data.success) alert("요청 전송 완료!");
        else alert(res.data.msg);
    }
  };

  // 채팅방 입장 (실제로는 Chat 탭으로 이동시켜야 함)
  const joinRoom = async (roomId) => {
      try {
          // 1. 서버에 "나 이 방 들어갈래!" 요청
          await api.post('/chat/join', { roomId });
          
          alert("채팅방에 참여합니다!");
          // 2. 채팅 탭으로 이동 (새로고침 효과를 위해 window.location 사용하거나, 상태관리 필요)
          // 여기서는 간단하게 메인으로 이동 (Chat 탭이 기본이라면)
          window.location.href = "/"; 
      } catch (err) {
          alert("참여 실패!");
      }
  };

  if (loading) return <Container><Loading>추천 알고리즘 분석 중...</Loading></Container>;

  return (
    <Container>
      <Header>
        <Title><FaMagic style={{marginRight: '10px', color:'#a55eea'}}/> 맞춤 추천</Title>
        <Subtitle>
             <b>{user.nickname}</b>님의 관심사<br/>
             <TagHighlight>{user.hashtags || "태그 없음"}</TagHighlight>
             를 분석한 결과입니다.
        </Subtitle>
      </Header>

      <Section>
        <SectionTitle>취향이 비슷한 친구</SectionTitle>
        <ScrollBox>
            {recUsers.length === 0 ? <Empty>비슷한 취향의 친구를 찾지 못했어요<br/>프로필 태그를 더 추가해보세요!</Empty> : null}
            
            {recUsers.map(u => (
                <Card key={u.id}>
                    <ProfileImg src={u.profile_img || "/default.png"} />
                    <Info>
                        <Name>{u.nickname}</Name>
                        <Tags>{u.hashtags}</Tags>
                        <MatchScore>{u.score}개의 관심사 일치!</MatchScore>
                    </Info>
                    <ActionBtn onClick={() => sendRequest(u.id)}>
                        <FaUserPlus />
                    </ActionBtn>
                </Card>
            ))}
        </ScrollBox>
      </Section>

      <Section>
        <SectionTitle>관심 있는 채팅방</SectionTitle>
        <ScrollBox>
            {recRooms.length === 0 ? <Empty>관심사가 일치하는 채팅방이 없어요.<br/>직접 만들어보시는 건 어때요?</Empty> : null}

            {recRooms.map(r => (
                <Card key={r.id}>
                    <RoomIcon><FaHashtag /></RoomIcon>
                    <Info>
                        <Name>{r.title}</Name>
                        <MatchScore>관련 키워드 포함됨</MatchScore>
                    </Info>
                    <ActionBtn className="join" onClick={() => joinRoom(r.id)}>
                        <FaSignInAlt />
                    </ActionBtn>
                </Card>
            ))}
        </ScrollBox>
      </Section>
    </Container>
  );
};

export default Recommend;

// --- 스타일 ---
const Container = styled.div` padding: 30px; max-width: 600px; margin: 0 auto; overflow-y: auto; height: 100vh; padding-bottom: 100px;`;
const Loading = styled.div` text-align: center; margin-top: 100px; font-size: 18px; color: #666; `;
const Header = styled.div` margin-bottom: 30px; text-align: center; `;
const Title = styled.h2` font-size: 24px; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; color: #333; `;
const Subtitle = styled.p` color: #666; line-height: 1.5; `;
const TagHighlight = styled.span` color: #4a90e2; font-weight: bold; margin: 0 5px; `;

const Section = styled.div` margin-bottom: 40px; `;
const SectionTitle = styled.h3` font-size: 18px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #4a90e2; padding-left: 10px; `;
const ScrollBox = styled.div` display: flex; flex-direction: column; gap: 10px; `;

const Card = styled.div` background: white; padding: 15px; border-radius: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s; &:hover { transform: translateY(-2px); } `;
const ProfileImg = styled.img` width: 50px; height: 50px; border-radius: 50%; object-fit: cover; background: #eee; `;
const RoomIcon = styled.div` width: 50px; height: 50px; border-radius: 15px; background: #e3f2fd; color: #4a90e2; display: flex; align-items: center; justify-content: center; font-size: 20px; `;

const Info = styled.div` flex: 1; margin-left: 15px; `;
const Name = styled.div` font-weight: bold; font-size: 16px; margin-bottom: 4px; `;
const Tags = styled.div` font-size: 12px; color: #888; margin-bottom: 4px; `;
const MatchScore = styled.div` font-size: 12px; color: #a55eea; font-weight: bold; `;

const ActionBtn = styled.button` width: 40px; height: 40px; border-radius: 50%; border: none; background: #f0f2f5; color: #333; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: 0.2s; &:hover { background: #4a90e2; color: white; } &.join:hover { background: #2ecc71; } `;
const Empty = styled.div` text-align: center; color: #999; padding: 20px; font-size: 14px; background: #f9f9f9; border-radius: 10px; `;