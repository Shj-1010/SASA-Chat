import axios from 'axios';

const api = axios.create({
  // 나중에 배포할 때 'REACT_APP_SERVER_URL'에 서버 주소를 넣을 겁니다.
  baseURL: process.env.REACT_APP_SERVER_URL || 'http://localhost:5000',
  withCredentials: true,
});

export default api;