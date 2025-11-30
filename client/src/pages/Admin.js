import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaUserBan, FaTrash, FaTimes, FaSearch } from 'react-icons/fa'; // 아이콘 추가
import api from '../api';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users'); // users, reports, rooms
  
  // 데이터 상태
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [rooms, setRooms] = useState([]); // [NEW] 채팅방 목록

  // 모달 상태
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // [NEW] 프로필 모달
  
  const [targetUser, setTargetUser] = useState(null); // 선택된 유저 정보
  const [duration, setDuration] = useState('1h');

  // 데이터 불러오기
  const fetchData = async () => {
    try {
      const resUsers = await api.get('/admin/users');
      setUsers(resUsers.data);
      
      const resReports = await api.get('/admin/reports');
      setReports(resReports.data);

      // [NEW] 채팅방 목록 가져오기
      const resRooms = await api.get('/admin/rooms');
      setRooms(resRooms.data);

    } catch (err) {
      alert("관리자 권한이 없습니다.");
      window.location.href = "/";
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 유저 제재 (모달 열기)
  const openBanModal = (user) => {
      setTargetUser(user);
      setDuration('1h');
      setIsBanModalOpen(true);
  };

  // [NEW] 유저 프로필 보기 (모달 열기)
  const openProfileModal = (user) => {
      setTargetUser(user);
      setIsProfileModalOpen(true);
  };

  // 제재 실행
  const submitBan = async () => {
    if(!targetUser) return;
    try {
        await api.post('/admin/ban', { userId: targetUser.id, duration });
        alert(`[${targetUser.nickname}]님을 제재했습니다.`);
        setIsBanModalOpen(false);
        fetchData();
    } catch(err) { alert("오류 발생"); }
  };

  // [NEW] 채팅방 강제 삭제
  const deleteRoom = async (roomId, title) => {
      if(window.confirm(`정말 '${title}' 채팅방을 영구 삭제하시겠습니까?\n모든 대화 내용이 사라집니다.`)) {
          try {
              await api.delete(`/admin/room/${roomId}`);
              alert("삭제되었습니다.");
              fetchData();
          } catch(err) { alert("삭제 실패"); }
      }
  };

  return (
    <Container>
      <Header>
        <Title>👮 관리자 페이지</Title>
        <TabContainer>
          <Tab active={activeTab === 'users'} onClick={() => setActiveTab('users')}>유저 관리</Tab>
          <Tab active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>신고 내역</Tab>
          <Tab active={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')}>채팅방 관리</Tab>
        </TabContainer>
      </Header>

      <Content>
        {/* 1. 유저 관리 탭 */}
        {activeTab === 'users' && (
            <Table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>닉네임 (클릭하여 프로필)</th>
                        <th>이메일</th>
                        <th>상태</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>
                                {/* [NEW] 닉네임 클릭 시 프로필 모달 */}
                                <ClickableName onClick={() => openProfileModal(u)}>
                                    {u.nickname}
                                </ClickableName>
                            </td>
                            <td>{u.email}</td>
                            <td>
                                {u.role === 'admin' ? <Badge color="#4a90e2">관리자</Badge> : 
                                 u.ban_expires_at ? <Badge color="#d9534f">정지됨</Badge> : '정상'}
                            </td>
                            <td>
                                {u.role !== 'admin' && (
                                    <ActionBtn onClick={() => openBanModal(u)}>
                                        <FaUserBan /> 제재
                                    </ActionBtn>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        )}

        {/* 2. 신고 내역 탭 */}
        {activeTab === 'reports' && (
             <Table>
                <thead>
                    <tr>
                        <th>신고자</th>
                        <th>내용</th>
                        <th>시간</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r, i) => (
                        <tr key={i}>
                            <td>{r.reporter}</td>
                            <td>
                                <div><b>{r.reason}</b></div>
                                <div style={{fontSize: '12px', color: '#666'}}>{r.description}</div>
                            </td>
                            <td>{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
             </Table>
        )}

        {/* 3. [NEW] 채팅방 관리 탭 */}
        {activeTab === 'rooms' && (
            <Table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>방 제목</th>
                        <th>태그</th>
                        <th>방장</th>
                        <th>인원</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {rooms.map(room => (
                        <tr key={room.id}>
                            <td>{room.id}</td>
                            <td>{room.title}</td>
                            <td><Tags>{room.hashtags}</Tags></td>
                            <td>{room.creator || '(알수없음)'}</td>
                            <td>{room.user_count}명</td>
                            <td>
                                <DeleteBtn onClick={() => deleteRoom(room.id, room.title)}>
                                    <FaTrash /> 삭제
                                </DeleteBtn>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        )}
      </Content>

      {/* --- 제재 모달 --- */}
      {isBanModalOpen && (
          <ModalOverlay onClick={() => setIsBanModalOpen(false)}>
              <ModalBox onClick={e => e.stopPropagation()}>
                  <h3>🚫 유저 제재</h3>
                  <p>대상: <b>{targetUser?.nickname}</b></p>
                  <Select value={duration} onChange={e => setDuration(e.target.value)}>
                      <option value="1h">1시간 정지</option>
                      <option value="24h">하루 정지</option>
                      <option value="7d">7일 정지</option>
                      <option value="forever">영구 차단</option>
                  </Select>
                  <ModalFooter>
                      <Button onClick={() => setIsBanModalOpen(false)}>취소</Button>
                      <DangerButton onClick={submitBan}>제재 적용</DangerButton>
                  </ModalFooter>
              </ModalBox>
          </ModalOverlay>
      )}

      {/* --- [NEW] 프로필 상세 모달 --- */}
      {isProfileModalOpen && targetUser && (
          <ModalOverlay onClick={() => setIsProfileModalOpen(false)}>
              <ProfileModalBox onClick={e => e.stopPropagation()}>
                  <CloseBtn onClick={() => setIsProfileModalOpen(false)}><FaTimes /></CloseBtn>
                  <ProfileImg src={targetUser.profile_img || "/default.png"} />
                  <ProfileName>{targetUser.nickname}</ProfileName>
                  <ProfileEmail>{targetUser.email}</ProfileEmail>
                  <ProfileStatus>{targetUser.status_msg || "상태 메시지가 없습니다."}</ProfileStatus>
                  {targetUser.hashtags && <Tags>{targetUser.hashtags}</Tags>}
                  
                  <ModalFooter style={{marginTop: '20px'}}>
                      <Button onClick={() => setIsProfileModalOpen(false)}>닫기</Button>
                      {targetUser.role !== 'admin' && (
                          <DangerButton onClick={() => { setIsProfileModalOpen(false); openBanModal(targetUser); }}>
                              <FaUserBan /> 이 유저 제재하기
                          </DangerButton>
                      )}
                  </ModalFooter>
              </ProfileModalBox>
          </ModalOverlay>
      )}

    </Container>
  );
};

export default Admin;

// --- 스타일 컴포넌트 ---
const Container = styled.div` padding: 40px; max-width: 1200px; margin: 0 auto; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; `;
const Title = styled.h1` font-size: 28px; font-weight: bold; color: #333; `;
const TabContainer = styled.div` display: flex; gap: 10px; background: #f1f3f5; padding: 5px; border-radius: 10px; `;
const Tab = styled.button` padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; background: ${props => props.active ? 'white' : 'transparent'}; color: ${props => props.active ? '#4a90e2' : '#888'}; box-shadow: ${props => props.active ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'}; transition: 0.2s; `;
const Content = styled.div` background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); padding: 20px; overflow-x: auto; `;
const Table = styled.table` width: 100%; border-collapse: collapse; min-width: 600px; th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; } th { font-weight: bold; color: #555; background: #f8f9fa; } tr:hover { background: #fafafa; } `;
const Badge = styled.span` background: ${props => props.color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; `;
const ActionBtn = styled.button` background: #fff0f0; color: #d9534f; border: 1px solid #d9534f; padding: 5px 10px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px; &:hover { background: #d9534f; color: white; } `;
const DeleteBtn = styled(ActionBtn)` background: #ffebee; color: #c62828; border-color: #c62828; &:hover { background: #c62828; } `;
const ClickableName = styled.span` color: #4a90e2; font-weight: bold; cursor: pointer; &:hover { text-decoration: underline; } `;
const Tags = styled.span` background: #e3f2fd; color: #4a90e2; padding: 2px 8px; border-radius: 10px; font-size: 12px; `;

const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; `;
const ModalBox = styled.div` background: white; padding: 30px; border-radius: 15px; width: 350px; `;
const ProfileModalBox = styled(ModalBox)` text-align: center; position: relative; `;
const CloseBtn = styled.button` position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 20px; cursor: pointer; color: #888; `;
const ProfileImg = styled.img` width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #f1f3f5; `;
const ProfileName = styled.div` font-size: 22px; font-weight: bold; margin-bottom: 5px; `;
const ProfileEmail = styled.div` font-size: 14px; color: #888; margin-bottom: 15px; `;
const ProfileStatus = styled.div` background: #f8f9fa; padding: 15px; border-radius: 10px; color: #555; margin-bottom: 15px; font-size: 14px; `;

const Select = styled.select` width: 100%; padding: 10px; margin: 15px 0; border-radius: 5px; border: 1px solid #ddd; `;
const ModalFooter = styled.div` display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; `;
const Button = styled.button` padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; background: #eee; `;
const DangerButton = styled(Button)` background: #d9534f; color: white; `;