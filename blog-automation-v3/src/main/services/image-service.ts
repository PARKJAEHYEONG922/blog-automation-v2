export class ImageService {
  private apiKey: string = process.env.CLAUDE_API_KEY || '';

  async generateImagePrompts(content: string, imageCount: number): Promise<{ prompts: string[] }> {
    try {
      // Claude API를 사용해서 이미지 프롬프트 생성
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `다음 블로그 글 내용을 보고 ${imageCount}개의 이미지 프롬프트를 생성해주세요. 
            각 프롬프트는 글의 내용과 관련되고 블로그에 어울리는 이미지여야 합니다.
            
            글 내용:
            ${content}
            
            응답 형식: 각 줄에 하나씩 프롬프트만 작성해주세요.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      const promptText = data.content[0].text;
      const prompts = promptText.split('\n').filter((line: string) => line.trim().length > 0);

      return { prompts: prompts.slice(0, imageCount) };

    } catch (error) {
      console.error('이미지 프롬프트 생성 실패:', error);
      
      // 기본 프롬프트 반환 (fallback)
      const fallbackPrompts = Array.from({ length: imageCount }, (_, i) => 
        `블로그 글과 관련된 일러스트 이미지 ${i + 1}`
      );
      
      return { prompts: fallbackPrompts };
    }
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      console.log(`이미지 생성 시작 - IPC 통신 사용`);
      console.log(`프롬프트: ${prompt.substring(0, 100)}...`);

      // IPC 통신으로 main process의 이미지 생성 호출
      const imageUrl = await window.electronAPI.generateImage(prompt);

      console.log(`이미지 생성 완료: ${imageUrl}`);
      return imageUrl;

    } catch (error) {
      console.error('이미지 생성 실패:', error);
      
      // 실패한 경우 에러 메시지와 함께 placeholder 반환
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      return `https://via.placeholder.com/400x300/ff6b6b/ffffff?text=${encodeURIComponent(errorMsg.substring(0, 30))}`;
    }
  }
}