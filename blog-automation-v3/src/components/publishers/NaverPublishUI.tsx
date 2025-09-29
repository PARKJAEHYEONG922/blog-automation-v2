import React, { useState, useEffect, useCallback } from 'react';
import { PublishComponentProps, PublishStatus, NaverCredentials, PublishOption, SavedAccount } from '../../types';
import { PublishManager } from '../../services/publishers/publish-manager';

const NaverPublishUI: React.FC<PublishComponentProps> = ({ 
  data, 
  editedContent, 
  imageUrls, 
  onComplete,
  copyToClipboard 
}) => {
  
  // 상태 관리
  const [naverCredentials, setNaverCredentials] = useState<NaverCredentials>({
    username: '',
    password: ''
  });
  
  const [boardCategory, setBoardCategory] = useState<string>('');
  const [selectedBoardCategory, setSelectedBoardCategory] = useState<string>('');
  const [saveCredentials, setSaveCredentials] = useState<boolean>(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  const [accountBoards, setAccountBoards] = useState<{[accountId: string]: string[]}>({});
  const [showBoardSelector, setShowBoardSelector] = useState<boolean>(false);
  
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({
    isPublishing: false,
    isLoggedIn: false,
    error: '',
    success: false
  });

  // 발행 옵션 상태
  const [publishOption, setPublishOption] = useState<PublishOption>('immediate');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledHour, setScheduledHour] = useState<string>('');
  const [scheduledMinute, setScheduledMinute] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');
  const [timeUntilPublish, setTimeUntilPublish] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(0);
  
  // 이미지 확인 다이얼로그 상태
  const [showImageConfirmDialog, setShowImageConfirmDialog] = useState<boolean>(false);
  const [pendingPublishAction, setPendingPublishAction] = useState<(() => void) | null>(null);

  // 발행 관리자 인스턴스
  const publishManager = PublishManager.getInstance();

  // 이미지 상태 확인 함수 - 발행 정보와 동일한 로직 사용 (원본)
  const checkImageStatus = (): { hasIncompleteImages: boolean; incompleteCount: number; totalCount: number } => {
    const imageRegex = /[\(\[\*_]이미지\d*[\)\]\*_]/g;
    const totalImages = (editedContent.match(imageRegex) || []).length;
    const generatedImages = Object.keys(imageUrls).length;
    const incompleteCount = totalImages - generatedImages;
    
    return {
      hasIncompleteImages: incompleteCount > 0,
      incompleteCount,
      totalCount: totalImages
    };
  };

  // 발행 전 이미지 확인 핸들러 (원본)
  const handlePublishWithImageCheck = (publishAction: () => void) => {
    const { hasIncompleteImages, incompleteCount, totalCount } = checkImageStatus();
    
    if (hasIncompleteImages) {
      setPendingPublishAction(() => publishAction);
      setShowImageConfirmDialog(true);
    } else {
      publishAction();
    }
  };

  // 네이버 로그인 + 발행 통합 함수 (원본)
  const publishToNaverBlog = async (): Promise<{ success: boolean; message: string }> => {
    if (!naverCredentials.username || !naverCredentials.password) {
      setPublishStatus(prev => ({
        ...prev,
        error: '아이디와 비밀번호를 입력해주세요.'
      }));
      return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
    }
    
    setPublishStatus(prev => ({
      ...prev,
      error: '',
      isPublishing: true
    }));
    
    try {
      const result = await publishManager.publishToNaver({
        credentials: naverCredentials,
        content: editedContent,
        imageUrls,
        publishOption,
        scheduledDate,
        scheduledHour,
        scheduledMinute,
        boardCategory,
        onStatusUpdate: (status) => setPublishStatus(prev => ({ ...prev, ...status })),
        copyToClipboard,
        saveAccount: saveCredentials ? saveAccount : undefined,
        data: data // WorkflowData 전달 - 제목 정보 포함
      });

      if (result.success) {
        setPublishStatus(prev => ({ ...prev, success: true, isPublishing: false }));
        
        // 선택된 게시판 정보 설정
        if (result.selectedBoard) {
          setSelectedBoardCategory(result.selectedBoard);
        }
        
        if (onComplete) {
          onComplete({ publishedUrl: result.url || 'Published successfully' });
        }
      } else {
        setPublishStatus(prev => ({ 
          ...prev, 
          error: result.message, 
          isPublishing: false 
        }));
      }

      return result;
    } catch (error) {
      console.error('발행 실패:', error);
      const errorMessage = '발행 중 오류가 발생했습니다.';
      setPublishStatus(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isPublishing: false 
      }));
      return { success: false, message: errorMessage };
    }
  };






  /**
   * 컴포넌트 초기화
   */
  const initializeComponent = () => {
    // 기본 예약 시간 설정 (1시간 후)
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const year = oneHourLater.getFullYear();
    const month = (oneHourLater.getMonth() + 1).toString().padStart(2, '0');
    const day = oneHourLater.getDate().toString().padStart(2, '0');
    const hour = oneHourLater.getHours().toString().padStart(2, '0');
    const minute = Math.floor(oneHourLater.getMinutes() / 10) * 10;
    
    setScheduledDate(`${year}-${month}-${day}`);
    setScheduledHour(hour);
    setScheduledMinute(minute.toString().padStart(2, '0'));

    // 저장된 계정 정보 로드
    loadSavedAccounts();
  };

  /**
   * 저장된 계정들 로드
   */
  const loadSavedAccounts = () => {
    try {
      const saved = localStorage.getItem('naverAccounts');
      if (saved) {
        const accounts = JSON.parse(saved);
        setSavedAccounts(accounts);
        // 가장 최근 사용한 계정을 기본으로 설정
        if (accounts.length > 0) {
          const mostRecent = accounts.sort((a: any, b: any) => b.lastUsed - a.lastUsed)[0];
          const savedPassword = localStorage.getItem(`naverPassword_${mostRecent.id}`);
          if (savedPassword) {
            setNaverCredentials({
              username: mostRecent.username,
              password: savedPassword
            });
            setSaveCredentials(true);
            // 해당 계정의 게시판 목록 로드
            loadAccountBoards(mostRecent.id);
          }
        }
      } else {
        // 기존 단일 자격증명 마이그레이션
        const oldCredentials = localStorage.getItem('naverCredentials');
        if (oldCredentials) {
          const credentials = JSON.parse(oldCredentials);
          if (credentials.username && credentials.password) {
            saveAccount(credentials.username, credentials.password);
            setNaverCredentials(credentials);
            setSaveCredentials(true);
            localStorage.removeItem('naverCredentials'); // 기존 데이터 제거
          }
        }
      }
      
      // 전체 계정별 게시판 데이터 로드
      loadAllAccountBoards();
    } catch (error) {
      console.error('저장된 계정 목록 로드 실패:', error);
    }
  };

  /**
   * 모든 계정의 게시판 데이터 로드
   */
  const loadAllAccountBoards = () => {
    try {
      const saved = localStorage.getItem('accountBoards');
      if (saved) {
        const boards = JSON.parse(saved);
        setAccountBoards(boards);
      }
    } catch (error) {
      console.error('계정별 게시판 데이터 로드 실패:', error);
    }
  };

  /**
   * 계정별 게시판 목록 로드
   */
  const loadAccountBoards = (accountId: string) => {
    try {
      const saved = localStorage.getItem(`naverBoards_${accountId}`);
      if (saved) {
        const boards = JSON.parse(saved);
        setAccountBoards(prev => ({ ...prev, [accountId]: boards }));
      }
    } catch (error) {
      console.error('게시판 목록 로드 실패:', error);
    }
  };

  /**
   * 계정 선택 함수
   */
  const selectAccount = (account: SavedAccount) => {
    try {
      const savedPassword = localStorage.getItem(`naverPassword_${account.id}`);
      if (savedPassword) {
        setNaverCredentials({
          username: account.username,
          password: savedPassword
        });
        setSaveCredentials(true);
        setShowAccountSelector(false);
        
        // 최근 사용 시간 업데이트
        const accounts = savedAccounts.map(acc => 
          acc.id === account.id ? {...acc, lastUsed: Date.now()} : acc
        );
        setSavedAccounts(accounts);
        localStorage.setItem('naverAccounts', JSON.stringify(accounts));
        
        // 해당 계정의 게시판 목록 로드하고 게시판 필드 초기화
        loadAccountBoards(account.id);
        setBoardCategory('');
      }
    } catch (error) {
      console.error('계정 선택 실패:', error);
    }
  };

  /**
   * 계정 저장 함수
   */
  const saveAccount = (username: string, password: string) => {
    try {
      const accountId = btoa(username); // username을 base64로 인코딩하여 ID로 사용
      const accounts = [...savedAccounts];
      const existingIndex = accounts.findIndex(acc => acc.id === accountId);
      
      const accountInfo: SavedAccount = {
        id: accountId,
        username: username,
        lastUsed: Date.now()
      };

      if (existingIndex >= 0) {
        // 기존 계정 업데이트
        accounts[existingIndex] = accountInfo;
      } else {
        // 새 계정 추가
        accounts.push(accountInfo);
      }

      // 계정 목록 저장 (비밀번호 제외)
      localStorage.setItem('naverAccounts', JSON.stringify(accounts));
      // 비밀번호는 별도 저장
      localStorage.setItem(`naverPassword_${accountId}`, password);
      
      setSavedAccounts(accounts);
      console.log('💾 네이버 계정 저장됨:', username);
    } catch (error) {
      console.error('계정 저장 실패:', error);
    }
  };

  /**
   * 계정 삭제 함수
   */
  const deleteAccount = (accountId: string) => {
    try {
      const accounts = savedAccounts.filter(acc => acc.id !== accountId);
      setSavedAccounts(accounts);
      localStorage.setItem('naverAccounts', JSON.stringify(accounts));
      localStorage.removeItem(`naverPassword_${accountId}`);
      
      // 해당 계정의 게시판 데이터도 삭제
      const newAccountBoards = {...accountBoards};
      delete newAccountBoards[accountId];
      setAccountBoards(newAccountBoards);
      localStorage.setItem('accountBoards', JSON.stringify(newAccountBoards));
      
      console.log('🗑️ 네이버 계정 삭제됨:', accountId);
    } catch (error) {
      console.error('계정 삭제 실패:', error);
    }
  };

  /**
   * 계정별 게시판 저장 함수
   */
  const saveBoardForAccount = (accountId: string, boardName: string) => {
    if (!boardName.trim()) return;
    
    try {
      const trimmedBoardName = boardName.trim();
      const currentBoards = accountBoards[accountId] || [];
      
      // 중복 체크 - 이미 있으면 맨 앞으로 이동, 없으면 추가
      const filteredBoards = currentBoards.filter(board => board !== trimmedBoardName);
      const newBoards = [trimmedBoardName, ...filteredBoards].slice(0, 10); // 최대 10개까지만 저장
      
      const newAccountBoards = {
        ...accountBoards,
        [accountId]: newBoards
      };
      
      setAccountBoards(newAccountBoards);
      localStorage.setItem('accountBoards', JSON.stringify(newAccountBoards));
      console.log(`📋 계정 ${accountId}에 게시판 "${trimmedBoardName}" 저장됨`);
    } catch (error) {
      console.error('게시판 저장 실패:', error);
    }
  };

  /**
   * 게시판 삭제 함수
   */
  const deleteBoardFromAccount = (accountId: string, boardName: string) => {
    try {
      const currentBoards = accountBoards[accountId] || [];
      const newBoards = currentBoards.filter(board => board !== boardName);
      
      const newAccountBoards = {
        ...accountBoards,
        [accountId]: newBoards
      };
      
      setAccountBoards(newAccountBoards);
      localStorage.setItem('accountBoards', JSON.stringify(newAccountBoards));
      console.log(`🗑️ 게시판 "${boardName}" 삭제됨`);
    } catch (error) {
      console.error('게시판 삭제 실패:', error);
    }
  };

  /**
   * 게시판 순서 변경 함수 (위로)
   */
  const moveBoardUp = (accountId: string, index: number) => {
    if (index === 0) return; // 이미 맨 위
    
    try {
      const currentBoards = [...(accountBoards[accountId] || [])];
      [currentBoards[index - 1], currentBoards[index]] = [currentBoards[index], currentBoards[index - 1]];
      
      const newAccountBoards = {
        ...accountBoards,
        [accountId]: currentBoards
      };
      
      setAccountBoards(newAccountBoards);
      localStorage.setItem('accountBoards', JSON.stringify(newAccountBoards));
      console.log('📋 게시판 순서 변경: 위로 이동');
    } catch (error) {
      console.error('게시판 순서 변경 실패:', error);
    }
  };

  /**
   * 게시판 순서 변경 함수 (아래로)
   */
  const moveBoardDown = (accountId: string, index: number) => {
    const currentBoards = accountBoards[accountId] || [];
    if (index === currentBoards.length - 1) return; // 이미 맨 아래
    
    try {
      const newBoards = [...currentBoards];
      [newBoards[index], newBoards[index + 1]] = [newBoards[index + 1], newBoards[index]];
      
      const newAccountBoards = {
        ...accountBoards,
        [accountId]: newBoards
      };
      
      setAccountBoards(newAccountBoards);
      localStorage.setItem('accountBoards', JSON.stringify(newAccountBoards));
      console.log('📋 게시판 순서 변경: 아래로 이동');
    } catch (error) {
      console.error('게시판 순서 변경 실패:', error);
    }
  };

  /**
   * 게시판 선택 함수
   */
  const selectBoard = (boardName: string) => {
    console.log('📋 게시판 선택됨:', boardName);
    setBoardCategory(boardName);
    setShowBoardSelector(false);
    console.log('📋 게시판 설정 완료, 드롭다운 닫기');
  };


  /**
   * 실제 발행 실행
   */
  const executePublish = async () => {
    setPublishStatus(prev => ({
      ...prev,
      isPublishing: true,
      error: ''
    }));

    try {
      // publishToNaver 메서드를 직접 호출하여 selectedBoard 정보를 받아옴
      const result = await publishManager.publishToNaver({
        credentials: naverCredentials,
        content: editedContent,
        imageUrls: imageUrls,
        publishOption: publishOption,
        scheduledDate: publishOption === 'scheduled' ? scheduledDate : undefined,
        scheduledHour: publishOption === 'scheduled' ? scheduledHour : undefined,
        scheduledMinute: publishOption === 'scheduled' ? scheduledMinute : undefined,
        boardCategory: boardCategory,
        data: data, // WorkflowData 전달
        onStatusUpdate: (status) => {
          setPublishStatus(prev => ({
            ...prev,
            isPublishing: status.isPublishing ?? prev.isPublishing,
            isLoggedIn: status.isLoggedIn ?? prev.isLoggedIn,
            error: status.error || prev.error
          }));
        },
        copyToClipboard: copyToClipboard,
        saveAccount: saveCredentials ? saveAccountInfo : undefined
      });

      if (result.success) {
        setPublishStatus({
          isPublishing: false,
          isLoggedIn: true,
          error: '',
          success: true
        });

        // 발행 성공 시 실제 선택된 게시판 정보 업데이트 (원본과 동일)
        if (result.selectedBoard) {
          console.log('🔥 setSelectedBoardCategory 호출 중:', result.selectedBoard);
          setSelectedBoardCategory(result.selectedBoard);
          console.log('🔥 setSelectedBoardCategory 호출 완료');
        }

        // 계정 정보 저장 (옵션)
        if (saveCredentials) {
          saveAccountInfo();
        }

        // 완료 콜백 호출
        onComplete({ 
          publishedUrl: result.url,
          publishPlatform: 'naver',
          selectedBoard: result.selectedBoard // 선택된 게시판 정보도 전달
        });

      } else {
        setPublishStatus(prev => ({
          ...prev,
          isPublishing: false,
          error: result.message
        }));
      }

    } catch (error) {
      console.error('발행 실패:', error);
      setPublishStatus(prev => ({
        ...prev,
        isPublishing: false,
        error: error instanceof Error ? error.message : '발행 중 오류가 발생했습니다.'
      }));
    }
  };

  /**
   * 계정 정보 저장
   */
  const saveAccountInfo = () => {
    try {
      const accountId = `naver_${naverCredentials.username}`;
      const accountInfo: SavedAccount = {
        id: accountId,
        username: naverCredentials.username,
        lastUsed: Date.now()
      };

      // 계정 목록 업데이트
      let accounts = [...savedAccounts];
      accounts = accounts.filter(acc => acc.id !== accountId);
      accounts.unshift(accountInfo);
      
      // 최대 5개까지만 저장
      if (accounts.length > 5) {
        accounts = accounts.slice(0, 5);
      }

      localStorage.setItem('naverAccounts', JSON.stringify(accounts));
      localStorage.setItem(`naverPassword_${accountId}`, naverCredentials.password);
      
      setSavedAccounts(accounts);
      console.log('✅ 네이버 계정 정보 저장 완료');
    } catch (error) {
      console.error('❌ 계정 정보 저장 실패:', error);
    }
  };

  /**
   * 네이버 로그아웃 및 브라우저 정리 함수
   */
  const logoutFromNaver = async () => {
    try {
      // 브라우저 정리
      await window.electronAPI.playwrightCleanup();
      console.log('브라우저 정리 완료');
    } catch (error) {
      console.error('브라우저 정리 실패:', error);
    }
    
    setPublishStatus(prev => ({
      ...prev,
      isLoggedIn: false,
      error: '',
      success: false
    }));
    setNaverCredentials({ username: '', password: '' });
  };

  /**
   * 로그아웃 (기존 함수 - 향후 통합 고려)
   */
  const handleLogout = async () => {
    try {
      await publishManager.logout('naver');
      setPublishStatus({
        isPublishing: false,
        isLoggedIn: false,
        error: '',
        success: false
      });
      setSelectedBoardCategory('');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  /**
   * 시간 계산 업데이트
   */
  const updateTimeUntilPublish = () => {
    if (publishOption === 'scheduled' && scheduledDate && scheduledHour && scheduledMinute) {
      const scheduledTime = new Date(`${scheduledDate} ${scheduledHour}:${scheduledMinute}`);
      const now = new Date();
      const diffMs = scheduledTime.getTime() - now.getTime();
      
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilPublish(`${hours}시간 ${minutes}분 후`);
        setTimeError('');
      } else {
        setTimeError('예약 시간은 현재 시간보다 늦어야 합니다.');
        setTimeUntilPublish('');
      }
    } else {
      setTimeUntilPublish('');
      setTimeError('');
    }
  };

  /**
   * 달력 데이터 생성 함수
   */
  const getCalendarDays = (monthOffset: number = 0) => {
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 표시할 달 계산
    const targetDate = new Date(currentYear, currentMonth + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    // 해당 달의 마지막 날
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // 해당 달의 첫 번째 날의 요일 (0: 일요일)
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // 이전 달 빈 칸들
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // 해당 달 날짜들
    for (let day = 1; day <= lastDay; day++) {
      // 현재 달이고 오늘보다 이전 날짜인 경우만 비활성화
      const isCurrentMonth = monthOffset === 0;
      const isDisabled = isCurrentMonth && day < today;
      const isToday = isCurrentMonth && day === today;
      
      days.push({
        day,
        isDisabled,
        isToday,
        fullDate: `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      });
    }
    
    return {
      days,
      year,
      month: month + 1,
      monthName: `${month + 1}월`,
      canGoPrev: monthOffset > 0,
      canGoNext: monthOffset < 11 // 1년(12개월)까지 가능
    };
  };

  /**
   * 이전 달로 이동
   */
  const goToPrevMonth = () => {
    setCurrentCalendarMonth(prev => Math.max(0, prev - 1));
  };

  /**
   * 다음 달로 이동
   */
  const goToNextMonth = () => {
    setCurrentCalendarMonth(prev => Math.min(11, prev + 1));
  };

  /**
   * 날짜 선택 핸들러
   */
  const handleDateSelect = (dayInfo: any) => {
    if (!dayInfo || dayInfo.isDisabled) return;
    
    setScheduledDate(dayInfo.fullDate);
    setShowDatePicker(false);
    
    // 날짜 변경 시 시간 재검증
    updateTimeUntilPublish();
  };

  /**
   * 시간 변경 핸들러 - calculateTimeUntil 함수 사용
   */
  const handleTimeChange = useCallback((type: 'hour' | 'minute', value: string) => {
    if (type === 'hour') {
      setScheduledHour(value);
      // 시간이 변경될 때마다 계산
      if (value && scheduledMinute && scheduledDate) {
        const selectedTime = new Date(`${scheduledDate} ${value}:${scheduledMinute}`);
        const timeMessage = calculateTimeUntil(selectedTime);
        
        if (timeMessage === '과거 시간입니다') {
          setTimeError('⚠️ 현재 시간보다 이후로 설정해주세요');
          setTimeUntilPublish('');
        } else {
          setTimeError('');
          setTimeUntilPublish(`${timeMessage} 발행됩니다`);
        }
      }
    } else {
      setScheduledMinute(value);
      // 분이 변경될 때마다 계산
      if (scheduledHour && value && scheduledDate) {
        const selectedTime = new Date(`${scheduledDate} ${scheduledHour}:${value}`);
        const timeMessage = calculateTimeUntil(selectedTime);
        
        if (timeMessage === '과거 시간입니다') {
          setTimeError('⚠️ 현재 시간보다 이후로 설정해주세요');
          setTimeUntilPublish('');
        } else {
          setTimeError('');
          setTimeUntilPublish(`${timeMessage} 발행됩니다`);
        }
      }
    }
  }, [scheduledHour, scheduledMinute, scheduledDate]);

  // 컴포넌트 마운트 시 기본 예약 시간 설정 (1시간 후) 및 저장된 자격 증명 로드
  useEffect(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const year = oneHourLater.getFullYear();
    const month = (oneHourLater.getMonth() + 1).toString().padStart(2, '0');
    const day = oneHourLater.getDate().toString().padStart(2, '0');
    const hour = oneHourLater.getHours().toString().padStart(2, '0');
    const minute = Math.floor(oneHourLater.getMinutes() / 10) * 10; // 10분 단위로 반올림
    
    setScheduledDate(`${year}-${month}-${day}`);
    setScheduledHour(hour);
    setScheduledMinute(minute.toString().padStart(2, '0'));
    
    // 저장된 계정 정보 로드
    loadSavedAccounts();
  }, []);

  // 초기 시간 설정 후 계산 (날짜 변경 시에도 재계산)
  useEffect(() => {
    if (scheduledHour && scheduledMinute && scheduledDate) {
      const selectedTime = new Date(`${scheduledDate} ${scheduledHour}:${scheduledMinute}`);
      const timeMessage = calculateTimeUntil(selectedTime);
      
      if (timeMessage === '과거 시간입니다') {
        setTimeError('⚠️ 현재 시간보다 이후로 설정해주세요');
        setTimeUntilPublish('');
      } else {
        setTimeError('');
        setTimeUntilPublish(`${timeMessage} 발행됩니다`);
      }
    }
  }, [scheduledDate, scheduledHour, scheduledMinute]);

  // 시간 변경 시 업데이트
  useEffect(() => {
    updateTimeUntilPublish();
  }, [publishOption, scheduledDate, scheduledHour, scheduledMinute]);

  // 게시판 선택 완료 시 자동 저장 (원본 로직)
  useEffect(() => {
    if (selectedBoardCategory && selectedBoardCategory !== '알 수 없음' && naverCredentials.username && publishStatus.success) {
      const accountId = btoa(naverCredentials.username);
      console.log('📋 게시판 자동 저장:', selectedBoardCategory, 'for 계정:', naverCredentials.username);
      saveBoardForAccount(accountId, selectedBoardCategory);
    }
  }, [selectedBoardCategory, naverCredentials.username, publishStatus.success]);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      {/* 헤더 - 원본과 동일하게 제거하고 인라인으로 처리 */}

      {!publishStatus.success ? (
        <div className="space-y-3">
          {/* 로그인 정보와 발행 옵션을 나란히 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 왼쪽: 로그인 정보 */}
            <div className="flex flex-col justify-center space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <div className="relative account-selector-container">
                  <input
                    type="text"
                    value={naverCredentials.username}
                    onChange={(e) => {
                      setNaverCredentials({ ...naverCredentials, username: e.target.value });
                    }}
                    placeholder="네이버 아이디"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                    disabled={publishStatus.isPublishing}
                  />
                  {savedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAccountSelector(!showAccountSelector)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={publishStatus.isPublishing}
                      title="저장된 계정 선택"
                    >
                      👤
                    </button>
                  )}
              </div>
              
              {/* 계정 선택 드롭다운 (백업에서 완전 버전 이동) */}
              {showAccountSelector && savedAccounts.length > 0 && (
                <div className="absolute z-10 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 text-xs text-gray-500 bg-gray-50 border-b">
                    저장된 계정 ({savedAccounts.length}개)
                  </div>
                  {savedAccounts
                    .sort((a, b) => b.lastUsed - a.lastUsed)
                    .map((account) => (
                      <div key={account.id} className="flex items-center p-2 hover:bg-gray-50 border-b last:border-b-0 group">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('👤 계정 선택됨:', account.username);
                            selectAccount(account);
                          }}
                          className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 pr-2"
                        >
                          <div className="font-medium">{account.username}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(account.lastUsed).toLocaleDateString()} 사용
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm(`계정 "${account.username}"을(를) 삭제하시겠습니까?\n\n삭제하면 저장된 비밀번호와 게시판 목록도 함께 삭제됩니다.`)) {
                              deleteAccount(account.id);
                            }
                          }}
                          className="px-1 py-0.5 text-xs text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="삭제"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={naverCredentials.password}
                  onChange={(e) => {
                    setNaverCredentials({ ...naverCredentials, password: e.target.value });
                  }}
                  placeholder="비밀번호"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={publishStatus.isPublishing}
                  onKeyPress={(e) => e.key === 'Enter' && handlePublishWithImageCheck(publishToNaverBlog)}
                />
              </div>
              
              {/* 게시판 카테고리 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  게시판 (선택사항)
                </label>
                <div className="relative board-selector-container">
                  <input
                    type="text"
                    value={boardCategory}
                    onChange={(e) => setBoardCategory(e.target.value)}
                    placeholder="예: 일상, 강아지건강, 취미생활"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                    disabled={publishStatus.isPublishing}
                  />
                  {naverCredentials.username && accountBoards[btoa(naverCredentials.username)]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('📋 게시판 선택 버튼 클릭됨, 현재 상태:', showBoardSelector);
                        console.log('📋 현재 계정의 게시판 목록:', accountBoards[btoa(naverCredentials.username)]);
                        const newState = !showBoardSelector;
                        console.log('📋 새로운 상태로 변경:', newState);
                        setShowBoardSelector(newState);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={publishStatus.isPublishing}
                      title="저장된 게시판 선택"
                    >
                      📋
                    </button>
                  )}
                </div>
                
                {/* 게시판 선택 드롭다운 */}
                {showBoardSelector && naverCredentials.username && accountBoards[btoa(naverCredentials.username)]?.length > 0 && (
                  <div className="board-selector-container absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    <div className="p-2 text-xs text-gray-500 bg-gray-50 border-b">
                      이전에 사용한 게시판 ({accountBoards[btoa(naverCredentials.username)].length}개)
                    </div>
                    {accountBoards[btoa(naverCredentials.username)].map((board, index) => {
                      const accountId = btoa(naverCredentials.username);
                      const isFirst = index === 0;
                      const isLast = index === accountBoards[accountId].length - 1;
                      
                      return (
                        <div key={index} className="flex items-center p-2 hover:bg-gray-50 border-b last:border-b-0 group">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('📋 게시판 버튼 클릭됨:', board);
                              selectBoard(board);
                            }}
                            className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 py-1 pr-2"
                          >
                            {board}
                          </button>
                          
                          {/* 순서 변경 및 삭제 버튼들 */}
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* 위로 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                moveBoardUp(accountId, index);
                              }}
                              disabled={isFirst}
                              className={`px-1 py-0.5 text-xs ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
                              title="위로"
                            >
                              ↑
                            </button>
                            
                            {/* 아래로 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                moveBoardDown(accountId, index);
                              }}
                              disabled={isLast}
                              className={`px-1 py-0.5 text-xs ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
                              title="아래로"
                            >
                              ↓
                            </button>
                            
                            {/* 삭제 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm(`게시판 "${board}"을(를) 삭제하시겠습니까?`)) {
                                  deleteBoardFromAccount(accountId, board);
                                }
                              }}
                              className="px-1 py-0.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  💡 입력하신 게시판명과 일치하는 카테고리를 찾아서 자동으로 선택합니다.
                  {naverCredentials.username && accountBoards[btoa(naverCredentials.username)]?.length > 0 && (
                    <><br/>📋 이전에 사용한 게시판은 📋 버튼으로 선택할 수 있습니다.</>
                  )}
                </p>
              </div>
              
              {/* 자격 증명 저장 체크박스 */}
              <div className="flex items-center space-x-2 mt-3">
                <div 
                  onClick={() => !publishStatus.isPublishing && setSaveCredentials(!saveCredentials)}
                  className={`w-4 h-4 border-2 rounded cursor-pointer flex items-center justify-center ${
                    saveCredentials 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-gray-400 hover:border-blue-500'
                  } ${publishStatus.isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ minWidth: '16px', minHeight: '16px' }}
                >
                  {saveCredentials && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <label 
                  onClick={() => !publishStatus.isPublishing && setSaveCredentials(!saveCredentials)}
                  className="text-sm text-gray-600 cursor-pointer select-none"
                >
                  성공한 로그인 계정 자동 저장
                </label>
              </div>
              
              <div className="mt-2">
                <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  🔒 로그인 정보는 발행 목적으로만 사용됩니다
                  {saveCredentials && <><br/>✅ 성공한 로그인 계정이 자동으로 저장됩니다</>}
                </div>
              </div>
            </div>
            
            {/* 오른쪽: 발행 옵션 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  발행 방식
                </label>
                <div className="space-y-3">
                  {/* 임시저장 카드 */}
                  <label className={`group relative block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    publishOption === 'temp' 
                      ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                  } ${publishStatus.isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="publishOption"
                        value="temp"
                        checked={publishOption === 'temp'}
                        onChange={(e) => setPublishOption(e.target.value as PublishOption)}
                        disabled={publishStatus.isPublishing}
                        className="mt-0.5 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${publishOption === 'temp' ? 'scale-110' : ''} transition-transform`}>📝</span>
                          <span className={`font-semibold ${publishOption === 'temp' ? 'text-orange-700' : 'text-gray-700'}`}>
                            임시저장
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          나중에 완성해서 발행할 수 있어요
                        </p>
                      </div>
                    </div>
                    {publishOption === 'temp' && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        선택됨
                      </div>
                    )}
                  </label>
                  
                  {/* 즉시발행 카드 */}
                  <label className={`group relative block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    publishOption === 'immediate' 
                      ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/30'
                  } ${publishStatus.isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="publishOption"
                        value="immediate"
                        checked={publishOption === 'immediate'}
                        onChange={(e) => setPublishOption(e.target.value as PublishOption)}
                        disabled={publishStatus.isPublishing}
                        className="mt-0.5 text-green-500 focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${publishOption === 'immediate' ? 'scale-110' : ''} transition-transform`}>📤</span>
                          <span className={`font-semibold ${publishOption === 'immediate' ? 'text-green-700' : 'text-gray-700'}`}>
                            즉시발행
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          바로 블로그에 발행됩니다
                        </p>
                      </div>
                    </div>
                    {publishOption === 'immediate' && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        선택됨
                      </div>
                    )}
                  </label>
                  
                  {/* 예약발행 카드 */}
                  <label className={`group relative block p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    publishOption === 'scheduled' 
                      ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm' 
                      : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/30'
                  } ${publishStatus.isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="publishOption"
                        value="scheduled"
                        checked={publishOption === 'scheduled'}
                        onChange={(e) => setPublishOption(e.target.value as PublishOption)}
                        disabled={publishStatus.isPublishing}
                        className="mt-0.5 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${publishOption === 'scheduled' ? 'scale-110' : ''} transition-transform`}>⏰</span>
                          <span className={`font-semibold ${publishOption === 'scheduled' ? 'text-purple-700' : 'text-gray-700'}`}>
                            예약발행
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          원하는 시간에 자동으로 발행됩니다
                        </p>
                        
                        {/* 예약 시간 설정 UI */}
                        {publishOption === 'scheduled' && (
                          <div className="mt-3 p-3 bg-white/70 border border-purple-200 rounded-lg">
                            <div className="text-xs font-medium text-purple-700 mb-2 flex items-center">
                              <span className="mr-1">🕐</span>
                              발행 예약 시간 설정
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* 날짜 */}
                              <div className="flex-1 relative date-picker-container">
                                <input
                                  type="text"
                                  value={scheduledDate ? scheduledDate.replace(/-/g, '. ') : ''}
                                  onClick={() => setShowDatePicker(!showDatePicker)}
                                  readOnly
                                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 cursor-pointer hover:bg-gray-50"
                                  placeholder="날짜 선택"
                                />
                                
                                {/* 달력 팝업 */}
                                {showDatePicker && (
                                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3 min-w-[280px] date-picker-container">
                                    {(() => {
                                      const calendarData = getCalendarDays(currentCalendarMonth);
                                      return (
                                        <>
                                          {/* 달력 헤더 */}
                                          <div className="flex items-center justify-between mb-3">
                                            <button 
                                              type="button"
                                              className={`p-1 ${currentCalendarMonth === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-purple-600 cursor-pointer'}`}
                                              disabled={currentCalendarMonth === 0}
                                              onClick={currentCalendarMonth > 0 ? goToPrevMonth : undefined}
                                            >
                                              ‹
                                            </button>
                                            <div className="text-sm font-medium text-gray-700">
                                              {calendarData.year}년 {calendarData.monthName}
                                            </div>
                                            <button 
                                              type="button"
                                              className={`p-1 ${currentCalendarMonth >= 11 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-purple-600 cursor-pointer'}`}
                                              disabled={currentCalendarMonth >= 11}
                                              onClick={currentCalendarMonth < 11 ? goToNextMonth : undefined}
                                            >
                                              ›
                                            </button>
                                          </div>
                                          
                                          {/* 요일 헤더 */}
                                          <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                                              <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
                                                {day}
                                              </div>
                                            ))}
                                          </div>
                                          
                                          {/* 날짜들 */}
                                          <div className="grid grid-cols-7 gap-1">
                                            {calendarData.days.map((dayInfo, index) => (
                                              <div key={index} className="aspect-square">
                                                {dayInfo ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDateSelect(dayInfo)}
                                                    disabled={dayInfo.isDisabled}
                                                    className={`w-full h-full text-xs rounded flex items-center justify-center transition-colors ${
                                                      dayInfo.isDisabled 
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : dayInfo.isToday
                                                          ? 'bg-purple-500 text-white font-medium'
                                                          : 'text-gray-700 hover:bg-purple-100 hover:text-purple-700'
                                                    }`}
                                                  >
                                                    {dayInfo.day}
                                                  </button>
                                                ) : (
                                                  <div></div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                          
                                          {/* 닫기 버튼 */}
                                          <div className="mt-3 flex justify-end">
                                            <button
                                              type="button"
                                              onClick={() => setShowDatePicker(false)}
                                              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                            >
                                              닫기
                                            </button>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                              
                              {/* 시간 */}
                              <div className="w-16">
                                <select
                                  value={scheduledHour}
                                  onChange={(e) => handleTimeChange('hour', e.target.value)}
                                  className="w-full px-1 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  disabled={publishStatus.isPublishing}
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                      {i.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <span className="text-xs text-gray-500">:</span>
                              
                              {/* 분 */}
                              <div className="w-16">
                                <select
                                  value={scheduledMinute}
                                  onChange={(e) => handleTimeChange('minute', e.target.value)}
                                  className="w-full px-1 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  disabled={publishStatus.isPublishing}
                                >
                                  {['00', '10', '20', '30', '40', '50'].map(minute => (
                                    <option key={minute} value={minute}>
                                      {minute}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            {/* 시간 에러 */}
                            {timeError && (
                              <div className="mt-2 text-xs text-red-600">
                                {timeError}
                              </div>
                            )}
                            
                            {/* 발행까지 남은 시간 */}
                            {timeUntilPublish && !timeError && (
                              <div className="mt-2 text-xs text-purple-600">
                                ⏰ <strong>{timeUntilPublish}</strong>에 발행됩니다
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {publishOption === 'scheduled' && (
                      <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        선택됨
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 발행 정보 섹션 */}
          <div className="text-sm bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <span className="text-blue-700 font-semibold text-base">📋 발행 정보</span>
            </div>
            <div className="space-y-2">
              {/* 제목 */}
              <div className="flex items-start">
                <span className="text-green-700 font-medium mr-2 flex-shrink-0">📝 제목:</span>
                <span className="text-gray-800 font-medium">{data.selectedTitle}</span>
              </div>
              
              {/* 키워드 */}
              <div className="flex items-center flex-wrap gap-1">
                <span className="text-orange-700 font-medium flex-shrink-0">🏷️ 메인 키워드:</span>
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                  {data.mainKeyword || '없음'}
                </span>
                <span className="text-purple-700 font-medium mx-1">•</span>
                <span className="text-purple-700 font-medium flex-shrink-0">서브 키워드:</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                  {data.subKeywords || '없음'}
                </span>
              </div>
              
              {/* 이미지수 & 글자수 */}
              <div className="flex items-center flex-wrap gap-1">
                <span className="text-blue-700 font-medium flex-shrink-0">🖼️ 이미지수:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  {(() => {
                    const imageRegex = /[\(\[\*_]이미지\d*[\)\]\*_]/g;
                    const totalImages = (editedContent.match(imageRegex) || []).length;
                    const generatedImages = Object.keys(imageUrls).length;
                    return `${generatedImages}/${totalImages}개`;
                  })()}
                </span>
                <span className="text-indigo-700 font-medium mx-1">•</span>
                <span className="text-indigo-700 font-medium flex-shrink-0">📊 글자수:</span>
                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium">
                  {(() => {
                    // HTML 태그 제거 후 공백 문자 모두 제거 (Step3과 동일한 로직)
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = editedContent;
                    const textContent = tempDiv.innerText || tempDiv.textContent || '';
                    return `${textContent.replace(/\s+/g, '').length}자 (공백제거)`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {publishStatus.error && (
            <div className={`text-sm border rounded p-2 ${
              publishStatus.isPublishing 
                ? 'text-blue-600 bg-blue-50 border-blue-200' 
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              {publishStatus.isPublishing ? '🚀' : '❌'} {publishStatus.error}
            </div>
          )}
          
          
          <div className="relative">
            <button
            onClick={() => handlePublishWithImageCheck(publishToNaverBlog)}
            disabled={
              publishStatus.isPublishing || 
              !naverCredentials.username || 
              !naverCredentials.password ||
              (publishOption === 'scheduled' && timeError.trim() !== '')
            }
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {publishStatus.isPublishing ? (
              publishStatus.error ? `🚀 ${publishStatus.error}` : '🚀 네이버 블로그 발행 중...'
            ) : `${publishOption === 'temp' ? '📝 임시저장' : publishOption === 'immediate' ? '📤 즉시 발행' : '⏰ 예약 발행'}하기`}
          </button>
          
          {/* 이미지 확인 다이얼로그 - 버튼 위에 떠있는 작은 창 */}
          {showImageConfirmDialog && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-orange-300 rounded-lg shadow-lg z-50 p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="text-orange-500 text-lg">⚠️</div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    이미지 생성이 완료되지 않았습니다
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {(() => {
                      const imageRegex = /[\(\[\*_]이미지\d*[\)\]\*_]/g;
                      const totalImages = (editedContent.match(imageRegex) || []).length;
                      const generatedImages = Object.keys(imageUrls).length;
                      const incompleteCount = totalImages - generatedImages;
                      return `일부 이미지가 아직 생성되지 않았습니다. (${generatedImages}/${totalImages}개 완료)`;
                    })()}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    이미지 없이 발행하시겠습니까?
                  </p>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowImageConfirmDialog(false);
                        setPendingPublishAction(null);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        setShowImageConfirmDialog(false);
                        if (pendingPublishAction) {
                          pendingPublishAction();
                          setPendingPublishAction(null);
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                    >
                      이미지 없이 발행
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
          
          {publishStatus.isPublishing && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
              💡 브라우저 창이 열립니다. 2차 인증이나 기기 등록이 필요한 경우 브라우저에서 직접 처리해주세요.
            </div>
          )}
        </div>
      ) : (
        // 발행 완료 상태
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-green-600 text-xl">
                {publishOption === 'temp' ? '📝' : publishOption === 'immediate' ? '✅' : '⏰'}
              </div>
              <h4 className="font-medium text-green-800">
                {publishOption === 'temp' ? '임시저장' : publishOption === 'immediate' ? '즉시발행' : '예약발행'} 완료: {naverCredentials.username}
              </h4>
            </div>
            <button
              onClick={() => setPublishStatus(prev => ({ ...prev, success: false }))}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              다시 발행하기
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-green-700">
              {publishOption === 'temp' 
                ? '네이버 블로그에 임시저장되었습니다!'
                : publishOption === 'immediate'
                ? '네이버 블로그에 즉시 발행되었습니다!'
                : `네이버 블로그 예약발행이 설정되었습니다! (${scheduledDate ? scheduledDate.replace(/-/g, '. ') : '오늘'} ${scheduledHour}:${scheduledMinute})`
              }
            </p>
            
            {/* 게시판 정보 표시 */}
            {selectedBoardCategory && selectedBoardCategory !== '알 수 없음' && (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                📂 발행된게시판: <span className="font-medium">{selectedBoardCategory}</span>
                {boardCategory && boardCategory !== selectedBoardCategory && (
                  <span className="text-xs text-orange-600 ml-2">
                    ("{boardCategory}"를 찾지 못해서 "{selectedBoardCategory}"에 발행됨)
                  </span>
                )}
                {boardCategory && boardCategory === selectedBoardCategory && (
                  <span className="text-xs text-gray-500 ml-2">
                    (검색해서 선택됨)
                  </span>
                )}
              </div>
            )}
            
            {/* 제목과 키워드 정보 */}
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              <div className="mb-1">
                📝 <span className="font-medium">제목:</span> {data.selectedTitle}
              </div>
              {data.mainKeyword && (
                <div className="flex flex-wrap items-center gap-1">
                  🏷️ <span className="font-medium">키워드:</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">
                    {data.mainKeyword}
                  </span>
                  {data.subKeywords && data.subKeywords.trim() && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                        {data.subKeywords}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      <div className="mt-3 text-xs text-gray-500">
        ⚠️ 로그인 정보는 발행 목적으로만 사용되며 저장되지 않습니다.
      </div>
    </div>
  );
};

// 시간 차이 계산 함수
function calculateTimeUntil(scheduledDateTime: Date): string {
  const now = new Date();
  const diffMs = scheduledDateTime.getTime() - now.getTime();
  
  if (diffMs <= 0) return '과거 시간입니다';
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    if (diffHours % 24 > 0) {
      return `${diffDays}일 ${diffHours % 24}시간 ${diffMinutes % 60}분 후`;
    } else {
      return `${diffDays}일 ${diffMinutes % 60}분 후`;
    }
  } else if (diffHours > 0) {
    return `${diffHours}시간 ${diffMinutes % 60}분 후`;
  } else {
    return `${diffMinutes}분 후`;
  }
}

// 네이버 발행 컴포넌트 메타정보
export const NaverPublishMeta = {
  platform: 'naver' as const,
  name: '네이버 블로그',
  icon: '🟢'
};

export default NaverPublishUI;
