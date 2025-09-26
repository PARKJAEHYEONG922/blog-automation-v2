export interface ImagePrompt {
  index: number;
  position: string;
  context: string;
  prompt: string;
}

export interface ImagePromptResult {
  success: boolean;
  imagePrompts?: ImagePrompt[];
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class BlogWritingService {
  /**
   * 이미지 프롬프트 생성용 요청 생성
   */
  private static generateImagePromptRequest(blogContent: string, expectedImageCount: number): string {
    const prompt = `다음 블로그 글에서 (이미지) 태그들을 찾아서 각각에 맞는 이미지 생성 프롬프트를 만들어주세요:

=== 블로그 글 내용 ===
${blogContent}
=== 글 내용 끝 ===

⚠️ 중요: 이 글에는 정확히 ${expectedImageCount}개의 (이미지) 태그가 있습니다. 반드시 ${expectedImageCount}개의 이미지 프롬프트를 생성해주세요.

## 이미지 생성 규칙 이해
- (이미지) 태그는 글 내용 설명이 끝난 후에 배치됨
- 이미지는 바로 위에 작성된 글 내용을 시각적으로 보완하는 역할
- 이미지 위쪽에 있는 글 내용을 분석하여 해당 내용에 맞는 이미지 프롬프트 작성

각 (이미지) 태그의 상단에 위치한 글 내용을 분석하여 그 내용을 시각적으로 표현할 수 있는 영어 프롬프트를 작성해주세요.

반드시 다음 JSON 형식으로만 출력하세요 (다른 설명이나 텍스트 없이):
` + '```json' + `
{
  "imagePrompts": [
    {
      "index": 1,
      "position": "이미지가 들어갈 위치의 문맥 설명",
      "context": "해당 이미지 주변 글 내용 요약",
      "prompt": "영어로 된 이미지 생성 프롬프트"
    }
  ]
}
` + '```' + `

프롬프트 작성 지침:
- 영어로 작성
- 구체적이고 시각적인 묘사
- (이미지) 위쪽 글 내용과 직접적 연관성 유지
- 글에서 설명한 내용을 시각적으로 보여주는 이미지
- 한국적 요소가 필요한 경우 "Korean style" 등으로 명시
- 음식/요리 관련시 "Korean food photography style" 추가

🚨 중요: 한국어 텍스트 방지 규칙 🚨
- "no Korean text", "no Korean characters", "avoid Korean writing" 반드시 포함
- 간단한 영어는 허용: "simple English labels OK (dog, cat, small, big, step 1, 15g etc.)"
- 비교/구분이 필요한 경우: "use simple English words or symbols like O, X, checkmarks"
- 단계/순서 표시: "use numbers 1,2,3 or simple English instead of Korean text"
- 올바름/틀림 표시: "show with O and X symbols or simple English, no Korean characters"
- 한국어만 금지하고 간단한 영어는 허용: "minimal English text allowed, Korean text forbidden"

⚠️ 다시 한 번 강조: 반드시 정확히 ${expectedImageCount}개의 이미지 프롬프트를 생성해야 합니다. 개수가 맞지 않으면 오류가 발생합니다.`;
    
    return prompt;
  }

  /**
   * 이미지 프롬프트 생성
   */
  static async generateImagePrompts(blogContent: string): Promise<ImagePromptResult> {
    try {
      console.log('🎨 이미지 프롬프트 생성 시작');

      // 🔥 무조건 실패 처리 (테스트용)
      console.log('⚠️ 테스트를 위해 이미지 프롬프트 생성을 무조건 실패로 처리합니다.');
      
      // 블로그 글에서 (이미지) 태그 개수 정확히 계산
      const imageMatches = blogContent.match(/\(이미지\)|\[이미지\]/g);
      const expectedImageCount = imageMatches ? imageMatches.length : 0;
      
      console.log(`📊 예상 이미지 개수: ${expectedImageCount}개`);
      
      if (expectedImageCount === 0) {
        console.log('⚠️ 이미지 태그가 없어 이미지 프롬프트 생성을 건너뜁니다.');
        return {
          success: true,
          imagePrompts: [],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };
      }

      // 🔥 무조건 실패 반환
      throw new Error('테스트용: 이미지 프롬프트 생성 강제 실패');

      const maxRetries = 3;
      let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 이미지 프롬프트 생성 시도 ${attempt}/${maxRetries}`);
        
        const prompt = this.generateImagePromptRequest(blogContent, expectedImageCount);

        console.log('📝 이미지 프롬프트 요청 생성 완료');

        // IPC 통신으로 제목 생성 API 활용 (시스템 프롬프트 없이 사용)
        const response = await window.electronAPI.generateTitles({
          systemPrompt: '',
          userPrompt: prompt
        });

        if (!response.success) {
          console.warn(`⚠️ 시도 ${attempt}: API 호출 실패 - ${response.error}`);
          if (attempt === maxRetries) {
            throw new Error(response.error || 'API 호출에 실패했습니다.');
          }
          continue;
        }

        // generateTitles API는 content를 반환함
        const responseContent = response.content || '';
        
        if (!responseContent || responseContent.trim().length === 0) {
          console.warn(`⚠️ 시도 ${attempt}: AI가 빈 응답을 반환했습니다.`);
          if (attempt === maxRetries) {
            throw new Error('AI가 빈 응답을 반환했습니다.');
          }
          continue;
        }

        // JSON 파싱
        let imagePromptsData;
        try {
          const cleanedResponse = responseContent.trim();
          console.log('🔍 AI 원본 응답 (처음 200자):', cleanedResponse.substring(0, 200));
          
          // 마크다운 코드 블록 제거
          let jsonContent = cleanedResponse;
          
          // 다양한 형식의 코드 블록 제거
          if (cleanedResponse.includes('```')) {
            jsonContent = cleanedResponse.replace(/```[a-zA-Z]*\n?/g, '').replace(/\n?```/g, '').trim();
          }
          
          // JSON 추출 시도
          const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = jsonMatch[0];
          }
          
          // 배열로 시작하는 경우 처리
          const arrayMatch = jsonContent.match(/\[[\s\S]*\]/);
          if (!jsonMatch && arrayMatch) {
            jsonContent = `{"imagePrompts": ${arrayMatch[0]}}`;
          }
          
          imagePromptsData = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error(`❌ 시도 ${attempt}: JSON 파싱 실패:`, parseError);
          
          // 대체 파싱 시도
          try {
            console.log('🔄 대체 파싱 시도...');
            const prompts: ImagePrompt[] = [];
            
            const promptRegex = /["']prompt["']\s*:\s*["']([^"']+)["']/g;
            let match;
            let index = 1;
            
            while ((match = promptRegex.exec(responseContent)) !== null) {
              prompts.push({
                index: index,
                position: `이미지 ${index}`,
                context: `이미지 ${index} 관련 내용`,
                prompt: match[1]
              });
              index++;
            }
            
            if (prompts.length > 0) {
              console.log(`✅ 대체 파싱으로 ${prompts.length}개 프롬프트 추출`);
              imagePromptsData = { imagePrompts: prompts };
            } else {
              throw new Error('파싱 불가능');
            }
          } catch (altError) {
            console.warn(`⚠️ 시도 ${attempt}: 대체 파싱도 실패`);
            if (attempt === maxRetries) {
              throw new Error('AI 응답을 파싱할 수 없습니다.');
            }
            continue;
          }
        }

        const imagePrompts = imagePromptsData.imagePrompts || [];
        
        console.log(`📊 시도 ${attempt}: 생성된 프롬프트 개수 - 예상: ${expectedImageCount}개, 실제: ${imagePrompts.length}개`);

        // 개수 검증
        if (imagePrompts.length === expectedImageCount) {
          console.log('✅ 이미지 프롬프트 생성 성공 - 개수 일치!');
          console.log('📊 총 토큰 사용량:', totalUsage);
          
          return {
            success: true,
            imagePrompts,
            usage: totalUsage
          };
        } else {
          console.warn(`⚠️ 시도 ${attempt}: 개수 불일치 - 예상: ${expectedImageCount}개, 실제: ${imagePrompts.length}개`);
          
          if (attempt === maxRetries) {
            // 최종 시도에서도 실패한 경우, 부족한 프롬프트는 기본값으로 채우기
            const finalPrompts = [...imagePrompts];
            
            while (finalPrompts.length < expectedImageCount) {
              finalPrompts.push({
                index: finalPrompts.length + 1,
                position: `이미지 ${finalPrompts.length + 1}`,
                context: '추가 이미지 위치',
                prompt: 'professional, clean, informative illustration related to the blog content'
              });
            }
            
            // 개수가 초과된 경우 자르기
            if (finalPrompts.length > expectedImageCount) {
              finalPrompts.splice(expectedImageCount);
            }
            
            console.log(`🔧 개수 보정 완료: ${finalPrompts.length}개`);
            
            return {
              success: true,
              imagePrompts: finalPrompts,
              usage: totalUsage
            };
          }
          
          // 다음 시도를 위해 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      throw new Error('최대 재시도 횟수를 초과했습니다.');

    } catch (error) {
      console.error('❌ 이미지 프롬프트 생성 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }
}