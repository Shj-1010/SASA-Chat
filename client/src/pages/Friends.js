import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserTimes, FaCheck, FaTimes, FaSearch, FaUserPlus, FaTrash } from 'react-icons/fa';
import api from '../api';

const Friends = () => {
  const [subTab, setSubTab] = useState('myFriends');
  
  const [myFriends, setMyFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // [NEW] 확인 모달 상태 관리
  const [confirmModal, setConfirmModal] = useState({
      isOpen: false,
      type: '',      // 'DELETE_FRIEND' 또는 'CANCEL_REQUEST'
      targetId: null,
      message: ''
  });

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
    try {
        const res = await api.get(`/friend/search?keyword=${keyword}`);
        setSearchResults(res.data);
    } catch(err) { console.error(err); }
  };

  const sendRequest = async (receiverId) => {
    try {
        const res = await api.post('/friend/request', { receiverId });
        if(res.data.success) {
            alert("요청 전송 완료!");
            handleSearch(); // 검색 결과 갱신
            fetchFriends(); // 내 목록 갱신
        } else {
            alert(res.data.msg);
        }
    } catch(err) { alert("요청 실패"); }
  };

  const respondRequest = async (requestId, action) => {
    try {
        await api.post('/friend/respond', { requestId, action });
        fetchFriends();
    } catch(err) { alert("처리 실패"); }
  };

  // [수정] 모달 열기 함수 (친구 삭제)
  const openDeleteModal = (friendId) => {
      setConfirmModal({
          isOpen: true,
          type: 'DELETE_FRIEND',
          targetId: friendId,
          message: '정말 이 친구를 삭제하시겠습니까?\n채팅 내역은 유지되지만 친구 목록에서 사라집니다.'
      });
  };

  // [수정] 모달 열기 함수 (요청 취소)
  const openCancelModal = (requestId) => {
      setConfirmModal({
          isOpen: true,
          type: 'CANCEL_REQUEST',
          targetId: requestId,
          message: '보낸 친구 요청을 취소하시겠습니까?'
      });
  };

  // [NEW] 실제 동작 실행 (모달에서 '확인' 눌렀을 때)
  const handleConfirmAction = async () => {
      const { type, targetId } = confirmModal;
      try {
          if (type === 'DELETE_FRIEND') {
              await api.delete(`/friend/${targetId}`);
              // 성공 후 처리
              fetchFriends();
          } else if (type === 'CANCEL_REQUEST') {
              await api.delete(`/friend/request/${targetId}`);
              // 성공 후 처리
              fetchFriends();
          }
      } catch (err) {
          alert("작업 실패");
      } finally {
          // 모달 닫기
          setConfirmModal({ ...confirmModal, isOpen: false });
      }
  };

  return (
    <Container>
      <TabHeader>
        <SubTab active={subTab === 'myFriends'} onClick={() => setSubTab('myFriends')}>내 친구 ({myFriends.length})</SubTab>
        <SubTab active={subTab === 'received'} onClick={() => setSubTab('received')}>받은 요청 ({receivedRequests.length})</SubTab>
        <SubTab active={subTab === 'sent'} onClick={() => setSubTab('sent')}>보낸 요청 ({sentRequests.length})</SubTab>
        <SubTab active={subTab === 'search'} onClick={() => setSubTab('search')}>친구 찾기</SubTab>
      </TabHeader>

      <Content>
        {/* 1. 내 친구 목록 */}
        {subTab === 'myFriends' && (
           <List>
             {myFriends.length === 0 ? <EmptyMsg>아직 친구가 없습니다. 친구를 찾아보세요!</EmptyMsg> : 
              myFriends.map(f => (
                <Card key={f.id}>
                  <Info>
                    <ProfileImg src={f.profile_img || "/default.png"} />
                    <div>
                        <Name>{f.nickname}</Name>
                        <Status>{f.status_msg}</Status>
                    </div>
                  </Info>
                  {/* 삭제 버튼 클릭 시 모달 오픈 */}
                  <DeleteBtn onClick={() => openDeleteModal(f.id)}>
                      <FaUserTimes />
                  </DeleteBtn>
                </Card>
             ))}
           </List>
        )}

        {/* 2. 받은 요청 */}
        {subTab === 'received' && (
           <List>
             {receivedRequests.length === 0 ? <EmptyMsg>받은 요청이 없습니다.</EmptyMsg> :
              receivedRequests.map(req => (
                <Card key={req.id}>
                  <Info>
                    <ProfileImg src={req.profile_img || "/default.png"} />
                    <div>
                        <Name>{req.nickname}</Name>
                        <Status>{req.created_at.split('T')[0]} 요청</Status>
                    </div>
                  </Info>
                  <BtnGroup>
                    <AcceptBtn onClick={() => respondRequest(req.id, 'accept')}><FaCheck /> 수락</AcceptBtn>
                    <RejectBtn onClick={() => respondRequest(req.id, 'reject')}><FaTimes /> 거절</RejectBtn>
                  </BtnGroup>
                </Card>
             ))}
           </List>
        )}

        {/* 3. 보낸 요청 */}
        {subTab === 'sent' && (
           <List>
             {sentRequests.length === 0 ? <EmptyMsg>보낸 요청이 없습니다.</EmptyMsg> :
              sentRequests.map(req => (
                <Card key={req.id}>
                  <Info>
                    <ProfileImg src={req.profile_img || "/default.png"} />
                    <div>
                        <Name>{req.nickname}</Name>
                        <Status>수락 대기 중...</Status>
                    </div>
                  </Info>
                  {/* 취소 버튼 클릭 시 모달 오픈 */}
                  <CancelBtn onClick={() => openCancelModal(req.id)}>
                      <FaTimes /> 취소
                  </CancelBtn>
                </Card>
             ))}
           </List>
        )}

        {/* 4. 친구 찾기 */}
        {subTab === 'search' && (
          <SearchContainer>
            <SearchBox>
              <SearchInput 
                placeholder="닉네임으로 검색해보세요" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <SearchBtn onClick={handleSearch}><FaSearch /></SearchBtn>
            </SearchBox>
            <List>
               {searchResults.map(user => (
                 <Card key={user.id}>
                   <Info>
                     <ProfileImg src={user.profile_img || "/default.png"} />
                     <div>
                        <Name>{user.nickname}</Name>
                        <Status>{user.status_msg || "상태 메시지 없음"}</Status>
                     </div>
                   </Info>
                   <AddBtn onClick={() => sendRequest(user.id)}><FaUserPlus /> 친구요청</AddBtn>
                 </Card>
               ))}
            </List>
          </SearchContainer>
        )}
      </Content>

      {/* --- [NEW] 예쁜 확인 모달 --- */}
      {confirmModal.isOpen && (
          <ModalOverlay onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <ModalHeader>확인해주세요</ModalHeader>
                  <ModalBody>
                      {/* 줄바꿈 문자(\n)를 <br>로 변환 */}
                      {confirmModal.message.split('\n').map((line, i) => (
                          <span key={i}>{line}<br/></span>
                      ))}
                  </ModalBody>
                  <ModalFooter>
                      <SecondaryButton onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
                          아니요
                      </SecondaryButton>
                      <DangerButton onClick={handleConfirmAction}>
                          {confirmModal.type === 'DELETE_FRIEND' ? '삭제하기' : '취소하기'}
                      </DangerButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

    </Container>
  );
};

export default Friends;

// --- 스타일 컴포넌트 ---
const Container = styled.div` padding: 20px; background-color: #fdfdfd; height: 100%; display: flex; flex-direction: column; `;
const TabHeader = styled.div` display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 5px; &::-webkit-scrollbar { display: none; } `;
const SubTab = styled.button` padding: 10px 16px; border-radius: 20px; border: none; background-color: ${props => props.active ? '#4a90e2' : '#f0f0f0'}; color: ${props => props.active ? 'white' : '#666'}; font-weight: bold; cursor: pointer; white-space: nowrap; transition: 0.2s; &:hover { opacity: 0.9; } `;
const Content = styled.div` flex: 1; overflow-y: auto; `;
const List = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Card = styled.div` background: white; padding: 15px; border-radius: 15px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f5f5f5; `;
const Info = styled.div` display: flex; align-items: center; gap: 15px; `;
const ProfileImg = styled.img` width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; `;
const Name = styled.div` font-weight: bold; font-size: 16px; color: #333; `;
const Status = styled.div` font-size: 13px; color: #888; margin-top: 3px; `;
const BtnGroup = styled.div` display: flex; gap: 5px; `;
const ActionBtn = styled.button` padding: 6px 12px; border-radius: 15px; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: bold; transition: 0.2s; `;
const AcceptBtn = styled(ActionBtn)` background: #e3f2fd; color: #4a90e2; &:hover { background: #bbdefb; } `;
const RejectBtn = styled(ActionBtn)` background: #ffebee; color: #d9534f; &:hover { background: #ffcdd2; } `;
const CancelBtn = styled(ActionBtn)` background: #f5f5f5; color: #888; &:hover { background: #ddd; } `;
const DeleteBtn = styled(ActionBtn)` background: transparent; color: #ccc; font-size: 16px; padding: 10px; &:hover { color: #d9534f; background: #fff0f0; } `;
const AddBtn = styled(ActionBtn)` background: #4a90e2; color: white; &:hover { background: #357abd; } `;
const EmptyMsg = styled.div` text-align: center; padding: 40px; color: #aaa; font-size: 14px; `;
const SearchContainer = styled.div` display: flex; flex-direction: column; gap: 20px; `;
const SearchBox = styled.div` display: flex; gap: 10px; `;
const SearchInput = styled.input` flex: 1; padding: 12px 20px; border: 1px solid #eee; border-radius: 25px; outline: none; background: #f9f9f9; font-size: 15px; &:focus { border-color: #4a90e2; background: white; } `;
const SearchBtn = styled.button` width: 50px; background: #4a90e2; color: white; border: none; border-radius: 50%; cursor: pointer; display:flex; justify-content:center; align-items:center; font-size: 18px; box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3); `;

// [NEW] 모달 스타일
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; animation: fadeIn 0.2s; `;
const ModalBox = styled.div` background: white; width: 320px; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(1); animation: popUp 0.2s; `;
const ModalHeader = styled.h3` margin: 0 0 15px 0; font-size: 20px; font-weight: bold; color: #333; `;
const ModalBody = styled.div` font-size: 15px; color: #666; margin-bottom: 25px; line-height: 1.5; `;
const ModalFooter = styled.div` display: flex; gap: 10px; justify-content: center; `;
const ModalBtn = styled.button` flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; font-size: 15px; transition: 0.2s; `;
const SecondaryButton = styled(ModalBtn)` background: #f1f3f5; color: #555; &:hover { background: #e9ecef; } `;
const DangerButton = styled(ModalBtn)` background: #ffebee; color: #d9534f; &:hover { background: #ffcdd2; } `;