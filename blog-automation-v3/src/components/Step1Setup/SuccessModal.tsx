import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  contentLength: number;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  title,
  contentLength,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100">
        {/* 헤더 - 그라데이션 배경 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <h3 className="text-white text-lg font-bold">크롤링 성공!</h3>
              <p className="text-emerald-100 text-sm">블로그 글을 성공적으로 가져왔습니다</p>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6 space-y-4">
          {/* 제목 정보 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-sm">📝</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">저장된 제목</p>
                <p className="text-gray-900 font-medium leading-relaxed">{title}</p>
              </div>
            </div>
          </div>

          {/* 통계 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <div className="text-purple-600 text-sm font-medium mb-1">글자수</div>
              <div className="text-purple-900 text-xl font-bold">{contentLength.toLocaleString()}</div>
              <div className="text-purple-500 text-xs">글자</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div className="text-green-600 text-sm font-medium mb-1">상태</div>
              <div className="text-green-900 text-lg font-bold">✓ 완료</div>
              <div className="text-green-500 text-xs">저장됨</div>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 text-sm mt-0.5">💡</span>
              <div className="flex-1 text-sm text-blue-700">
                <p className="font-medium mb-1">자동으로 말투 문서에 추가되었습니다</p>
                <p className="text-blue-600">이제 AI 글 생성 시 이 말투를 참고하여 작성됩니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;