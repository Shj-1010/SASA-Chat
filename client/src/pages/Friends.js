import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserTimes, FaCheck, FaTimes, FaSearch, FaUserPlus } from 'react-icons/fa';
import api from '../api';

const Friends = () => {
  const [subTab, setSubTab] = useState('myFriends');
  const [selectedFriend, setSelectedFriend] = useState(null);
  
  const [myFriends, setMyFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // 데이터 불러오기
  const fetchFriends = async () => {
    try {
      const res = await api.get('/friend/list');
      setMyFriends(res.data.friends);
      setReceivedRequests(res.data.received);
      setSentRequests(res.data.sent);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchFriends(); }, []);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    const res = await api.get(`/friend/search?keyword=${keyword}`);
    setSearchResults(res.data);
  };

  const sendRequest = async (receiverId) => {
    const res = await api.post('/friend/request', { receiverId });
    if (res.data.success) {
      alert('친구 요청을 보냈습니다!');
      setSearchResults([]); setKeyword(''); fetchFriends();
    } else { alert(res.data.msg); }
  };

  const handleAccept = async (requestId) => {
    await api.post('/friend/accept', { requestId });
    fetchFriends();
  };

  const handleDelete = async (targetId, isRequestId = false) => {
    if(!window.confirm("정말 삭제/취소 하시겠습니까?")) return;
    await api.post('/friend/delete', { targetId, isRequestId });
    fetchFriends();
  };

  return (
    <Container>
      <TabHeader>
        <TabButton active={subTab === 'myFriends'} onClick={() => setSubTab('myFriends')}>내 친구</TabButton>
        <TabButton active={subTab === 'received'} onClick={() => setSubTab('received')}>받은 요청 {receivedRequests.length > 0 && <Badge>{receivedRequests.length}</Badge>}</TabButton>
        <TabButton active={subTab === 'sent'} onClick={() => setSubTab('sent')}>보낸 요청</TabButton>
        <TabButton active={subTab === 'search'} onClick={() => setSubTab('search')}>친구 찾기</TabButton>
      </TabHeader>

      <ListContainer>
        {/* 1. 내 친구 */}
        {subTab === 'myFriends' && myFriends.map(f => (
          <ListItem key={f.id}>
            <ProfileInfo onClick={() => setSelectedFriend(f)}>
                <ProfileImg src={f.profile_img || "/default.png"} />
                <div><Name>{f.nickname}</Name><Status>{f.status_msg}</Status></div>
            </ProfileInfo>
            <ActionBtn className="delete" onClick={() => handleDelete(f.id, false)}><FaUserTimes /></ActionBtn>
          </ListItem>
        ))}

        {/* 2. 받은 요청 */}
        {subTab === 'received' && receivedRequests.map(req => (
          <ListItem key={req.request_id}>
            <ProfileInfo onClick={() => setSelectedFriend(req)}>
                <ProfileImg src={req.profile_img || "/default.png"} />
                <div><Name>{req.nickname}</Name><Status>{req.status_msg}</Status></div>
            </ProfileInfo>
            <BtnGroup>
                <ActionBtn className="accept" onClick={() => handleAccept(req.request_id)}><FaCheck /></ActionBtn>
                <ActionBtn className="reject" onClick={() => handleDelete(req.request_id, true)}><FaTimes /></ActionBtn>
            </BtnGroup>
          </ListItem>
        ))}

        {/* 3. 보낸 요청 */}
        {subTab === 'sent' && sentRequests.map(req => (
          <ListItem key={req.request_id}>
            <ProfileInfo onClick={() => setSelectedFriend(req)}>
                <ProfileImg src={req.profile_img || "/default.png"} />
                <div><Name>{req.nickname}</Name><Status>응답 대기중...</Status></div>
            </ProfileInfo>
            <ActionBtn className="reject" onClick={() => handleDelete(req.request_id, true)}><FaTimes /></ActionBtn>
          </ListItem>
        ))}

        {/* 4. 친구 찾기 */}
        {subTab === 'search' && (
            <div style={{padding: '10px'}}>
                <SearchBox>
                    <SearchInput 
                        placeholder="닉네임으로 검색해보세요" 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <SearchBtn onClick={handleSearch}><FaSearch /></SearchBtn>
                </SearchBox>
                
                {searchResults.map(user => (
                    <ListItem key={user.id}>
                        <ProfileInfo onClick={() => setSelectedFriend(user)}>
                            <ProfileImg src={user.profile_img || "/default.png"} />
                            <div><Name>{user.nickname}</Name><Status>{user.status_msg}</Status></div>
                        </ProfileInfo>
                        <ActionBtn className="accept" onClick={() => sendRequest(user.id)}><FaUserPlus /></ActionBtn>
                    </ListItem>
                ))}
            </div>
        )}

        {subTab === 'myFriends' && myFriends.length === 0 && <EmptyMsg>아직 친구가 없습니다.<br/>친구 찾기 탭에서 친구를 사귀어보세요!</EmptyMsg>}
        {subTab === 'received' && receivedRequests.length === 0 && <EmptyMsg>받은 친구 요청이 없습니다.<br/>친구요청을 기다려보세요!</EmptyMsg>}
        {subTab === 'sent' && sentRequests.length === 0 && <EmptyMsg>보낸 요청이 없습니다.<br/>먼저 친구요청을 보내봐요!</EmptyMsg>}
        
      </ListContainer>

      {/* 팝업 */}
      {selectedFriend && (
        <ModalOverlay onClick={() => setSelectedFriend(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={() => setSelectedFriend(null)}>&times;</CloseButton>
            <ModalProfileImg src={selectedFriend.profile_img || "/default.png"} />
            <ModalName>{selectedFriend.nickname}</ModalName>
            <ModalStatus>{selectedFriend.status_msg || "상태 메시지 없음"}</ModalStatus>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

export default Friends;

// --- 스타일 ---
const Container = styled.div` padding: 30px; max-width: 600px; margin: 0 auto; `;
const TabHeader = styled.div` display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; overflow-x: auto;`;
const TabButton = styled.button` background: none; border: none; font-size: 15px; font-weight: bold; padding: 10px; cursor: pointer; white-space: nowrap; color: ${(props) => (props.active ? '#4a90e2' : '#888')}; border-bottom: ${(props) => (props.active ? '3px solid #4a90e2' : 'none')}; &:hover { color: #4a90e2; }`;
const Badge = styled.span` background: #ff6b6b; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; margin-left: 5px; vertical-align: top; `;
const ListContainer = styled.div` background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 10px; min-height: 200px; `;
const ListItem = styled.div` display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; &:last-child { border-bottom: none; } `;
const ProfileInfo = styled.div` display: flex; align-items: center; gap: 15px; cursor: pointer; `;
const ProfileImg = styled.img` width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background-color: #ddd; `;
const Name = styled.div` font-weight: bold; font-size: 16px; `;
const Status = styled.div` font-size: 12px; color: #888; `;
const BtnGroup = styled.div` display: flex; gap: 8px; `;
const ActionBtn = styled.button` width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s; color: white; &.delete { background-color: #ddd; color: #555; } &.delete:hover { background-color: #ff6b6b; color: white; } &.accept { background-color: #5cb85c; } &.accept:hover { background-color: #4cae4c; } &.reject { background-color: #d9534f; } &.reject:hover { background-color: #c9302c; }`;
const EmptyMsg = styled.div` text-align: center; padding: 40px; color: #aaa; font-size: 14px; line-height: 1.6; `;

/* [수정] 검색 박스 flex 적용으로 나란히 배치 */
const SearchBox = styled.div` display: flex; gap: 10px; margin-bottom: 10px; `;
const SearchInput = styled.input` flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; `;
const SearchBtn = styled.button` width: 50px; background: #4a90e2; color: white; border: none; border-radius: 20px; cursor: pointer; display:flex; justify-content:center; align-items:center; `;

const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; `;
const ModalContent = styled.div` background: white; padding: 40px; border-radius: 15px; width: 300px; text-align: center; position: relative; `;
const CloseButton = styled.button` position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; `;
const ModalProfileImg = styled.img` width: 80px; height: 80px; background: #eee; border-radius: 50%; margin: 0 auto 15px; object-fit: cover; `;
const ModalName = styled.h2` font-size: 22px; font-weight: bold; margin-bottom: 5px; `;
const ModalStatus = styled.p` color: #666; margin-bottom: 20px; `;