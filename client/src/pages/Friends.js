import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserTimes, FaCheck, FaTimes, FaSearch, FaUserPlus, FaExclamationCircle } from 'react-icons/fa';
import api from '../api';

const SERVER_URL = "https://port-0-sasa-chat-mijx5epp1435215a.sel3.cloudtype.app";

const Friends = () => {
  const [subTab, setSubTab] = useState('myFriends');
  
  const [myFriends, setMyFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // 확인 모달 상태 (삭제/취소용)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', targetId: null, message: '' });

  // 신고 모달 상태
  const [reportModal, setReportModal] = useState({ isOpen: false, targetId: null, nickname: '' });
  const [reportReason, setReportReason] = useState('');

  // 이미지 주소 처리
  const getProfileImageUrl = (imgData) => {
      if (!imgData) return "/default.png";
      if (imgData.startsWith("blob:")) return imgData; 
      if (imgData.startsWith("/")) return `${SERVER_URL}${imgData}`; 
      return imgData;
  };

  // 날짜 안전하게 변환
  const formatDate = (dateString) => {
      if (!dateString) return "";
      try {
          const date = new Date(dateString);
          return date.toLocaleDateString();
      } catch (e) { return ""; }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friend/list');
      setMyFriends(Array.isArray(res.data.friends) ? res.data.friends : []);
      setReceivedRequests(Array.isArray(res.data.received) ? res.data.received : []);
      setSentRequests(Array.isArray(res.data.sent) ? res.data.sent : []);
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
            handleSearch(); 
            fetchFriends(); 
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

  // 모달 열기 함수들
  const openDeleteModal = (friendId) => {
      setConfirmModal({
          isOpen: true,
          type: 'DELETE_FRIEND',
          targetId: friendId,
          message: '정말 삭제하시겠습니까?'
      });
  };

  const openCancelModal = (requestId) => {
      setConfirmModal({
          isOpen: true,
          type: 'CANCEL_REQUEST',
          targetId: requestId,
          message: '요청을 취소하시겠습니까?'
      });
  };

  const openReportModal = (user) => {
      setReportModal({ isOpen: true, targetId: user.id, nickname: user.nickname });
      setReportReason('');
  };

  const handleConfirmAction = async () => {
      const { type, targetId } = confirmModal;
      try {
          if (type === 'DELETE_FRIEND') {
              await api.delete(`/friend/${targetId}`);
              fetchFriends();
          } else if (type === 'CANCEL_REQUEST') {
              await api.delete(`/friend/request/${targetId}`);
              fetchFriends();
          }
      } catch (err) {
          alert("작업 실패");
      } finally {
          setConfirmModal({ ...confirmModal, isOpen: false });
      }
  };

  const submitReport = async () => {
      if(!reportReason.trim()) return alert("신고 사유를 입력해주세요.");
      try {
          await api.post('/user/report', {
              targetId: reportModal.targetId,
              reason: "부적절한 유저 신고",
              description: reportReason
          });
          alert("신고가 접수되었습니다. 관리자가 검토하겠습니다.");
          setReportModal({ ...reportModal, isOpen: false });
      } catch(err) { alert("신고 실패"); }
  };

  return (
    <Container>
      <TabHeader>
        <SubTab active={subTab === 'myFriends'} onClick={() => setSubTab('myFriends')}>내 친구</SubTab>
        <SubTab active={subTab === 'received'} onClick={() => setSubTab('received')}>받은 요청</SubTab>
        <SubTab active={subTab === 'sent'} onClick={() => setSubTab('sent')}>보낸 요청</SubTab>
        <SubTab active={subTab === 'search'} onClick={() => setSubTab('search')}>친구 찾기</SubTab>
      </TabHeader>

      <Content>
        {/* 1. 내 친구 목록 */}
        {subTab === 'myFriends' && (
           <List>
             {myFriends.length === 0 ? <EmptyMsg>친구가 없습니다.</EmptyMsg> : 
              myFriends.map(f => (
                <Card key={f.id}>
                  <Info>
                    <ProfileImg src={getProfileImageUrl(f.profile_img)} onError={(e)=>{e.target.src="/default.png"}} />
                    <div>
                        <Name>{f.nickname}</Name>
                        <Status>{f.status_msg}</Status>
                    </div>
                  </Info>
                  <BtnGroup>
                      <ReportBtn onClick={() => openReportModal(f)}>
                          <FaExclamationCircle />
                      </ReportBtn>
                      <DeleteBtn onClick={() => openDeleteModal(f.id)}>
                          <FaUserTimes />
                      </DeleteBtn>
                  </BtnGroup>
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
                    <ProfileImg src={getProfileImageUrl(req.profile_img)} onError={(e)=>{e.target.src="/default.png"}} />
                    <div>
                        <Name>{req.nickname}</Name>
                        <Status>{formatDate(req.created_at)} 요청</Status>
                    </div>
                  </Info>
                  <BtnGroup>
                    <AcceptBtn onClick={() => respondRequest(req.id, 'accept')}><FaCheck /></AcceptBtn>
                    <RejectBtn onClick={() => respondRequest(req.id, 'reject')}><FaTimes /></RejectBtn>
                    <ReportBtn onClick={() => openReportModal(req)}><FaExclamationCircle /></ReportBtn>
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
                    <ProfileImg src={getProfileImageUrl(req.profile_img)} onError={(e)=>{e.target.src="/default.png"}} />
                    <div>
                        <Name>{req.nickname}</Name>
                        <Status>수락 대기 중</Status>
                    </div>
                  </Info>
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
                placeholder="닉네임 검색" 
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
                     <ProfileImg src={getProfileImageUrl(user.profile_img)} onError={(e)=>{e.target.src="/default.png"}} />
                     <div>
                        <Name>{user.nickname}</Name>
                        <Status>{user.status_msg}</Status>
                     </div>
                   </Info>
                   <BtnGroup>
                       <ReportBtn onClick={() => openReportModal(user)}><FaExclamationCircle /></ReportBtn>
                       <AddBtn onClick={() => sendRequest(user.id)}><FaUserPlus /></AddBtn>
                   </BtnGroup>
                 </Card>
               ))}
            </List>
          </SearchContainer>
        )}
      </Content>

      {/* 삭제/취소 확인 모달 */}
      {confirmModal.isOpen && (
          <ModalOverlay onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
              <ModalBox onClick={(e) => e.stopPropagation()}>
                  <ModalHeader>확인</ModalHeader>
                  <ModalBody>{confirmModal.message}</ModalBody>
                  {/* [수정] ModalFooter가 여기 있습니다! */}
                  <ModalFooter>
                      <SecondaryButton onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
                          취소
                      </SecondaryButton>
                      <DangerButton onClick={handleConfirmAction}>
                          확인
                      </DangerButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

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
                  {/* [수정] 여기도 ModalFooter 사용 */}
                  <ModalFooter>
                      <SecondaryButton onClick={() => setReportModal({ ...reportModal, isOpen: false })}>
                          취소
                      </SecondaryButton>
                      <DangerButton onClick={submitReport}>
                          신고
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
const SubTab = styled.button` padding: 10px 16px; border-radius: 20px; border: none; background-color: ${props => props.active ? '#4a90e2' : '#f0f0f0'}; color: ${props => props.active ? 'white' : '#666'}; font-weight: bold; cursor: pointer; white-space: nowrap; transition: 0.2s; `;
const Content = styled.div` flex: 1; overflow-y: auto; `;
const List = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Card = styled.div` background: white; padding: 15px; border-radius: 15px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 5px rgba(0,0,0,0.03); border: 1px solid #f5f5f5; `;
const Info = styled.div` display: flex; align-items: center; gap: 15px; flex: 1; overflow: hidden;`;
const ProfileImg = styled.img` width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 1px solid #eee; flex-shrink: 0;`;
const Name = styled.div` font-weight: bold; font-size: 16px; color: #333; `;
const Status = styled.div` font-size: 13px; color: #888; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const BtnGroup = styled.div` display: flex; gap: 5px; `;
const ActionBtn = styled.button` padding: 8px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: 0.2s; `;
const AcceptBtn = styled(ActionBtn)` background: #e3f2fd; color: #4a90e2; `;
const RejectBtn = styled(ActionBtn)` background: #ffebee; color: #d9534f; `;
const CancelBtn = styled(ActionBtn)` background: #f5f5f5; color: #888; padding: 6px 12px; gap: 5px;`;
const DeleteBtn = styled(ActionBtn)` background: transparent; color: #ccc; &:hover { color: #d9534f; background: #fff0f0; } `;
const AddBtn = styled(ActionBtn)` background: #4a90e2; color: white; width: 35px; height: 35px; `;
const ReportBtn = styled(ActionBtn)` background: #fff3e0; color: #ff9800; width: 35px; height: 35px; &:hover { background: #ffe0b2; } `; 
const EmptyMsg = styled.div` text-align: center; padding: 40px; color: #aaa; font-size: 14px; `;
const SearchContainer = styled.div` display: flex; flex-direction: column; gap: 20px; `;
const SearchBox = styled.div` display: flex; gap: 10px; margin-bottom: 10px; `;
const SearchInput = styled.input` flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; `;
const SearchBtn = styled.button` width: 50px; background: #4a90e2; color: white; border: none; border-radius: 20px; cursor: pointer; display:flex; justify-content:center; align-items:center; `;

const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; animation: fadeIn 0.2s; `;
const ModalBox = styled.div` background: white; width: 320px; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popUp 0.2s; `;
const ModalHeader = styled.h3` margin: 0 0 15px 0; font-size: 20px; font-weight: bold; color: #333; `;
const ModalBody = styled.div` font-size: 15px; color: #666; margin-bottom: 25px; `;
const ModalTextArea = styled.textarea` width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 20px; outline: none; resize: none; `;

// [중요] 여기에 ModalFooter가 추가되었습니다!
const ModalFooter = styled.div` display: flex; gap: 10px; justify-content: center; `;

const ModalBtn = styled.button` flex: 1; padding: 12px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; font-size: 14px; `;
const SecondaryButton = styled(ModalBtn)` background: #f1f3f5; color: #555; `;
const DangerButton = styled(ModalBtn)` background: #ffebee; color: #d9534f; `;