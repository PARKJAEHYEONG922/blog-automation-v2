import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PublishComponentProps, PublishStatus, PublishResult, IPublishComponent } from './PublishInterface';

// 네이버 자격 증명 타입
interface NaverCredentials {
  username: string;
  password: string;
}

const NaverPublish: React.FC<PublishComponentProps> = ({ 
  data, 
  editedContent, 
  imageUrls, 
  onComplete,
  copyToClipboard 
}) => {
  
  // 네이버 로그인 상태
  const [naverCredentials, setNaverCredentials] = useState<NaverCredentials>({
    username: '',
    password: ''
  });
  
  // 게시판 카테고리 상태
  const [boardCategory, setBoardCategory] = useState<string>('');
  
  // 실제로 선택된 게시판명 (성공 시에만 설정됨)
  const [selectedBoardCategory, setSelectedBoardCategory] = useState<string>('');
  
  // 자격 증명 저장 상태
  const [saveCredentials, setSaveCredentials] = useState<boolean>(false);
  
  // 저장된 계정 목록 관리
  const [savedAccounts, setSavedAccounts] = useState<Array<{id: string, username: string, lastUsed: number}>>([]);
  const [showAccountSelector, setShowAccountSelector] = useState<boolean>(false);
  
  // 계정별 게시판 목록 관리
  const [accountBoards, setAccountBoards] = useState<{[accountId: string]: string[]}>({});
  const [showBoardSelector, setShowBoardSelector] = useState<boolean>(false);
  
  
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({
    isPublishing: false,
    isLoggedIn: false,
    error: '',
    success: false
  });

  // 발행 옵션 상태
  const [publishOption, setPublishOption] = useState<'temp' | 'immediate' | 'scheduled'>('immediate');
  
  // 예약 발행 시간 상태
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledHour, setScheduledHour] = useState<string>('');
  const [scheduledMinute, setScheduledMinute] = useState<string>('');
  const [timeError, setTimeError] = useState<string>('');
  const [timeUntilPublish, setTimeUntilPublish] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(0); // 현재 달부터의 상대적 개월 수
  
  // 이미지 확인 다이얼로그 상태
  const [showImageConfirmDialog, setShowImageConfirmDialog] = useState<boolean>(false);
  const [pendingPublishAction, setPendingPublishAction] = useState<(() => void) | null>(null);
  
  // 컴포넌트 마운트 시 기본 예약 시간 설정 (1시간 후)
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
  }, []);
  
  // 저장된 계정들 로드
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

  // 모든 계정의 게시판 데이터 로드
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

  // 특정 계정의 게시판 목록 로드
  const loadAccountBoards = (accountId: string) => {
    try {
      const saved = localStorage.getItem('accountBoards');
      if (saved) {
        const allBoards = JSON.parse(saved);
        if (allBoards[accountId] && allBoards[accountId].length > 0) {
          // 가장 최근 사용한 게시판을 기본값으로 설정 (선택사항)
          // setBoardCategory(allBoards[accountId][0]);
        }
      }
    } catch (error) {
      console.error('계정 게시판 목록 로드 실패:', error);
    }
  };

  // 계정 저장 함수
  const saveAccount = (username: string, password: string) => {
    try {
      const accountId = btoa(username); // username을 base64로 인코딩하여 ID로 사용
      const accounts = [...savedAccounts];
      const existingIndex = accounts.findIndex(acc => acc.id === accountId);
      
      const accountInfo = {
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

  // 계정 선택 함수
  const selectAccount = (account: {id: string, username: string, lastUsed: number}) => {
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

  // 계정 삭제 함수
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

  // 계정별 게시판 저장 함수
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

  // 게시판 선택 함수
  const selectBoard = (boardName: string) => {
    console.log('📋 게시판 선택됨:', boardName);
    setBoardCategory(boardName);
    setShowBoardSelector(false);
    console.log('📋 게시판 설정 완료, 드롭다운 닫기');
  };


  // 게시판 삭제 함수
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

  // 게시판 순서 변경 함수 (위로)
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

  // 게시판 순서 변경 함수 (아래로)
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

  // 저장된 자격 증명 로드
  useEffect(() => {
    loadSavedAccounts();
  }, []);

  // 게시판 선택 완료 시 저장
  useEffect(() => {
    if (selectedBoardCategory && selectedBoardCategory !== '알 수 없음' && naverCredentials.username && publishStatus.success) {
      const accountId = btoa(naverCredentials.username);
      console.log('📋 게시판 자동 저장:', selectedBoardCategory, 'for 계정:', naverCredentials.username);
      saveBoardForAccount(accountId, selectedBoardCategory);
    }
  }, [selectedBoardCategory, naverCredentials.username, publishStatus.success]);


  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (showAccountSelector && !target.closest('.account-selector-container')) {
        console.log('👤 외부 클릭으로 계정 선택기 닫기');
        setShowAccountSelector(false);
      }
      
      if (showBoardSelector && !target.closest('.board-selector-container')) {
        console.log('📋 외부 클릭으로 게시판 선택기 닫기');
        setShowBoardSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountSelector, showBoardSelector]);
  
  // 이미지 상태 확인 함수 - 발행 정보와 동일한 로직 사용
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
  
  // 발행 전 이미지 확인 핸들러
  const handlePublishWithImageCheck = (publishAction: () => void) => {
    const { hasIncompleteImages, incompleteCount, totalCount } = checkImageStatus();
    
    if (hasIncompleteImages) {
      setPendingPublishAction(() => publishAction);
      setShowImageConfirmDialog(true);
    } else {
      publishAction();
    }
  };
  
  // 카테고리 자동 선택 함수
  const selectCategoryIfSpecified = async (): Promise<{ success: boolean; selectedCategory?: string; userInput?: string; notFound?: boolean }> => {
    try {
      console.log('📂 카테고리 확인 및 선택 시작...');
      
      // 사용자가 카테고리를 입력하지 않은 경우 - 현재 선택된 카테고리만 확인
      if (!boardCategory.trim()) {
        console.log('📂 사용자 입력 카테고리 없음, 현재 선택된 카테고리만 확인...');
        
        const currentCategoryResult = await window.electronAPI.playwrightEvaluateInFrames(`
          (function() {
            try {
              // 현재 선택된 카테고리 텍스트 찾기 (버튼에 표시된 텍스트)
              const categoryButton = document.querySelector('button.selectbox_button__jb1Dt');
              if (categoryButton) {
                const buttonText = categoryButton.textContent?.trim() || '';
                console.log('카테고리 버튼 텍스트:', buttonText);
                return { success: true, selectedCategory: buttonText };
              }
              
              return { success: false, error: '카테고리 버튼을 찾을 수 없음' };
            } catch (error) {
              return { success: false, error: error.message };
            }
          })()
        `, 'PostWriteForm.naver');
        
        if (currentCategoryResult?.result?.success) {
          console.log(`📂 현재 기본 카테고리: "${currentCategoryResult.result.selectedCategory}"`);
          return { 
            success: true, 
            selectedCategory: currentCategoryResult.result.selectedCategory || '기본 카테고리' 
          };
        } else {
          console.log('⚠️ 현재 카테고리 확인 실패');
          return { success: true, selectedCategory: '기본 카테고리' };
        }
      }
      
      // 사용자가 카테고리를 입력한 경우만 드롭다운 열기
      console.log(`📂 사용자 입력 카테고리: "${boardCategory}" - 드롭다운 열어서 찾기...`);
      
      // 1. 카테고리 버튼 클릭하여 드롭다운 열기
      console.log('🔘 카테고리 버튼 클릭 중...');
      const categoryButtonResult = await window.electronAPI.playwrightClickInFrames(
        'button.selectbox_button__jb1Dt', 
        'PostWriteForm.naver'
      );
      
      if (!categoryButtonResult.success) {
        console.log('⚠️ 카테고리 버튼 클릭 실패');
        return { success: true, selectedCategory: '알 수 없음' };
      }
      
      // 2. 드롭다운 로딩 대기
      console.log('⏳ 카테고리 목록 로딩 대기...');
      await window.electronAPI.playwrightWaitTimeout(3000);
      
      // 3. 사용자 입력 카테고리 찾기/선택 (드롭다운이 열린 상태)
      const categoryResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const userInputCategory = "${boardCategory.trim()}";
            const normalizedUserInput = userInputCategory.replace(/\\s+/g, '');
            
            // 현재 선택된 카테고리 확인 (드롭다운에서 체크된 라디오 버튼)
            let currentSelectedCategory = '';
            const selectedLabel = document.querySelector('label input[type="radio"]:checked')?.parentElement;
            if (selectedLabel) {
              const textSpan = selectedLabel.querySelector('span[data-testid*="categoryItemText"]');
              if (textSpan) {
                currentSelectedCategory = textSpan.textContent?.trim() || '';
                console.log('드롭다운에서 현재 선택된 카테고리:', currentSelectedCategory);
              }
            }
            
            console.log('사용자 입력 카테고리 검색:', userInputCategory, '(정규화:', normalizedUserInput + ')');
            
            // 모든 카테고리 라벨에서 정확히 일치하는 것 찾기
            const allLabels = document.querySelectorAll('label[for*="_"]');
            console.log('전체 카테고리 개수:', allLabels.length);
            
            for (let i = 0; i < allLabels.length; i++) {
              const label = allLabels[i];
              const textSpan = label.querySelector('span[data-testid*="categoryItemText"]');
              if (textSpan) {
                // 하위 카테고리의 경우 아이콘 텍스트 제거
                let labelText = textSpan.textContent?.trim() || '';
                // "하위 카테고리" 텍스트 제거
                labelText = labelText.replace('하위 카테고리', '').trim();
                const normalizedLabelText = labelText.replace(/\\s+/g, '');
                
                console.log('카테고리 비교:', {
                  labelText: labelText,
                  normalizedLabel: normalizedLabelText,
                  userInput: normalizedUserInput,
                  matches: normalizedLabelText === normalizedUserInput
                });
                
                // 정확히 일치하는 경우 클릭
                if (normalizedLabelText === normalizedUserInput) {
                  console.log('일치하는 카테고리 발견, 클릭:', labelText);
                  label.click();
                  return { 
                    success: true, 
                    selectedCategory: labelText,
                    wasChanged: true,
                    userInput: userInputCategory
                  };
                }
              }
            }
            
            // 일치하는 카테고리를 찾지 못한 경우
            console.log('일치하는 카테고리를 찾지 못함. 드롭다운 닫고 원래 카테고리 유지:', currentSelectedCategory);
            return { 
              success: false, // 찾지 못했으므로 드롭다운을 닫아야 함
              selectedCategory: currentSelectedCategory || '기본 카테고리',
              wasChanged: false,
              userInput: userInputCategory,
              notFound: true
            };
            
          } catch (error) {
            console.error('카테고리 처리 중 오류:', error);
            return { success: false, error: error.message };
          }
        })()
      `, 'PostWriteForm.naver');
      
      if (categoryResult?.result?.success) {
        const result = categoryResult.result;
        
        if (result.wasChanged) {
          console.log(`✅ 카테고리 변경 완료: "${result.selectedCategory}" (입력: "${result.userInput}")`);
        } else if (result.notFound) {
          console.log(`⚠️ "${result.userInput}" 카테고리를 찾을 수 없어서 "${result.selectedCategory}"에 발행됩니다.`);
        } else {
          console.log(`📂 기본 카테고리 "${result.selectedCategory}"에 발행됩니다.`);
        }
        
        await window.electronAPI.playwrightWaitTimeout(500);
        return { 
          success: true, 
          selectedCategory: result.selectedCategory,
          userInput: result.userInput,
          notFound: result.notFound
        };
      } else if (categoryResult?.result?.notFound) {
        // 카테고리를 찾지 못한 경우 - 드롭다운 버튼 다시 클릭해서 닫기
        const result = categoryResult.result;
        console.log(`⚠️ "${result.userInput}" 카테고리를 찾을 수 없음. 드롭다운 닫는 중...`);
        
        const closeDropdownResult = await window.electronAPI.playwrightClickInFrames(
          'button.selectbox_button__jb1Dt', 
          'PostWriteForm.naver'
        );
        
        if (closeDropdownResult.success) {
          console.log('✅ 드롭다운 닫기 완료');
          
          // 드롭다운 닫은 후 실제 선택된 카테고리 다시 확인 (카테고리 입력 안했을 때와 동일 로직)
          await window.electronAPI.playwrightWaitTimeout(500);
          
          const finalCategoryResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 현재 선택된 카테고리 텍스트 찾기 (버튼에 표시된 텍스트)
                const categoryButton = document.querySelector('button.selectbox_button__jb1Dt');
                if (categoryButton) {
                  const buttonText = categoryButton.textContent?.trim() || '';
                  console.log('드롭다운 닫은 후 카테고리 버튼 텍스트:', buttonText);
                  return { success: true, selectedCategory: buttonText };
                }
                
                return { success: false, error: '카테고리 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `, 'PostWriteForm.naver');
          
          const finalCategoryName = finalCategoryResult?.result?.success 
            ? finalCategoryResult.result.selectedCategory 
            : '기본 카테고리';
            
          console.log(`📂 최종 선택된 카테고리: "${finalCategoryName}"`);
          
          return { 
            success: true, 
            selectedCategory: finalCategoryName,
            userInput: result.userInput,
            notFound: result.notFound
          };
        } else {
          console.log('⚠️ 드롭다운 닫기 실패');
          return { 
            success: true, 
            selectedCategory: result.selectedCategory,
            userInput: result.userInput,
            notFound: result.notFound
          };
        }
      } else {
        console.error('카테고리 확인 실패:', categoryResult?.result?.error);
        
        // 오류 발생 시에도 드롭다운 닫기 시도
        console.log('오류 발생으로 드롭다운 닫는 중...');
        const closeResult = await window.electronAPI.playwrightClickInFrames(
          'button.selectbox_button__jb1Dt', 
          'PostWriteForm.naver'
        );
        
        if (closeResult.success) {
          // 드롭다운 닫은 후 현재 카테고리 확인
          await window.electronAPI.playwrightWaitTimeout(500);
          
          const currentCategoryResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 현재 선택된 카테고리 텍스트 찾기 (버튼에 표시된 텍스트)
                const categoryButton = document.querySelector('button.selectbox_button__jb1Dt');
                if (categoryButton) {
                  const buttonText = categoryButton.textContent?.trim() || '';
                  console.log('오류 후 드롭다운 닫은 후 카테고리 버튼 텍스트:', buttonText);
                  return { success: true, selectedCategory: buttonText };
                }
                
                return { success: false, error: '카테고리 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `, 'PostWriteForm.naver');
          
          const finalCategoryName = currentCategoryResult?.result?.success 
            ? currentCategoryResult.result.selectedCategory 
            : '기본 카테고리';
            
          return { success: true, selectedCategory: finalCategoryName };
        }
        
        return { success: true, selectedCategory: '알 수 없음' };
      }
      
    } catch (error) {
      console.error('카테고리 선택 중 오류:', error);
      return { success: true, selectedCategory: '알 수 없음' };
    }
  };
  
  // 자격 증명 저장/삭제 함수
  const handleCredentialSave = (save: boolean) => {
    setSaveCredentials(save);
    
    if (save && naverCredentials.username && naverCredentials.password) {
      // 자격 증명 저장
      try {
        localStorage.setItem('naverCredentials', JSON.stringify(naverCredentials));
      } catch (error) {
        console.error('자격 증명 저장 실패:', error);
      }
    } else {
      // 자격 증명 삭제
      try {
        localStorage.removeItem('naverCredentials');
      } catch (error) {
        console.error('자격 증명 삭제 실패:', error);
      }
    }
  };
  
  // 예약 시간 유효성 검사 및 남은 시간 계산
  const validateAndCalculateTime = useCallback((hour: string, minute: string) => {
    // 입력값 유효성 검사
    if (!hour || !minute || hour === '' || minute === '') {
      setTimeError('');
      setTimeUntilPublish('');
      return;
    }
    
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    
    // 숫자 변환 실패 체크
    if (isNaN(hourNum) || isNaN(minuteNum)) {
      setTimeError('');
      setTimeUntilPublish('');
      return;
    }
    
    const now = new Date();
    const selectedTime = new Date();
    
    // 선택된 날짜가 있으면 해당 날짜로 설정, 없으면 오늘 날짜
    if (scheduledDate) {
      const [year, month, day] = scheduledDate.split('-').map(Number);
      selectedTime.setFullYear(year, month - 1, day);
    }
    
    selectedTime.setHours(hourNum);
    selectedTime.setMinutes(minuteNum);
    selectedTime.setSeconds(0);
    selectedTime.setMilliseconds(0);
    
    // 현재 시간보다 이전이면 에러 (같은 날짜인 경우에만 체크)
    const isToday = scheduledDate === '' || scheduledDate === now.toISOString().split('T')[0];
    
    if (isToday && selectedTime <= now) {
      setTimeError('⚠️ 현재 시간보다 이후로 설정해주세요');
      setTimeUntilPublish('');
      return;
    }
    
    // 차이 계산
    const diffMs = selectedTime.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeError('');
    
    if (diffDays > 0) {
      if (diffHours > 0) {
        setTimeUntilPublish(`${diffDays}일 ${diffHours}시간 ${diffMinutes}분 후 발행됩니다`);
      } else {
        setTimeUntilPublish(`${diffDays}일 ${diffMinutes}분 후 발행됩니다`);
      }
    } else if (diffHours > 0) {
      setTimeUntilPublish(`${diffHours}시간 ${diffMinutes}분 후 발행됩니다`);
    } else {
      setTimeUntilPublish(`${diffMinutes}분 후 발행됩니다`);
    }
  }, [scheduledDate]);
  
  // 시간 변경 핸들러
  const handleTimeChange = useCallback((type: 'hour' | 'minute', value: string) => {
    if (type === 'hour') {
      setScheduledHour(value);
      validateAndCalculateTime(value, scheduledMinute);
    } else {
      setScheduledMinute(value);
      validateAndCalculateTime(scheduledHour, value);
    }
  }, [scheduledHour, scheduledMinute, validateAndCalculateTime]);
  
  // 초기 시간 설정 후 계산 (날짜 변경 시에도 재계산)
  useEffect(() => {
    if (scheduledHour && scheduledMinute) {
      validateAndCalculateTime(scheduledHour, scheduledMinute);
    }
  }, [scheduledDate, scheduledHour, scheduledMinute, validateAndCalculateTime]);

  // 달력 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // 달력 관련 함수들
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

  const goToPrevMonth = () => {
    setCurrentCalendarMonth(prev => Math.max(0, prev - 1));
  };

  const goToNextMonth = () => {
    setCurrentCalendarMonth(prev => Math.min(11, prev + 1));
  };

  const handleDateSelect = (dayInfo: any) => {
    if (!dayInfo || dayInfo.isDisabled) return;
    
    setScheduledDate(dayInfo.fullDate);
    setShowDatePicker(false);
    
    // 날짜 변경 시 시간 재검증
    if (scheduledHour && scheduledMinute) {
      validateAndCalculateTime(scheduledHour, scheduledMinute);
    }
  };

  // 네이버 로그아웃 및 브라우저 정리 함수
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

  // 임시로 Playwright 대신 더미 구현
  const naverHelperRef = useRef<any>(null);

  // 컴포넌트 언마운트 시 브라우저 정리
  useEffect(() => {
    return () => {
      window.electronAPI.playwrightCleanup().catch(console.error);
    };
  }, []);

  // 2단계 인증 페이지 감지 함수
  const isTwoFactorAuthPage = async (currentUrl: string): Promise<boolean> => {
    try {
      // 이미 로그인 성공한 페이지라면 2단계 인증 아님
      if (currentUrl.includes('www.naver.com') || 
          currentUrl.includes('section.blog.naver.com') ||
          (currentUrl.includes('naver.com') && !currentUrl.includes('nid.naver.com'))) {
        return false;
      }

      // URL에 otp 또는 mode=otp가 포함된 경우
      if (currentUrl.includes('mode=otp') || currentUrl.includes('otp')) {
        return true;
      }

      // 2단계 인증 관련 HTML 요소들 확인
      const twoFactorElements = [
        'input[name="mode"][value="otp"]', // 숨겨진 mode 필드
        '#push_title', // "2단계 인증 알림 발송 완료"
        '#otp_title', // "OTP 인증번호를 입력해 주세요"
        '#useotpBtn', // "OTP 인증번호를 입력하여 로그인 하기" 버튼
        '#resendBtn', // "알림 다시 보내기" 버튼
        '#push_case', // 푸시 인증 케이스 div
        '#direct_case', // OTP 직접 입력 케이스 div
        'input#otp[name="otp"]' // OTP 입력 필드
      ];

      // 여러 요소 중 하나라도 존재하면 2단계 인증 페이지
      for (const selector of twoFactorElements) {
        try {
          const elementResult = await window.electronAPI.playwrightWaitSelector(selector, 1000); // 1초만 대기
          if (elementResult.success) {
            console.log(`🔍 2단계 인증 요소 발견: ${selector}`);
            return true;
          }
        } catch (error) {
          // 요소를 찾지 못한 경우 무시하고 계속
        }
      }

      // 페이지 텍스트로도 확인
      const bodyTextResult = await window.electronAPI.playwrightEvaluate('document.body.textContent');
      if (bodyTextResult.success && bodyTextResult.result) {
        const pageText = bodyTextResult.result;
        if (
          pageText.includes('2단계 인증') ||
          pageText.includes('OTP 인증번호') ||
          pageText.includes('알림 다시 보내기') ||
          pageText.includes('설정한 기기에서 인증 알림을 확인하세요')
        ) {
          console.log('🔍 2단계 인증 관련 텍스트 발견');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('2단계 인증 페이지 확인 중 오류:', error);
      return false;
    }
  };

  // 네이버 로그인 헬퍼 함수들
  const performNaverLogin = async (credentials: NaverCredentials): Promise<'success' | 'two_factor' | 'device_registration' | 'failed'> => {
    // 네이버 로그인 페이지로 이동
    const navigateResult = await window.electronAPI.playwrightNavigate('https://nid.naver.com/nidlogin.login');
    if (!navigateResult.success) {
      throw new Error('로그인 페이지 이동 실패');
    }

    await window.electronAPI.playwrightWaitTimeout(2000);

    // 아이디 입력
    console.log('아이디 입력 중...');
    const idFillResult = await window.electronAPI.playwrightFill('#id', credentials.username);
    if (!idFillResult.success) {
      throw new Error('아이디 입력 실패');
    }

    await window.electronAPI.playwrightWaitTimeout(500);

    // 비밀번호 입력
    console.log('비밀번호 입력 중...');
    const pwFillResult = await window.electronAPI.playwrightFill('#pw', credentials.password);
    if (!pwFillResult.success) {
      throw new Error('비밀번호 입력 실패');
    }

    await window.electronAPI.playwrightWaitTimeout(500);

    // 로그인 버튼 클릭
    console.log('로그인 버튼 클릭 중...');
    const loginBtnResult = await window.electronAPI.playwrightClick('#log\\.login');
    if (!loginBtnResult.success) {
      // 다른 셀렉터들 시도
      const altSelectors = ['button[id="log.login"]', '.btn_login_wrap button', 'button.btn_login'];
      let clicked = false;
      
      for (const selector of altSelectors) {
        const result = await window.electronAPI.playwrightClick(selector);
        if (result.success) {
          clicked = true;
          break;
        }
      }
      
      if (!clicked) {
        throw new Error('로그인 버튼을 찾을 수 없습니다');
      }
    }

    // 로그인 결과 대기 (최대 90초)
    const startTime = Date.now();
    const timeout = 90000;
    let deviceRegistrationAttempted = false;
    let twoFactorDetected = false;

    while ((Date.now() - startTime) < timeout) {
      await window.electronAPI.playwrightWaitTimeout(2000);
      
      const urlResult = await window.electronAPI.playwrightGetUrl();
      if (!urlResult.success || !urlResult.url) continue;
      
      const currentUrl = urlResult.url;
      console.log(`🔍 현재 URL: ${currentUrl}`);

      // 기기 등록 페이지 확인
      if (currentUrl.includes('deviceConfirm') && !deviceRegistrationAttempted) {
        console.log('🆔 새로운 기기 등록 페이지 감지!');
        deviceRegistrationAttempted = true;
        
        // 등록안함 버튼 클릭 시도
        const skipSelectors = ['#new\\.dontsave', '[id="new.dontsave"]', 'a[id="new.dontsave"]'];
        let skipped = false;
        
        for (const selector of skipSelectors) {
          const result = await window.electronAPI.playwrightClick(selector);
          if (result.success) {
            console.log('✅ 기기 등록 건너뛰기 완료');
            skipped = true;
            break;
          }
        }
        
        if (!skipped) {
          return 'device_registration';
        }
        continue;
      }
      
      // 로그인 성공 체크 (네이버 홈페이지 또는 관련 페이지)
      if (currentUrl.includes('www.naver.com') || 
          currentUrl.includes('section.blog.naver.com') ||
          (currentUrl.includes('naver.com') && !currentUrl.includes('nid.naver.com'))) {
        console.log(`✅ 네이버 로그인 성공! 최종 URL: ${currentUrl}`);
        return 'success';
      }
      
      // 2단계 인증 감지 (한 번만 감지하고 조용히 대기)
      if (!twoFactorDetected && await isTwoFactorAuthPage(currentUrl)) {
        console.log('🔐 2단계 인증 페이지 감지!');
        console.log('📱 스마트폰에서 2단계 인증을 완료해 주세요. 90초까지 대기합니다...');
        console.log('💡 네이버앱에서 인증 알림을 확인하거나 OTP를 입력해주세요.');
        
        // UI 상태 업데이트
        setPublishStatus(prev => ({
          ...prev,
          error: '📱 스마트폰에서 2단계 인증을 완료해주세요'
        }));
        
        twoFactorDetected = true;
        continue; // 2단계 인증 감지 후 바로 다음 루프로
      }
      
      // 2단계 인증 감지된 상태에서는 로그인 페이지 실패 체크 건너뛰기
      if (twoFactorDetected && currentUrl.includes('nid.naver.com/nidlogin.login')) {
        continue; // 조용히 대기
      }
      
      // 로그인 페이지에 계속 있으면 실패
      if (currentUrl.includes('nid.naver.com/nidlogin.login') && (Date.now() - startTime) > 10000) {
        return 'failed';
      }
    }

    return 'failed';
  };

  const navigateToNaverBlogWrite = async (username: string): Promise<boolean> => {
    const writeUrl = `https://blog.naver.com/${username}?Redirect=Write&`;
    const navigateResult = await window.electronAPI.playwrightNavigate(writeUrl);
    
    if (!navigateResult.success) {
      return false;
    }

    // 페이지 로드 대기 (iframe 로딩 충분히 대기)
    await window.electronAPI.playwrightWaitTimeout(5000);
    
    // iframe이 완전히 로드될 때까지 대기
    const iframeLoadResult = await window.electronAPI.playwrightEvaluateInFrames(`
      (function() {
        return { 
          success: true, 
          loaded: document.readyState === 'complete',
          hasEditor: !!document.querySelector('.se-module-text')
        };
      })()
    `);
    
    console.log('iframe 로드 상태:', iframeLoadResult?.result);
    
    if (!iframeLoadResult?.result?.hasEditor) {
      console.log('에디터 로딩 대기 중...');
      await window.electronAPI.playwrightWaitTimeout(3000);
    }

    // 작성 중인 글 팝업 처리 (더 정확한 확인)
    try {
      console.log('작성 중인 글 팝업 확인 중...');
      
      // 네이버 블로그 정확한 팝업 감지 (.se-popup-dim 확인) - mainFrame 타겟팅
      const popupCheckResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          console.log('iframe 내부에서 네이버 블로그 팝업 찾기...');
          
          // 네이버 블로그 팝업 딤 요소 확인 (가장 정확한 방법)
          const popupDim = document.querySelector('.se-popup-dim');
          const popupDimWhite = document.querySelector('.se-popup-dim-white');
          const popupDimElement = popupDim || popupDimWhite;
          
          console.log('se-popup-dim 요소:', popupDimElement);
          console.log('팝업 딤 표시 상태:', popupDimElement ? 'block' : 'none');
          
          if (popupDimElement) {
            console.log('팝업 딤 스타일:', {
              display: popupDimElement.style.display,
              visibility: popupDimElement.style.visibility,
              offsetParent: !!popupDimElement.offsetParent,
              className: popupDimElement.className
            });
          }
          
          // 팝업이 실제로 표시되어 있는지 확인
          const isPopupVisible = popupDimElement && (
            popupDimElement.offsetParent !== null || 
            popupDimElement.style.display !== 'none'
          );
          
          // 취소 버튼들 찾기
          const cancelButtons = [
            document.querySelector('.se-popup-button-cancel'),
            document.querySelector('button.se-popup-button-cancel'),
            document.querySelector('.se-popup .se-button-cancel'),
            document.querySelector('[data-name="cancel"]')
          ].filter(btn => btn && btn.offsetParent !== null);
          
          console.log('팝업 감지 결과:', {
            hasPopupDim: !!popupDimElement,
            isVisible: isPopupVisible,
            cancelButtonsFound: cancelButtons.length
          });
          
          return { 
            success: true, 
            hasPopup: isPopupVisible,
            popupDimFound: !!popupDimElement,
            cancelButtonsCount: cancelButtons.length,
            popupDimClass: popupDimElement?.className || null
          };
        })()
      `, 'PostWriteForm.naver');
      
      console.log('팝업 확인 결과:', popupCheckResult?.result);
      
      if (popupCheckResult?.result?.hasPopup) {
        console.log('📄 작성 중인 글 팝업 발견! (.se-popup-dim 확인됨)');
        console.log('팝업 딤 클래스:', popupCheckResult.result.popupDimClass);
        
        const cancelSelectors = [
          '.se-popup-button-cancel', 
          'button.se-popup-button-cancel',
          'button[data-action="cancel"]',
          '.popup-cancel',
          '.modal-cancel'
        ];
        
        let cancelSuccess = false;
        for (const selector of cancelSelectors) {
          console.log(`취소 버튼 클릭 시도: ${selector}`);
          const result = await window.electronAPI.playwrightClickInFrames(selector, 'PostWriteForm.naver');
          if (result.success) {
            console.log(`✅ 작성 중인 글 팝업 취소 완료: ${selector}`);
            await window.electronAPI.playwrightWaitTimeout(1000);
            cancelSuccess = true;
            break;
          }
        }
        
        if (!cancelSuccess) {
          console.warn('⚠️ 팝업은 발견했지만 취소 버튼을 클릭하지 못했습니다.');
        }
        
      } else {
        console.log('ℹ️ 작성 중인 글 팝업 없음');
      }
      
    } catch (error) {
      console.log('팝업 처리 중 오류 (무시):', error);
    }

    // 2. 도움말 패널 닫기 버튼 처리 (정확한 감지)
    try {
      console.log('도움말 패널 닫기 버튼 확인 중...');
      
      // 네이버 블로그 도움말 패널 정확한 감지
      const helpCheckResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          console.log('iframe 내부에서 도움말 패널 찾기...');
          
          // 다양한 도움말 패널 셀렉터 확인
          const helpSelectors = [
            '.se-help-panel',
            '.se-help-panel-close-button',
            'button.se-help-panel-close-button',
            '.se-guide-panel',
            '.se-guide-close-button',
            '[class*="help-panel"]',
            '[class*="guide-panel"]',
            '[data-name*="help"]',
            '[data-name*="guide"]'
          ];
          
          const foundHelpElements = [];
          
          for (const selector of helpSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el && (el.offsetParent !== null || el.style.display !== 'none')) {
                foundHelpElements.push({
                  selector: selector,
                  tagName: el.tagName,
                  className: el.className,
                  visible: el.offsetParent !== null,
                  textContent: el.textContent?.substring(0, 30)
                });
              }
            });
          }
          
          console.log('찾은 도움말 요소들:', foundHelpElements);
          
          // 닫기 버튼 확인
          const closeButtons = [
            document.querySelector('.se-help-panel-close-button'),
            document.querySelector('button.se-help-panel-close-button'),
            document.querySelector('.se-guide-close-button'),
            document.querySelector('.se-help-panel .close'),
            document.querySelector('[data-name="help-close"]')
          ].filter(btn => btn && btn.offsetParent !== null);
          
          const hasHelp = foundHelpElements.length > 0;
          
          console.log('도움말 패널 감지 결과:', {
            hasHelp: hasHelp,
            elementsCount: foundHelpElements.length,
            closeButtonsCount: closeButtons.length
          });
          
          return { 
            success: true, 
            hasHelp: hasHelp,
            helpElements: foundHelpElements,
            closeButtonsCount: closeButtons.length
          };
        })()
      `, 'PostWriteForm.naver');
      
      console.log('도움말 패널 확인 결과:', helpCheckResult?.result);
      
      if (helpCheckResult?.result?.hasHelp) {
        console.log('❓ 도움말 패널 발견! 닫기 시도...');
        console.log('발견된 도움말 요소들:', helpCheckResult.result.helpElements);
        
        const helpCloseSelectors = [
          '.se-help-panel-close-button',
          'button.se-help-panel-close-button',
          '.se-help-panel-close-button span.se-blind',
          '.se-guide-close-button',
          '.se-help-panel .close',
          '[data-name="help-close"]',
          '.close-button'
        ];
        
        let closeSuccess = false;
        for (const selector of helpCloseSelectors) {
          console.log(`도움말 닫기 버튼 클릭 시도: ${selector}`);
          const result = await window.electronAPI.playwrightClickInFrames(selector, 'PostWriteForm.naver');
          if (result.success) {
            console.log(`✅ 도움말 패널 닫기 완료: ${selector}`);
            await window.electronAPI.playwrightWaitTimeout(1000);
            closeSuccess = true;
            break;
          }
        }
        
        if (!closeSuccess) {
          console.warn('⚠️ 도움말 패널은 발견했지만 닫기 버튼을 클릭하지 못했습니다.');
        }
        
      } else {
        console.log('ℹ️ 도움말 패널 없음');
      }
      
    } catch (error) {
      console.log('도움말 패널 처리 중 오류 (무시):', error);
    }

    // 3. 제목 입력 처리
    try {
      console.log('제목 입력 시작...');
      
      const titleSelectors = [
        '.se-title-text .se-placeholder.__se_placeholder:not(.se-placeholder-focused)',  // focused 아닌 제목 placeholder
        '.se-title-text .se-placeholder.__se_placeholder',  // 일반 제목 placeholder
        '.se-text-paragraph span.__se-node',  // 실제 제목 input 요소
        '.se-title-text .se-text-paragraph'
      ];
      
      for (const selector of titleSelectors) {
        console.log(`제목 섹션 클릭 시도: ${selector}`);
        
        // iframe에서 제목 섹션 클릭 - mainFrame 타겟팅
        let result = await window.electronAPI.playwrightClickInFrames(selector, 'PostWriteForm.naver');
        
        if (result.success) {
          console.log('✅ 제목 섹션 클릭 성공');
          await window.electronAPI.playwrightWaitTimeout(2000);  // 2초 대기
          
          // 제목 타이핑 (Step3에서 선택된 제목 사용)
          console.log(`제목 타이핑 중: "${data.selectedTitle}"`);
          console.log(`📝 선택된 제목: ${data.selectedTitle}`);
          
          // 제목을 한 글자씩 타이핑 (자연스러운 방식)
          console.log(`📝 제목 타이핑 시작: "${data.selectedTitle}"`);
          
          // 제목 요소 찾기 및 포커스
          const titleFocusResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                console.log('iframe 내부에서 제목 요소 찾기...');
                
                // 더 정확한 제목 셀렉터들
                const titleSelectors = [
                  '.se-title-text span.__se-node',
                  '.se-module-text.se-title-text span.__se-node',
                  '.se-section-documentTitle span.__se-node',
                  '.se-text-paragraph span.__se-node'
                ];
                
                let titleElement = null;
                for (const selector of titleSelectors) {
                  const elements = document.querySelectorAll(selector);
                  for (const el of elements) {
                    if (el && el.offsetParent !== null && !el.classList.contains('se-placeholder')) {
                      titleElement = el;
                      console.log('제목 요소 발견:', selector, el);
                      break;
                    }
                  }
                  if (titleElement) break;
                }
                
                if (!titleElement) {
                  return { success: false, message: '제목 입력 요소를 찾을 수 없음' };
                }
                
                // 기존 내용 완전히 제거
                titleElement.innerHTML = '';
                titleElement.textContent = '';
                
                // 포커스 및 클릭
                titleElement.focus();
                titleElement.click();
                
                return { success: true, message: '제목 요소 포커스 완료' };
              } catch (error) {
                return { success: false, message: error.message };
              }
            })()
          `, 'PostWriteForm.naver');
          
          if (titleFocusResult?.result?.success) {
            console.log('✅ 제목 요소 포커스 완료');
            await window.electronAPI.playwrightWaitTimeout(500);
            
            // 제목을 실제 Playwright 키보드 API로 타이핑
            console.log('🎹 실제 키보드로 제목 타이핑 시작...');
            const titleTypingResult = await window.electronAPI.playwrightType(data.selectedTitle, 30);
            
            if (titleTypingResult.success) {
              console.log('✅ 제목 입력 완료');
              
              // 제목 입력 후 2초 대기
              console.log('📍 2초 대기 후 본문 영역으로 이동...');
              await window.electronAPI.playwrightWaitTimeout(2000);
              
              // 제목 입력 후 바로 본문 입력으로 넘어감 (중복 클릭 제거)
              console.log('✅ 제목 입력 완료, 본문 입력 준비됨');
              await window.electronAPI.playwrightWaitTimeout(1000);
              
            } else {
              console.warn('⚠️ 제목 입력 실패:', titleTypingResult.error);
            }
          } else {
            console.warn('⚠️ 제목 요소 포커스 실패:', titleFocusResult?.result?.message);
          }
          
          await window.electronAPI.playwrightWaitTimeout(1000);
          break;
        }
      }
      
    } catch (error) {
      console.log('제목 입력 중 오류 (무시):', error);
    }

    return true;
  };

  // Step3 글씨 크기 매핑 (4가지만 사용)
  const mapStep3FontSize = (fontSize: string) => {
    const sizeMap: { [key: string]: { size: string; bold: boolean } } = {
      '24px': { size: '24', bold: true },   // 대제목
      '19px': { size: '19', bold: true },   // 소제목  
      '16px': { size: '16', bold: true },   // 강조
      '15px': { size: '15', bold: false }   // 일반
    };
    return sizeMap[fontSize] || { size: '15', bold: false }; // 기본값
  };

  // 네이버 블로그에서 글씨 크기 변경
  const changeFontSize = async (fontSize: string): Promise<boolean> => {
    console.log(`📏 글씨 크기 변경: ${fontSize}`);
    
    try {
      // 글씨 크기 버튼 클릭
      const fontSizeButtonResult = await window.electronAPI.playwrightClickInFrames('.se-font-size-code-toolbar-button');
      
      if (fontSizeButtonResult.success) {
        await window.electronAPI.playwrightWaitTimeout(500);
        
        // 특정 크기 선택
        const sizeSelector = `.se-toolbar-option-font-size-code-fs${fontSize}-button`;
        const sizeOptionResult = await window.electronAPI.playwrightClickInFrames(sizeSelector);
        
        if (sizeOptionResult.success) {
          console.log(`✅ 글씨 크기 ${fontSize} 적용 완료`);
          await window.electronAPI.playwrightWaitTimeout(300);
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 글씨 크기 변경 실패: ${error}`);
    }
    
    return false;
  };

  // 네이버 블로그에서 굵기 상태 확인
  const getCurrentBoldState = async (): Promise<boolean> => {
    try {
      const stateResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const boldButton = document.querySelector('.se-bold-toolbar-button');
            if (boldButton) {
              const isSelected = boldButton.classList.contains('se-is-selected');
              console.log('현재 굵기 상태:', isSelected ? '켜짐' : '꺼짐');
              return { success: true, isBold: isSelected };
            }
            return { success: false };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      return stateResult?.result?.isBold || false;
    } catch (error) {
      console.warn('굵기 상태 확인 실패:', error);
      return false;
    }
  };

  // 네이버 블로그에서 굵기 설정 (상태 확인 후 필요시에만 토글)
  const setBoldState = async (targetBold: boolean): Promise<boolean> => {
    console.log(`🔥 굵기 상태 설정: ${targetBold ? '켜기' : '끄기'}`);
    
    try {
      // 현재 굵기 상태 확인
      const currentBold = await getCurrentBoldState();
      
      // 이미 원하는 상태면 토글하지 않음
      if (currentBold === targetBold) {
        console.log(`✅ 이미 원하는 굵기 상태 (${targetBold ? '켜짐' : '꺼짐'})`);
        return true;
      }
      
      console.log(`🔄 굵기 상태 변경: ${currentBold ? '켜짐' : '꺼짐'} → ${targetBold ? '켜짐' : '꺼짐'}`);
      
      // 굵기 버튼 클릭 (토글)
      const boldSelectors = [
        '.se-bold-toolbar-button',
        'button[data-name="bold"]',
        'button[data-log="prt.bold"]'
      ];
      
      for (const selector of boldSelectors) {
        const result = await window.electronAPI.playwrightClickInFrames(selector);
        if (result.success) {
          console.log(`✅ 굵기 토글 완료`);
          await window.electronAPI.playwrightWaitTimeout(300);
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 굵기 설정 실패: ${error}`);
    }
    
    return false;
  };

  // 기존 applyBold 함수는 setBoldState(true)로 대체
  const applyBold = async (): Promise<boolean> => {
    return await setBoldState(true);
  };

  // 서식 적용 (글씨 크기 + 굵게)
  const applyFormatting = async (formatInfo: { size: string; bold: boolean }): Promise<void> => {
    console.log(`🎨 서식 적용: 크기 ${formatInfo.size}${formatInfo.bold ? ' + 굵게' : ''}`);
    
    // 1. 글씨 크기 변경
    await changeFontSize(formatInfo.size);
    
    // 2. 굵게 처리 (필요한 경우)
    if (formatInfo.bold) {
      await applyBold();
    }
  };

  // 네이버 블로그에 표 추가 (원하는 크기로 조정)
  const addTable = async (rows: number = 3, cols: number = 3): Promise<boolean> => {
    console.log(`📊 표 추가: ${rows}행 ${cols}열`);
    
    try {
      // 1단계: 표 추가 버튼 클릭 (기본 3x3 생성)
      const tableButtonResult = await window.electronAPI.playwrightClickInFrames('.se-table-toolbar-button');
      
      if (!tableButtonResult.success) {
        console.warn('⚠️ 표 추가 버튼 클릭 실패');
        return false;
      }
      
      console.log('✅ 기본 3x3 표 생성 완료');
      await window.electronAPI.playwrightWaitTimeout(1000);
      
      // 2단계: 필요한 경우 행 추가 (3행에서 target까지)
      if (rows > 3) {
        const rowsToAdd = rows - 3;
        console.log(`📏 ${rowsToAdd}개 행 추가 중...`);
        
        for (let i = 0; i < rowsToAdd; i++) {
          // 마지막 행의 "행 추가" 버튼 클릭
          const addRowResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 행 컨트롤바에서 마지막 행의 "행 추가" 버튼 찾기
                const rowControlbar = document.querySelector('.se-cell-controlbar-row');
                if (rowControlbar) {
                  const lastRowItem = rowControlbar.lastElementChild;
                  if (lastRowItem) {
                    const addButton = lastRowItem.querySelector('.se-cell-add-button');
                    if (addButton) {
                      addButton.click();
                      console.log('행 추가 버튼 클릭');
                      return { success: true };
                    }
                  }
                }
                return { success: false, error: '행 추가 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `);
          
          if (addRowResult?.result?.success) {
            console.log(`✅ 행 ${i + 1} 추가 완료`);
            await window.electronAPI.playwrightWaitTimeout(500);
          } else {
            console.warn(`⚠️ 행 ${i + 1} 추가 실패`);
          }
        }
      }
      
      // 3단계: 필요한 경우 열 추가 (3열에서 target까지)
      if (cols > 3) {
        const colsToAdd = cols - 3;
        console.log(`📏 ${colsToAdd}개 열 추가 중...`);
        
        for (let i = 0; i < colsToAdd; i++) {
          // 마지막 열의 "열 추가" 버튼 클릭
          const addColResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                // 열 컨트롤바에서 마지막 열의 "열 추가" 버튼 찾기
                const colControlbar = document.querySelector('.se-cell-controlbar-column');
                if (colControlbar) {
                  const lastColItem = colControlbar.lastElementChild;
                  if (lastColItem) {
                    const addButton = lastColItem.querySelector('.se-cell-add-button');
                    if (addButton) {
                      addButton.click();
                      console.log('열 추가 버튼 클릭');
                      return { success: true };
                    }
                  }
                }
                return { success: false, error: '열 추가 버튼을 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `);
          
          if (addColResult?.result?.success) {
            console.log(`✅ 열 ${i + 1} 추가 완료`);
            await window.electronAPI.playwrightWaitTimeout(500);
          } else {
            console.warn(`⚠️ 열 ${i + 1} 추가 실패`);
          }
        }
      }
      
      console.log(`✅ ${rows}행 ${cols}열 표 생성 완료`);
      return true;
      
    } catch (error) {
      console.warn(`⚠️ 표 추가 실패: ${error}`);
      return false;
    }
  };

  // 표 셀에 텍스트 입력 (정확한 네이버 구조 기반)
  const inputTableCell = async (text: string, rowIndex: number, colIndex: number): Promise<boolean> => {
    console.log(`📝 표 셀 입력: (${rowIndex}, ${colIndex}) - "${text}"`);
    
    try {
      // 표 셀 클릭 및 텍스트 입력
      const inputResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            // 네이버 블로그 표 구조에 맞는 셀 찾기
            const table = document.querySelector('.se-table-content');
            if (!table) {
              return { success: false, error: '표를 찾을 수 없음' };
            }
            
            const rows = table.querySelectorAll('tr.se-tr');
            if (rows.length <= ${rowIndex}) {
              return { success: false, error: '행 인덱스 초과: ${rowIndex}' };
            }
            
            const targetRow = rows[${rowIndex}];
            const cells = targetRow.querySelectorAll('td.se-cell');
            if (cells.length <= ${colIndex}) {
              return { success: false, error: '열 인덱스 초과: ${colIndex}' };
            }
            
            const targetCell = cells[${colIndex}];
            
            // 셀 클릭
            targetCell.click();
            targetCell.focus();
            
            // 셀 내부의 span.__se-node 요소 찾기
            const spanElement = targetCell.querySelector('span.__se-node');
            if (spanElement) {
              // 기존 내용 지우고 새 텍스트 입력
              spanElement.textContent = '${text.replace(/'/g, "\\'")}';
              spanElement.innerText = '${text.replace(/'/g, "\\'")}';
              
              // 이벤트 발생
              spanElement.focus();
              const events = ['input', 'change', 'keyup', 'blur'];
              events.forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                spanElement.dispatchEvent(event);
              });
              
              return { success: true };
            } else {
              return { success: false, error: 'span.__se-node 요소를 찾을 수 없음' };
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      if (inputResult?.result?.success) {
        console.log(`✅ 표 셀 입력 완료: "${text}"`);
        await window.electronAPI.playwrightWaitTimeout(200);
        return true;
      } else {
        console.warn(`⚠️ 표 셀 입력 실패: ${inputResult?.result?.error}`);
        return false;
      }
    } catch (error) {
      console.warn(`⚠️ 표 셀 입력 실패: ${error}`);
      return false;
    }
  };

  // 표 헤더 행 선택 (여러 방식 시도)
  const selectTableHeaderRow = async (): Promise<boolean> => {
    console.log('🎯 표 헤더 행 선택...');
    
    try {
      // 방법 1: 드래그 선택으로 첫 번째 행 전체 선택
      const dragSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const table = document.querySelector('.se-table-container table') || document.querySelector('table');
            if (!table) return { success: false, message: '표를 찾을 수 없음' };
            
            const firstRow = table.querySelector('tr:first-child');
            if (!firstRow) return { success: false, message: '첫 번째 행을 찾을 수 없음' };
            
            const firstCell = firstRow.querySelector('td:first-child');
            const lastCell = firstRow.querySelector('td:last-child');
            
            if (firstCell && lastCell) {
              // 드래그 시뮬레이션
              const rect1 = firstCell.getBoundingClientRect();
              const rect2 = lastCell.getBoundingClientRect();
              
              // 마우스 다운 이벤트 (첫 번째 셀)
              firstCell.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true,
                clientX: rect1.left + 5,
                clientY: rect1.top + 5
              }));
              
              // 마우스 무브 이벤트 (마지막 셀로)
              document.dispatchEvent(new MouseEvent('mousemove', {
                bubbles: true,
                clientX: rect2.right - 5,
                clientY: rect2.top + 5
              }));
              
              // 마우스 업 이벤트 (마지막 셀)
              lastCell.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                clientX: rect2.right - 5,
                clientY: rect2.top + 5
              }));
              
              console.log('드래그 선택 완료');
              return { success: true, method: 'drag' };
            }
            
            return { success: false, message: '셀을 찾을 수 없음' };
          } catch (error) {
            return { success: false, message: error.message };
          }
        })()
      `);
      
      if (dragSelectResult?.result?.success) {
        console.log('✅ 드래그로 헤더 행 선택 완료');
        await window.electronAPI.playwrightWaitTimeout(500);
        return true;
      }
      
      // 방법 2: 행 번호 클릭 (네이버 블로그에 행 번호가 있는 경우)
      const rowNumberSelectors = [
        '.se-table-container table tr:first-child th:first-child',
        '.se-table-container table tr:first-child .se-table-row-header'
      ];
      
      for (const selector of rowNumberSelectors) {
        const result = await window.electronAPI.playwrightClickInFrames(selector);
        if (result.success) {
          console.log('✅ 행 번호 클릭으로 헤더 행 선택 완료');
          return true;
        }
      }
      
      // 방법 3: 첫 번째 셀 클릭 후 Shift+End로 행 전체 선택
      const firstCellSelectors = [
        '.se-table-container table tr:first-child td:first-child',
        'table tbody tr:first-child td:first-child',
        'table tr:first-child td:first-child'
      ];
      
      for (const selector of firstCellSelectors) {
        const cellResult = await window.electronAPI.playwrightClickInFrames(selector);
        if (cellResult.success) {
          console.log('✅ 첫 번째 셀 클릭 완료, 행 전체 선택 시도...');
          
          // Shift+End 키 조합으로 행 전체 선택 시도
          const shiftSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                const cell = document.querySelector('${selector}');
                if (cell) {
                  cell.focus();
                  
                  // Shift + End 키 이벤트
                  const shiftEndEvent = new KeyboardEvent('keydown', {
                    key: 'End',
                    code: 'End',
                    shiftKey: true,
                    bubbles: true
                  });
                  cell.dispatchEvent(shiftEndEvent);
                  
                  return { success: true };
                }
                return { success: false };
              } catch (error) {
                return { success: false, message: error.message };
              }
            })()
          `);
          
          if (shiftSelectResult?.result?.success) {
            console.log('✅ Shift+End로 행 전체 선택 완료');
            return true;
          }
          
          // 단순 첫 번째 셀만 선택된 상태로 진행
          console.log('✅ 첫 번째 셀 선택 완료 (단일 셀)');
          return true;
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ 헤더 행 선택 실패: ${error}`);
    }
    
    return false;
  };

  // 표 셀 배경색 변경 (정확한 hex 코드 입력)
  const changeTableCellBackgroundColor = async (color: string = '#e0e0e0'): Promise<boolean> => {
    console.log(`🎨 표 셀 배경색 변경: ${color}`);
    
    try {
      // 1. 셀 배경색 버튼 클릭
      const cellBgButton = '.se-cell-background-color-toolbar-button';
      const buttonResult = await window.electronAPI.playwrightClickInFrames(cellBgButton);
      
      if (!buttonResult.success) {
        // 대체 셀렉터 시도
        const altSelectors = [
          'button[data-name="cell-background-color"]',
          '.se-property-toolbar-color-picker-button[data-name="cell-background-color"]'
        ];
        
        let altSuccess = false;
        for (const altSelector of altSelectors) {
          const altResult = await window.electronAPI.playwrightClickInFrames(altSelector);
          if (altResult.success) {
            console.log(`✅ 대체 셀 배경색 버튼 클릭 완료: ${altSelector}`);
            altSuccess = true;
            break;
          }
        }
        
        if (!altSuccess) {
          console.warn('⚠️ 셀 배경색 버튼을 찾을 수 없음');
          return false;
        }
      } else {
        console.log('✅ 셀 배경색 버튼 클릭 완료');
      }
      
      await window.electronAPI.playwrightWaitTimeout(500);
      
      // 2. 방법 1: 색상 팔레트에서 선택 시도
      const colorSelector = `.se-color-palette[data-color="${color}"]`;
      const colorResult = await window.electronAPI.playwrightClickInFrames(colorSelector);
      
      if (colorResult.success) {
        console.log(`✅ 팔레트에서 배경색 설정 완료: ${color}`);
        return true;
      }
      
      // 3. 방법 2: 더보기 → hex 입력 방식
      console.log('🔍 팔레트에서 색상을 찾지 못함, 더보기로 직접 입력 시도...');
      
      // 더보기 버튼 클릭
      const moreButtonResult = await window.electronAPI.playwrightClickInFrames('.se-color-picker-more-button');
      
      if (moreButtonResult.success) {
        console.log('✅ 더보기 버튼 클릭 완료');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // hex 입력 필드에 색상 코드 입력
        const hexInputResult = await window.electronAPI.playwrightEvaluateInFrames(`
          (function() {
            try {
              const hexInput = document.querySelector('.se-selected-color-hex');
              if (hexInput) {
                hexInput.click();
                hexInput.focus();
                hexInput.value = '${color}';
                
                // 이벤트 발생
                const events = ['input', 'change', 'keyup'];
                events.forEach(eventType => {
                  const event = new Event(eventType, { bubbles: true });
                  hexInput.dispatchEvent(event);
                });
                
                return { success: true };
              }
              return { success: false, message: 'hex 입력 필드를 찾을 수 없음' };
            } catch (error) {
              return { success: false, message: error.message };
            }
          })()
        `);
        
        if (hexInputResult?.result?.success) {
          console.log(`✅ hex 코드 입력 완료: ${color}`);
          await window.electronAPI.playwrightWaitTimeout(300);
          
          // 확인 버튼 클릭
          const applyButtonResult = await window.electronAPI.playwrightClickInFrames('.se-color-picker-apply-button');
          
          if (applyButtonResult.success) {
            console.log('✅ 색상 적용 확인 버튼 클릭 완료');
            return true;
          } else {
            console.warn('⚠️ 확인 버튼 클릭 실패');
          }
        } else {
          console.warn('⚠️ hex 코드 입력 실패');
        }
      } else {
        console.warn('⚠️ 더보기 버튼 클릭 실패');
      }
      
    } catch (error) {
      console.warn(`⚠️ 셀 배경색 변경 실패: ${error}`);
    }
    
    return false;
  };

  // 개별 헤더 셀에 스타일 적용
  const applyHeaderCellStyle = async (cellIndex: number, color: string = '#e0e0e0'): Promise<boolean> => {
    console.log(`🎯 헤더 셀 ${cellIndex + 1} 스타일 적용...`);
    
    try {
      // 특정 헤더 셀 선택
      const cellSelectors = [
        `.se-table-container table tr:first-child td:nth-child(${cellIndex + 1})`,
        `table tbody tr:first-child td:nth-child(${cellIndex + 1})`,
        `table tr:first-child td:nth-child(${cellIndex + 1})`
      ];
      
      for (const selector of cellSelectors) {
        const cellResult = await window.electronAPI.playwrightClickInFrames(selector);
        if (cellResult.success) {
          console.log(`✅ 헤더 셀 ${cellIndex + 1} 선택 완료`);
          await window.electronAPI.playwrightWaitTimeout(200);
          
          // 배경색 변경
          const bgChanged = await changeTableCellBackgroundColor(color);
          await window.electronAPI.playwrightWaitTimeout(200);
          
          // 굵게 처리
          const boldApplied = await applyBold();
          await window.electronAPI.playwrightWaitTimeout(200);
          
          console.log(`✅ 헤더 셀 ${cellIndex + 1} 스타일 적용 완료 (배경: ${bgChanged}, 굵게: ${boldApplied})`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ 헤더 셀 ${cellIndex + 1} 스타일 적용 실패: ${error}`);
      return false;
    }
  };

  // 표 헤더 스타일 적용 (배경색 + 굵게)
  const applyTableHeaderStyle = async (): Promise<boolean> => {
    console.log('🎨 표 헤더 스타일 적용...');
    
    try {
      // 방법 1: 전체 행 선택 후 한 번에 적용
      const headerSelected = await selectTableHeaderRow();
      
      if (headerSelected) {
        console.log('✅ 헤더 행 전체 선택 완료, 스타일 적용 중...');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // 배경색 변경
        const bgChanged = await changeTableCellBackgroundColor('#e0e0e0');
        await window.electronAPI.playwrightWaitTimeout(300);
        
        // 텍스트 굵게 처리
        const boldApplied = await applyBold();
        
        console.log(`✅ 헤더 스타일 일괄 적용 완료 (배경: ${bgChanged}, 굵게: ${boldApplied})`);
        return true;
      }
      
      // 방법 2: 전체 행 선택 실패 시 개별 셀 적용
      console.log('⚠️ 헤더 행 전체 선택 실패, 개별 셀 스타일 적용으로 변경...');
      
      // 표의 첫 번째 행에서 셀 개수 확인
      const cellCountResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            const firstRow = document.querySelector('.se-table-container table tr:first-child') || 
                            document.querySelector('table tr:first-child');
            if (firstRow) {
              const cells = firstRow.querySelectorAll('td');
              return { success: true, cellCount: cells.length };
            }
            return { success: false, cellCount: 0 };
          } catch (error) {
            return { success: false, cellCount: 0 };
          }
        })()
      `);
      
      const cellCount = cellCountResult?.result?.cellCount || 3; // 기본값 3개
      console.log(`📊 헤더 행 셀 개수: ${cellCount}`);
      
      // 각 셀에 개별적으로 스타일 적용
      let successCount = 0;
      for (let i = 0; i < cellCount; i++) {
        const cellSuccess = await applyHeaderCellStyle(i, '#e0e0e0');
        if (cellSuccess) {
          successCount++;
        }
        await window.electronAPI.playwrightWaitTimeout(300);
      }
      
      console.log(`✅ 헤더 스타일 개별 적용 완료: ${successCount}/${cellCount} 셀 성공`);
      return successCount > 0;
      
    } catch (error) {
      console.warn(`⚠️ 헤더 스타일 적용 실패: ${error}`);
      return false;
    }
  };

  // Step3 표 데이터 파싱
  const parseTableData = (tableContent: string) => {
    try {
      console.log('📊 표 내용 파싱 시작...');
      
      // tr 태그별로 행 찾기
      const rowRegex = /<tr[^>]*class="se-tr"[^>]*>(.*?)<\/tr>/g;
      const rows: string[][] = [];
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        
        // td 태그별로 셀 찾기
        const cellRegex = /<td[^>]*>(.*?)<\/td>/g;
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellContent = cellMatch[1];
          
          // 셀 내부의 텍스트 추출 (span 태그 내부)
          const textRegex = /<span[^>]*__se-node[^>]*>(.*?)<\/span>/g;
          const textMatch = textRegex.exec(cellContent);
          const cellText = textMatch ? textMatch[1].trim() : '';
          
          cells.push(cellText);
        }
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
      
      if (rows.length > 0) {
        const tableData = {
          rows: rows.length,
          cols: rows[0].length,
          data: rows
        };
        
        console.log(`✅ 표 파싱 완료: ${tableData.rows}행 ${tableData.cols}열`);
        console.log('📋 표 데이터:', tableData.data);
        
        return tableData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 표 파싱 실패:', error);
      return null;
    }
  };

  // Step3에서 편집된 HTML 내용을 문단별로 파싱 (개선된 버전)
  const parseContentByParagraphs = (htmlContent: string) => {
    console.log('🔍 Step3 HTML 구조 분석 시작...');
    
    const paragraphs: {
      segments: {
        text: string;
        fontSize: string;
        isBold: boolean;
      }[];
      isTable?: boolean;
      tableData?: { rows: number; cols: number; data: string[][] };
    }[] = [];
    
    // 1. 먼저 표 처리
    const tableRegex = /<div class="se-component se-table[^>]*">[\s\S]*?<table class="se-table-content[^>]*">([\s\S]*?)<\/table>[\s\S]*?<\/div>/g;
    let tableMatch;
    let processedContent = htmlContent;
    
    while ((tableMatch = tableRegex.exec(htmlContent)) !== null) {
      const tableContent = tableMatch[1];
      console.log('📊 표 발견');
      
      const tableData = parseTableData(tableContent);
      if (tableData) {
        paragraphs.push({
          segments: [],
          isTable: true,
          tableData
        });
        console.log(`✅ 표 파싱: ${tableData.rows}행 ${tableData.cols}열`);
        
        // 처리된 표는 원본에서 제거
        processedContent = processedContent.replace(tableMatch[0], '');
      }
    }
    
    // 2. 문단(p 태그)별로 처리
    const pRegex = /<p[^>]*class="se-text-paragraph[^>]*"[^>]*>([\s\S]*?)<\/p>/g;
    let pMatch;
    
    while ((pMatch = pRegex.exec(processedContent)) !== null) {
      const pContent = pMatch[1];
      
      // 이미지 플레이스홀더 체크
      if (pContent.includes('(이미지)')) {
        console.log('📷 이미지 플레이스홀더 발견 - 건너뛰기');
        continue;
      }
      
      const segments: { text: string; fontSize: string; isBold: boolean; }[] = [];
      
      // span 태그별로 세그먼트 파싱
      const spanRegex = /<span[^>]*class="[^"]*se-ff-nanumgothic[^"]*"[^>]*>(.*?)<\/span>/g;
      let spanMatch;
      
      if (pContent.match(spanRegex)) {
        // span이 있는 경우
        while ((spanMatch = spanRegex.exec(pContent)) !== null) {
          const spanOuterHTML = spanMatch[0];
          const spanInnerHTML = spanMatch[1];
          
          // 폰트 크기 추출
          let fontSize = '15px';
          const fontSizeMatch = spanOuterHTML.match(/se-fs(\d+)/);
          if (fontSizeMatch) {
            fontSize = fontSizeMatch[1] + 'px';
          }
          
          // 굵기 추출
          const isBold = spanOuterHTML.includes('font-weight: bold') || spanOuterHTML.includes('font-weight:bold');
          
          // 중첩된 span 처리
          let text = '';
          const nestedSpanRegex = /<span[^>]*>(.*?)<\/span>/g;
          let nestedMatch;
          
          if (spanInnerHTML.match(nestedSpanRegex)) {
            // 중첩된 span이 있는 경우
            while ((nestedMatch = nestedSpanRegex.exec(spanInnerHTML)) !== null) {
              const nestedSpanOuter = nestedMatch[0];
              let nestedText = nestedMatch[1];
              
              // 중첩된 span의 폰트 크기 우선 적용
              const nestedFontSizeMatch = nestedSpanOuter.match(/se-fs(\d+)/);
              if (nestedFontSizeMatch) {
                fontSize = nestedFontSizeMatch[1] + 'px';
              }
              
              // 중첩된 span의 굵기 우선 적용
              const nestedBold = nestedSpanOuter.includes('font-weight: bold') || nestedSpanOuter.includes('font-weight:bold');
              
              nestedText = nestedText
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
              
              if (nestedText.trim()) {
                segments.push({
                  text: nestedText.trim(),
                  fontSize,
                  isBold: nestedBold || isBold
                });
              }
            }
          } else {
            // 중첩되지 않은 경우
            text = spanInnerHTML
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            
            if (text.trim()) {
              segments.push({
                text: text.trim(),
                fontSize,
                isBold
              });
            }
          }
        }
      } else {
        // span이 없는 일반 텍스트
        const text = pContent
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        if (text) {
          segments.push({
            text,
            fontSize: '15px',
            isBold: false
          });
        }
      }
      
      // 세그먼트가 있는 경우만 문단 추가
      if (segments.length > 0) {
        paragraphs.push({ segments });
        console.log(`📝 문단 파싱 완료: ${segments.length}개 세그먼트`);
        segments.forEach(seg => console.log(`  - "${seg.text}" (${seg.fontSize}${seg.isBold ? ', 굵게' : ''})`));
      }
    }
    
    console.log(`✅ 총 ${paragraphs.length}개 문단 파싱 완료`);
    return paragraphs;
  };


  // 클립보드 붙여넣기 + 이미지 업로드 통합
  const inputContentWithImages = async (): Promise<boolean> => {
    console.log('📝 본문 및 이미지 입력 시작...');
    
    if (!editedContent) {
      console.warn('⚠️ 편집된 내용이 없습니다.');
      return false;
    }
    
    try {
      // 1. 먼저 텍스트 붙여넣기
      console.log('📝 네이버 블로그 본문 영역 클릭 시도...');
      
      const contentSelectors = [
        '.se-placeholder.__se_placeholder:not(.se-placeholder-focused)',
        '.se-placeholder.__se_placeholder',
        '[contenteditable="true"]',
        '.se-module-text.__se-unit',
        '.se-text-paragraph'
      ];
      
      let contentClicked = false;
      for (const selector of contentSelectors) {
        console.log(`네이버 본문 영역 클릭 시도: ${selector}`);
        const clickResult = await window.electronAPI.playwrightClickInFrames(selector, 'PostWriteForm.naver');
        if (clickResult.success) {
          console.log(`✅ 네이버 본문 영역 클릭 성공: ${selector}`);
          contentClicked = true;
          await window.electronAPI.playwrightWaitTimeout(1000);
          break;
        }
      }
      
      if (!contentClicked) {
        console.warn('⚠️ 네이버 본문 영역 클릭 실패');
        return false;
      }
      
      // 2. 텍스트 붙여넣기
      console.log('📋 네이버 블로그에서 텍스트 붙여넣기...');
      
      const pasteResult = await window.electronAPI.playwrightPress('Control+v');
      if (!pasteResult.success) {
        console.warn('⚠️ Ctrl+V 실패');
        return false;
      }
      
      console.log('✅ Ctrl+V 붙여넣기 완료');
      await window.electronAPI.playwrightWaitTimeout(3000); // 네이버 처리 시간 충분히 대기
      
      // 3. Step3에서 선택된 이미지들 자동 업로드
      // 실제 URL이 있는 이미지만 필터링
      const validImages = Object.entries(imageUrls)
        .filter(([key, url]) => url && url.trim() !== '')
        .map(([key, url]) => ({ index: parseInt(key), url: url as string }));
      
      const imageCount = validImages.length;
      if (imageCount > 0) {
        console.log(`📸 ${imageCount}개 이미지를 자동으로 업로드합니다...`);
        console.log(`📋 처리할 이미지 인덱스: ${validImages.map(img => img.index).join(', ')}`);
        
        // 실제 존재하는 이미지들만 순서대로 처리
        for (const { index: i, url: imageUrl } of validImages) {
          
          console.log(`📸 이미지 ${i} 처리 중: ${imageUrl.substring(0, 50)}...`);
          
          try {
            // 1. 이미지를 임시 파일로 저장
            const downloadResponse = await fetch(imageUrl);
            const imageBuffer = await downloadResponse.arrayBuffer();
            const imageDataArray = Array.from(new Uint8Array(imageBuffer));
            
            const fileExtension = imageUrl.includes('.png') ? 'png' : 
                                imageUrl.includes('.gif') ? 'gif' : 
                                imageUrl.includes('.webp') ? 'webp' : 'jpg';
            const fileName = `blog_image_${i}.${fileExtension}`;
            
            const saveResult = await window.electronAPI.saveTempFile(fileName, imageDataArray);
            if (!saveResult.success || !saveResult.filePath) {
              console.error(`❌ 이미지 ${i} 임시 저장 실패:`, saveResult.error);
              continue;
            }
            
            console.log(`✅ 이미지 ${i} 임시 저장 완료: ${saveResult.filePath}`);
            
            // 2. 네이버 블로그에서 (이미지${i}) 텍스트 찾아서 바로 클릭
            console.log(`🎯 네이버 블로그에서 "(이미지${i})" 찾아서 클릭...`);
            
            // Step 1: (이미지${i}) 텍스트 찾고 좌표 계산
            const findResult = await window.electronAPI.playwrightEvaluateInFrames(`
              (function() {
                try {
                  console.log('(이미지${i}) 찾기 시작');
                  
                  // TreeWalker로 DOM 순서대로 (이미지${i}) 텍스트 노드 찾기
                  let imageElements = [];
                  const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                  );
                  
                  let node;
                  while (node = walker.nextNode()) {
                    if (node.textContent && (
                      node.textContent.includes('(이미지${i})') || 
                      node.textContent.includes('[이미지${i}]') ||
                      node.textContent.match(/\(이미지\d+\)/) ||
                      node.textContent.match(/\[이미지\d+\]/)
                    )) {
                      const parentElement = node.parentElement;
                      if (parentElement) {
                        // 정확히 ${i}번째 이미지인지 확인
                        const isTargetImage = parentElement.textContent.includes('(이미지${i})') || 
                                             parentElement.textContent.includes('[이미지${i}]');
                        if (isTargetImage) {
                          imageElements.push(parentElement);
                          console.log('발견된 (이미지${i}) 요소:', parentElement.textContent.trim(), '위치:', imageElements.length);
                        }
                      }
                    }
                  }
                  
                  console.log('(이미지${i}) 텍스트를 포함하는 요소 개수:', imageElements.length);
                  
                  if (imageElements.length > 0) {
                    const targetElement = imageElements[0]; // 정확히 찾은 ${i}번째 이미지 요소
                    console.log('(이미지${i}) 요소:', targetElement.textContent.trim());
                    
                    // 스크롤해서 화면에 보이게 하기
                    targetElement.scrollIntoView({ behavior: 'instant', block: 'center' });
                    
                    // 좌표 계산
                    const rect = targetElement.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    console.log('(이미지${i}) 좌표:', { x: centerX, y: centerY });
                    
                    return { 
                      success: true, 
                      elementText: targetElement.textContent.trim(),
                      centerX: centerX,
                      centerY: centerY,
                      totalFound: imageElements.length
                    };
                  } else {
                    return { 
                      success: false, 
                      error: '(이미지${i}) 요소를 찾을 수 없음',
                      found: imageElements.length,
                      searchFor: '(이미지${i})'
                    };
                  }
                } catch (error) {
                  console.error('(이미지${i}) 찾기 오류:', error);
                  return { success: false, error: error.message };
                }
              })()
            `, 'PostWriteForm.naver');
            
            if (!findResult?.result?.success) {
              console.warn(`⚠️ (이미지${i}) 텍스트 찾기 실패:`, findResult?.result);
              continue;
            }
            
            console.log(`✅ (이미지${i}) 텍스트 찾기 완료: "${findResult.result.elementText}"`);
            
            // Step 2: 실제 Playwright 마우스로 클릭
            if (findResult.result.centerX && findResult.result.centerY) {
              console.log(`🖱️ 실제 마우스로 클릭: (${findResult.result.centerX}, ${findResult.result.centerY})`);
              
              // iframe 오프셋 계산
              const offsetResult = await window.electronAPI.playwrightEvaluate(`
                (function() {
                  try {
                    const iframe = document.querySelector('iframe[src*="PostWriteForm.naver"]') || 
                                  document.querySelector('iframe');
                    if (iframe) {
                      const rect = iframe.getBoundingClientRect();
                      return { success: true, offsetX: rect.left, offsetY: rect.top };
                    }
                    return { success: false, error: 'iframe을 찾을 수 없음' };
                  } catch (error) {
                    return { success: false, error: error.message };
                  }
                })()
              `);
              
              if (offsetResult?.result?.success) {
                const realX = findResult.result.centerX + offsetResult.result.offsetX;
                const realY = findResult.result.centerY + offsetResult.result.offsetY;
                
                console.log(`🖱️ 최종 더블클릭 좌표: (${realX}, ${realY})`);
                
                // 실제 마우스 더블클릭 (두 번 연속 클릭)
                const firstClick = await window.electronAPI.playwrightClickAt(realX, realY);
                
                if (firstClick.success) {
                  // 짧은 간격 후 두 번째 클릭
                  await window.electronAPI.playwrightWaitTimeout(100);
                  const secondClick = await window.electronAPI.playwrightClickAt(realX, realY);
                  
                  if (secondClick.success) {
                    console.log(`✅ (이미지${i}) 실제 마우스 더블클릭 완료`);
                    
                    // 더블클릭 후 잠깐 대기
                    await window.electronAPI.playwrightWaitTimeout(300);
                    
                    // 선택 상태 확인
                    const selectionCheck = await window.electronAPI.playwrightEvaluateInFrames(`
                      (function() {
                        const selection = window.getSelection();
                        return { selectedText: selection.toString() };
                      })()
                    `, 'PostWriteForm.naver');
                    
                    console.log(`더블클릭 후 선택 상태:`, selectionCheck?.result?.selectedText);
                  } else {
                    console.warn(`⚠️ (이미지${i}) 두 번째 클릭 실패`);
                  }
                } else {
                  console.warn(`⚠️ (이미지${i}) 첫 번째 클릭 실패`);
                }
              } else {
                console.warn(`⚠️ iframe 오프셋 계산 실패`);
              }
            }
            
            const findAndClickResult = { result: findResult.result };
            
            if (!findAndClickResult?.result?.success) {
              console.warn(`⚠️ (이미지${i}) 텍스트 찾기/클릭 실패:`, findAndClickResult?.result);
              continue;
            }
            
            console.log(`✅ (이미지${i}) 텍스트 클릭 완료: "${findAndClickResult.result.elementText}"`);
            await window.electronAPI.playwrightWaitTimeout(500);
            
            // 3. 이미지 파일을 클립보드에 복사 (Electron 메인 프로세스에서)
            console.log(`📋 이미지 ${i}를 클립보드에 복사 중...`);
            
            // Electron의 네이티브 클립보드 API 사용
            const clipboardResult = await window.electronAPI.copyImageToClipboard(saveResult.filePath);
            
            if (!clipboardResult?.success) {
              console.warn(`⚠️ 이미지 ${i} 클립보드 복사 실패:`, clipboardResult?.error);
              continue;
            }
            
            console.log(`✅ 이미지 ${i} 클립보드 복사 완료`);
            
            // 4. 선택된 (이미지${i}) 텍스트에 Ctrl+V로 이미지 붙여넣기 (자동 교체)
            console.log(`📋 이미지 ${i} 붙여넣기 중 (선택된 (이미지${i}) 텍스트 자동 교체)...`);
            
            const pasteImageResult = await window.electronAPI.playwrightPress('Control+v');
            if (!pasteImageResult.success) {
              console.warn(`⚠️ 이미지 ${i} 붙여넣기 실패`);
              continue;
            }
            
            console.log(`✅ 이미지 ${i} 붙여넣기 완료 - 선택된 (이미지${i}) 텍스트가 이미지로 자동 교체됨`);
            await window.electronAPI.playwrightWaitTimeout(2000); // 네이버 이미지 처리 대기
            
            // 5. 임시 파일 정리
            await window.electronAPI.deleteTempFile(saveResult.filePath);
            console.log(`🗑️ 이미지 ${i} 임시 파일 삭제 완료`);
            
          } catch (error) {
            console.error(`❌ 이미지 ${i} 처리 중 오류:`, error);
            continue;
          }
        }
        
        console.log(`🎉 ${imageCount}개 이미지 자동 업로드 프로세스 완료`);
        
      } else {
        console.log('ℹ️ 업로드할 이미지가 없습니다.');
      }
      
      // 4. 붙여넣기 결과 확인
      const pasteCheckResult = await window.electronAPI.playwrightEvaluateInFrames(`
        (function() {
          try {
            // 다양한 에디터 요소 확인
            const editorSelectors = [
              '[contenteditable="true"]',
              '.se-module-text',
              '.se-text-paragraph',
              '.se-component-content'
            ];
            
            let editor = null;
            let content = '';
            
            for (const selector of editorSelectors) {
              const el = document.querySelector(selector);
              if (el && (el.innerHTML || el.textContent)) {
                editor = el;
                content = el.innerHTML || el.textContent || '';
                if (content.trim().length > 0) {
                  console.log('에디터 발견:', selector, '내용 길이:', content.length);
                  break;
                }
              }
            }
            
            if (!editor) {
              return { success: false, error: '에디터를 찾을 수 없음' };
            }
            
            const hasContent = content.trim().length > 0;
            const hasImages = content.includes('se-image-resource') || 
                             content.includes('blogfiles.pstatic.net') ||
                             content.includes('<img') ||
                             content.includes('data-image') ||
                             content.includes('se-image');
            
            // (이미지) 텍스트가 남아있는지 확인
            const remainingImageText = content.includes('(이미지)') || content.includes('[이미지]');
            
            console.log('붙여넣기 결과 상세 확인:', {
              hasContent: hasContent,
              hasImages: hasImages,
              remainingImageText: remainingImageText,
              contentLength: content.length,
              preview: content.substring(0, 200),
              editorClass: editor.className
            });
            
            // 이미지 태그들 찾기
            const imageTags = content.match(/<img[^>]*>/g);
            const imageResources = content.match(/se-image-resource/g);
            
            console.log('이미지 관련 태그 분석:', {
              imageTags: imageTags ? imageTags.length : 0,
              imageResources: imageResources ? imageResources.length : 0,
              sampleImageTag: imageTags ? imageTags[0] : 'none'
            });
            
            return { 
              success: hasContent, 
              contentLength: content.length,
              hasImages: hasImages,
              remainingImageText: remainingImageText,
              imageCount: imageTags ? imageTags.length : 0,
              preview: content.substring(0, 300),
              editorFound: editor.className
            };
          } catch (error) {
            console.error('붙여넣기 확인 오류:', error);
            return { success: false, error: error.message };
          }
        })()
      `, 'PostWriteForm.naver');
      
      if (pasteCheckResult?.result?.success) {
        console.log('🎉 콘텐츠 및 이미지 입력 성공!');
        console.log('입력된 내용 길이:', pasteCheckResult.result.contentLength);
        console.log('이미지 포함 여부:', pasteCheckResult.result.hasImages);
        console.log('내용 미리보기:', pasteCheckResult.result.preview);
        return true;
      } else {
        console.warn('⚠️ 콘텐츠 입력 결과 확인 실패');
        console.log('확인 결과:', pasteCheckResult?.result);
        return false;
      }
      
    } catch (error) {
      console.error('❌ 콘텐츠 및 이미지 입력 실패:', error);
      return false;
    }
  };

  // 발행 옵션에 따른 발행 처리 함수
  const handlePublishByOption = async (): Promise<boolean> => {
    console.log(`발행 옵션: ${publishOption}`);
    
    try {
      if (publishOption === 'temp') {
        // 임시저장 (에디터의 임시저장 버튼 클릭)
        setPublishStatus(prev => ({
          ...prev,
          error: '임시저장 중...'
        }));
        
        console.log('💾 임시저장 버튼 클릭 중...');
        
        // 네이버 블로그의 실제 "저장" 버튼 클릭
        const saveButtonResult = await window.electronAPI.playwrightClickInFrames('.save_btn__bzc5B', 'PostWriteForm.naver');
        
        if (saveButtonResult.success) {
          console.log('✅ 임시저장 완료');
          await window.electronAPI.playwrightWaitTimeout(2000);
          return true;
        } else {
          console.warn('⚠️ 저장 버튼 클릭 실패');
          return false;
        }
        
      } else if (publishOption === 'immediate' || publishOption === 'scheduled') {
        // 즉시 발행 또는 예약 발행 - 둘 다 발행 버튼을 먼저 클릭해야 함
        setPublishStatus(prev => ({
          ...prev,
          error: `${publishOption === 'immediate' ? '즉시 발행' : '예약 발행'} 설정 중...`
        }));
        
        // 1단계: 발행 버튼 클릭하여 발행 설정 팝업 열기
        console.log('📝 발행 버튼 클릭하여 팝업 열기...');
        const publishButtonResult = await window.electronAPI.playwrightClickInFrames('.publish_btn__m9KHH', 'PostWriteForm.naver');
        
        if (!publishButtonResult.success) {
          console.warn('⚠️ 발행 버튼 클릭 실패');
          return false;
        }
        
        console.log('✅ 발행 설정 팝업 열기 완료');
        await window.electronAPI.playwrightWaitTimeout(1000); // 팝업 로딩 대기
        
        // 공감허용 체크박스 클릭 기능 제거됨 (사용자 요청)
        
        // 2단계: 카테고리 자동 선택
        if (publishOption === 'immediate' || publishOption === 'scheduled') {
          console.log('📂 카테고리 선택 시작...');
          const categoryResult = await selectCategoryIfSpecified();
          if (categoryResult.success) {
            console.log('📂 카테고리 선택 완료');
            if (categoryResult.selectedCategory) {
              console.log('🔥 setSelectedBoardCategory 호출 중:', categoryResult.selectedCategory);
              setSelectedBoardCategory(categoryResult.selectedCategory);
              console.log('🔥 setSelectedBoardCategory 호출 완료');
            } else {
              console.log('⚠️ categoryResult.selectedCategory가 없음:', categoryResult);
            }
          } else {
            console.log('⚠️ 카테고리 선택 실패:', categoryResult);
          }
        }
        
        if (publishOption === 'immediate') {
          // 즉시 발행: 기본값이 현재이므로 별도 설정 불필요
          console.log('⚡ 즉시 발행 - 기본 설정 사용 (현재 시간)');
          
        } else if (publishOption === 'scheduled') {
          // 예약 발행: 실제 네이버 구조에 맞는 처리
          console.log('📅 예약 발행 - 예약 라벨 클릭...');
          
          // 1단계: 예약 라벨 클릭
          const radioResult = await window.electronAPI.playwrightClickInFrames('label[for="radio_time2"]', 'PostWriteForm.naver');
          
          if (!radioResult.success) {
            console.warn('⚠️ 예약 라벨 클릭 실패, 라디오 버튼 직접 클릭 시도...');
            const radioDirectResult = await window.electronAPI.playwrightClickInFrames('#radio_time2', 'PostWriteForm.naver');
            if (!radioDirectResult.success) {
              console.warn('⚠️ 예약 라디오 버튼 클릭도 실패');
              return false;
            }
          }
          
          console.log('✅ 예약 라디오 버튼 클릭 완료');
          await window.electronAPI.playwrightWaitTimeout(1000); // 날짜/시간 UI 로딩 대기
          
          // 2단계: 날짜 설정 (현재 날짜가 아닌 경우에만)
          const [year, month, day] = scheduledDate.split('-').map(Number);
          const today = new Date();
          const isToday = year === today.getFullYear() && 
                         month === (today.getMonth() + 1) && 
                         day === today.getDate();
          
          if (isToday) {
            console.log('📅 오늘 날짜이므로 날짜 클릭 건너뜀');
          } else {
            console.log(`📅 날짜 변경 필요: ${scheduledDate}`);
            
            // 날짜 입력 필드 클릭하여 달력 열기
            const dateInputResult = await window.electronAPI.playwrightClickInFrames('.input_date__QmA0s', 'PostWriteForm.naver');
            
            if (!dateInputResult.success) {
              console.warn('⚠️ 날짜 입력 필드 클릭 실패');
              return false;
            }
            
            await window.electronAPI.playwrightWaitTimeout(500); // 달력 팝업 대기
            
            // 달력에서 날짜 선택
            const dateSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
              (function() {
                try {
                  // 달력에서 해당 날짜 버튼 찾기
                  const datePicker = document.querySelector('.ui-datepicker');
                  if (!datePicker) {
                    return { success: false, error: '달력을 찾을 수 없음' };
                  }
                  
                  // 모든 날짜 버튼 중에서 해당 날짜 찾기
                  const dateButtons = datePicker.querySelectorAll('button.ui-state-default');
                  for (const button of dateButtons) {
                    if (button.textContent.trim() === '${day}') {
                      button.click();
                      console.log('날짜 선택 완료: ${day}일');
                      return { success: true };
                    }
                  }
                  
                  return { success: false, error: '해당 날짜 버튼을 찾을 수 없음' };
                } catch (error) {
                  return { success: false, error: error.message };
                }
              })()
            `, 'PostWriteForm.naver');
            
            if (!dateSelectResult.success || !dateSelectResult.result?.success) {
              console.warn('⚠️ 날짜 선택 실패:', dateSelectResult?.result?.error);
              return false;
            }
            
            console.log('✅ 날짜 선택 완료');
            await window.electronAPI.playwrightWaitTimeout(500);
          }
          
          // 4단계: 시간 선택
          console.log(`🕐 시간 선택: ${scheduledHour}시`);
          const hourSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                const hourSelect = document.querySelector('.hour_option__J_heO');
                if (hourSelect) {
                  hourSelect.value = '${scheduledHour}';
                  hourSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('시간 선택 완료: ${scheduledHour}시');
                  return { success: true };
                }
                return { success: false, error: '시간 선택 요소를 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `, 'PostWriteForm.naver');
          
          if (!hourSelectResult.success || !hourSelectResult.result?.success) {
            console.warn('⚠️ 시간 선택 실패:', hourSelectResult?.result?.error);
            return false;
          }
          
          console.log('✅ 시간 선택 완료');
          await window.electronAPI.playwrightWaitTimeout(300);
          
          // 5단계: 분 선택
          console.log(`🕐 분 선택: ${scheduledMinute}분`);
          const minuteSelectResult = await window.electronAPI.playwrightEvaluateInFrames(`
            (function() {
              try {
                const minuteSelect = document.querySelector('.minute_option__Vb3xB');
                if (minuteSelect) {
                  minuteSelect.value = '${scheduledMinute}';
                  minuteSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('분 선택 완료: ${scheduledMinute}분');
                  return { success: true };
                }
                return { success: false, error: '분 선택 요소를 찾을 수 없음' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            })()
          `, 'PostWriteForm.naver');
          
          if (!minuteSelectResult.success || !minuteSelectResult.result?.success) {
            console.warn('⚠️ 분 선택 실패:', minuteSelectResult?.result?.error);
            return false;
          }
          
          console.log('✅ 분 선택 완료');
        }
        
        await window.electronAPI.playwrightWaitTimeout(500);
        console.log(`✅ ${publishOption === 'immediate' ? '즉시 발행' : '예약 발행'} 설정 완료`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ ${publishOption} 발행 처리 실패:`, error);
      return false;
    }
  };

  // 네이버 로그인 + 발행 통합 함수
  const publishToNaverBlog = async (): Promise<PublishResult> => {
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
    
    // 발행 시작 시 선택된 카테고리 초기화 (제거 - 카테고리 선택 후에 덮어써질 예정)
    
    try {
      console.log('네이버 로그인 시도:', { username: naverCredentials.username });
      
      // 1단계: 먼저 클립보드에 복사
      if (copyToClipboard) {
        setPublishStatus(prev => ({
          ...prev,
          error: '콘텐츠를 클립보드에 복사하는 중...'
        }));
        
        const copySuccess = await copyToClipboard();
        if (!copySuccess) {
          console.warn('⚠️ HTML 형식 복사 실패, 텍스트로 복사되었습니다.');
        }
      }
      
      // 2단계: 브라우저 초기화
      setPublishStatus(prev => ({
        ...prev,
        error: '브라우저를 시작하는 중...'
      }));
      
      const initResult = await window.electronAPI.playwrightInitialize();
      if (!initResult.success) {
        throw new Error(`브라우저 초기화 실패: ${initResult.error}`);
      }
      
      // 3단계: 네이버 로그인
      setPublishStatus(prev => ({
        ...prev,
        error: '네이버 로그인 중...'
      }));
      
      const loginStatus = await performNaverLogin(naverCredentials);
      
      if (loginStatus === 'success') {
        // 로그인 성공 - 계정 자동 저장 (성공한 로그인만)
        if (naverCredentials.username && naverCredentials.password) {
          saveAccount(naverCredentials.username, naverCredentials.password);
          setSaveCredentials(true);
        }
        
        setPublishStatus(prev => ({ 
          ...prev, 
          isLoggedIn: true,
          error: '로그인 성공! 글쓰기 페이지로 이동 중...'
        }));
        console.log('로그인 성공!');
        
        // 3단계: 블로그 글쓰기 페이지로 이동
        const blogSuccess = await navigateToNaverBlogWrite(naverCredentials.username);
        if (!blogSuccess) {
          throw new Error('블로그 글쓰기 페이지 이동 실패');
        }
        
        // 4단계: 본문 및 이미지 자동 입력
        setPublishStatus(prev => ({
          ...prev,
          error: '본문과 이미지를 자동으로 입력하는 중...'
        }));
        
        const contentSuccess = await inputContentWithImages();
        if (!contentSuccess) {
          console.warn('⚠️ 본문 및 이미지 자동 입력 실패, 수동으로 진행해주세요.');
        }
        
        
        // 5단계: 발행 옵션에 따른 처리
        setPublishStatus(prev => ({
          ...prev,
          error: `${publishOption === 'temp' ? '임시저장' : publishOption === 'immediate' ? '즉시 발행' : '예약 발행'} 처리 중...`
        }));
        
        // 예약발행인 경우 시간 유효성 체크
        if (publishOption === 'scheduled' && timeError) {
          setPublishStatus(prev => ({
            ...prev,
            error: '예약 시간을 올바르게 설정해주세요.',
            isPublishing: false
          }));
          return { success: false, message: '예약 시간을 올바르게 설정해주세요.' };
        }
        
        const publishSuccess = await handlePublishByOption();
        
        if (publishSuccess && publishOption !== 'temp') {
          // 임시저장이 아닌 경우 최종 발행 버튼 클릭
          console.log('🚀 팝업에서 최종 "발행" 버튼 클릭 중...');
          console.log('🎯 버튼 셀렉터: .confirm_btn__WEaBq');
          
          await window.electronAPI.playwrightWaitTimeout(500); // 설정 완료 후 잠시 대기
          
          const finalPublishResult = await window.electronAPI.playwrightClickInFrames('.confirm_btn__WEaBq', 'PostWriteForm.naver');
          
          if (finalPublishResult.success) {
            console.log('✅ 최종 발행 버튼 클릭 완료');
            console.log(`🎉 ${publishOption === 'immediate' ? '즉시 발행' : '예약 발행'} 처리 완료!`);
            await window.electronAPI.playwrightWaitTimeout(3000); // 발행 완료 대기
          } else {
            console.warn('⚠️ 최종 발행 버튼 클릭 실패');
            // 대체 셀렉터 시도
            const altSelectors = [
              'button[data-testid="seOnePublishBtn"]',
              'button[data-click-area="tpb*i.publish"]',
              '.btn_area__fO7mp button'
            ];
            
            for (const selector of altSelectors) {
              console.log(`🔄 대체 셀렉터 시도: ${selector}`);
              const altResult = await window.electronAPI.playwrightClickInFrames(selector, 'PostWriteForm.naver');
              if (altResult.success) {
                console.log('✅ 대체 셀렉터로 발행 버튼 클릭 완료');
                await window.electronAPI.playwrightWaitTimeout(3000);
                break;
              }
            }
          }
        }
        
        // 6단계: 완료 안내
        const successMessage = publishOption === 'temp' ? '임시저장 완료!' : 
                              publishOption === 'immediate' ? '즉시 발행 완료!' : 
                              '예약 발행 설정 완료!';
        
        setPublishStatus(prev => ({
          ...prev,
          error: `${successMessage} 브라우저에서 확인해주세요.`
        }));
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 성공 처리 (브라우저는 열린 상태로 유지)
        setPublishStatus(prev => ({
          ...prev,
          success: true,
          isPublishing: false,
          error: ''
        }));
        
        // 게시판 저장은 발행 정보 표시 시점에 처리됨
        
        const result: PublishResult = {
          success: true,
          message: '네이버 블로그에 로그인 완료! 브라우저에서 글을 작성해주세요.',
          url: `https://blog.naver.com/${naverCredentials.username}?Redirect=Write&`
        };
        
        // 상위 컴포넌트에 완료 알림
        onComplete({ 
          generatedContent: editedContent
        });
        
        return result;
        
      } else if (loginStatus === 'two_factor') {
        setPublishStatus(prev => ({
          ...prev,
          error: '2차 인증이 필요합니다. 브라우저에서 인증을 완료해주세요.',
          isPublishing: false
        }));
        return { 
          success: false, 
          message: '2차 인증이 필요합니다. 브라우저에서 인증을 완료한 후 다시 시도해주세요.' 
        };
        
      } else if (loginStatus === 'device_registration') {
        setPublishStatus(prev => ({
          ...prev,
          error: '새 기기 등록이 필요합니다. 브라우저에서 등록을 완료해주세요.',
          isPublishing: false
        }));
        return { 
          success: false, 
          message: '새 기기 등록이 필요합니다. 브라우저에서 등록을 완료한 후 다시 시도해주세요.' 
        };
        
      } else {
        throw new Error('로그인 실패');
      }
      
    } catch (error) {
      console.error('로그인 또는 발행 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인 또는 발행에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      
      setPublishStatus(prev => ({
        ...prev,
        error: errorMessage,
        isLoggedIn: false,
        isPublishing: false
      }));
      
      // 브라우저 정리
      try {
        await window.electronAPI.playwrightCleanup();
      } catch (cleanupError) {
        console.error('브라우저 정리 실패:', cleanupError);
      }
      
      return { success: false, message: errorMessage };
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                
                {/* 계정 선택 드롭다운 */}
                {showAccountSelector && savedAccounts.length > 0 && (
                  <div className="account-selector-container absolute z-10 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                  onKeyPress={(e) => e.key === 'Enter' && publishToNaverBlog()}
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
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  발행 옵션
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
                        onChange={(e) => setPublishOption(e.target.value as 'temp' | 'immediate' | 'scheduled')}
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
                        onChange={(e) => setPublishOption(e.target.value as 'temp' | 'immediate' | 'scheduled')}
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
                          지금 바로 모든 사람이 볼 수 있어요
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
                        onChange={(e) => setPublishOption(e.target.value as 'temp' | 'immediate' | 'scheduled')}
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
                          원하는 시간에 자동으로 발행돼요
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
                              <div>
                                <select
                                  value={scheduledHour}
                                  onChange={(e) => handleTimeChange('hour', e.target.value)}
                                  className={`px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                    timeError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                  }`}
                                  disabled={publishStatus.isPublishing}
                                >
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const hour = i.toString().padStart(2, '0');
                                    return (
                                      <option key={hour} value={hour}>
                                        {hour}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              
                              <span className="text-xs text-gray-500">:</span>
                              
                              {/* 분 */}
                              <div>
                                <select
                                  value={scheduledMinute}
                                  onChange={(e) => handleTimeChange('minute', e.target.value)}
                                  className={`px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${
                                    timeError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                  }`}
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
                            
                            {/* 에러 메시지 또는 남은 시간 표시 */}
                            <div className="mt-2">
                              {timeError ? (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                  {timeError}
                                </div>
                              ) : (
                                <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
                                  ✅ {timeUntilPublish}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-1">
                              💡 오늘 남은 시간에만 예약 가능 (10분 단위)
                            </div>
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
            disabled={publishStatus.isPublishing || !naverCredentials.username || !naverCredentials.password}
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
                      const { incompleteCount, totalCount } = checkImageStatus();
                      return `일부 이미지가 아직 생성되지 않았습니다. (${totalCount - incompleteCount}/${totalCount}개 완료)`;
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
        // 발행 완료 후 상태
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
              onClick={logoutFromNaver}
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

// 네이버 발행 컴포넌트 메타정보
export const NaverPublishMeta: IPublishComponent = {
  platform: 'naver',
  name: '네이버 블로그',
  icon: '🟢'
};

export default NaverPublish;