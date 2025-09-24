// LLM 클라이언트 팩토리
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini' | 'runware';
  model: string;
  apiKey: string;
  style?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: any;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxIterations?: number;
}

export abstract class BaseLLMClient {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse>;
  abstract generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string>; // 이미지 URL 반환
}

export class OpenAIClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 OpenAI ${this.config.model} 텍스트 생성 시작 (${attempt}/${maxRetries})`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            temperature: 0.7,
            max_tokens: 2000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ OpenAI 응답 수신 완료`);
        
        return {
          content: data.choices[0]?.message?.content || '',
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
          }
        };
        
      } catch (error) {
        console.error(`OpenAI API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('OpenAI 텍스트 생성에 실패했습니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 OpenAI gpt-image-1 이미지 생성 시작 (${attempt}/${maxRetries})`);
        
        // OpenAI는 제한된 해상도만 지원
        const requestSize = options?.size || '1024x1024';
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: prompt,
            size: requestSize, // '1024x1024', '1024x1536', '1536x1024' 중 선택
            n: 1
            // gpt-image-1은 항상 base64로 반환하므로 response_format 불필요
            // quality 파라미터도 gpt-image-1에서는 지원하지 않음
          })
        });

        console.log(`📊 OpenAI 응답 상태: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OpenAI 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`OpenAI Image API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ OpenAI 응답 수신 완료`);
        
        // gpt-image-1은 base64 형태로 반환
        const base64Image = data.data?.[0]?.b64_json;
        if (base64Image) {
          return `data:image/png;base64,${base64Image}`;
        } else {
          console.error('OpenAI 응답 구조:', JSON.stringify(data, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error('OpenAI에서 이미지 데이터를 받지 못했습니다.');
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`OpenAI Image API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('OpenAI 이미지 생성에 실패했습니다.');
  }
}

export class ClaudeClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    try {
      const conversationMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.role === 'system' ? `System: ${msg.content}` : msg.content
      }));

      let finalResponse = '';
      const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      // 도구 호출이 완료될 때까지 반복 (최대 2번으로 제한)
      let iteration = 0;
      const maxIterations = 2;

      while (iteration < maxIterations) {
        const requestBody: any = {
          model: this.config.model,
          max_tokens: 6000,
          temperature: 0.7,
          messages: conversationMessages
        };

        // 도구가 제공된 경우 tools 파라미터 추가
        if (options?.tools && options.tools.length > 0) {
          requestBody.tools = options.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters
          }));
          requestBody.tool_choice = { type: "auto" };
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit에 걸린 경우 잠시 대기 후 재시도
            const retryAfter = response.headers.get('retry-after') || '5';
            console.log(`⏰ Rate limit 도달. ${retryAfter}초 후 재시도...`);
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
            continue; // 다시 시도
          }
          
          // 상세한 에러 정보 확인
          const errorBody = await response.text().catch(() => '');
          
          // 사용자 친화적인 에러 메시지 생성
          let errorMessage = '';
          switch (response.status) {
            case 400:
              // 400 에러는 잔액 부족일 수도 있고 요청 형식 문제일 수도 있음
              if (errorBody.includes('credit balance is too low') || errorBody.includes('insufficient') || errorBody.includes('balance')) {
                errorMessage = '💳 Claude API 잔액이 부족합니다. Anthropic 계정에서 크레딧을 충전해주세요.';
              } else {
                errorMessage = 'Claude API 요청 형식에 문제가 있습니다. 프롬프트가 너무 길거나 형식이 잘못되었을 수 있습니다.';
              }
              break;
            case 401:
              errorMessage = 'Claude API 키가 유효하지 않습니다. 설정에서 API 키를 확인해주세요.';
              break;
            case 402:
              errorMessage = '💳 Claude API 잔액이 부족합니다. Anthropic 계정에서 크레딧을 충전해주세요.';
              break;
            case 403:
              errorMessage = 'Claude API 접근이 거부되었습니다. API 키 권한을 확인해주세요.';
              break;
            case 404:
              errorMessage = '요청한 Claude 모델을 찾을 수 없습니다. 모델명을 확인해주세요.';
              break;
            case 422:
              errorMessage = 'Claude API 요청 매개변수가 올바르지 않습니다.';
              break;
            case 500:
              errorMessage = 'Claude API 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
              break;
            case 529:
              errorMessage = 'Claude API 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
              break;
            default:
              errorMessage = `Claude API 오류가 발생했습니다 (${response.status}). 잠시 후 다시 시도해주세요.`;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // 사용량 누적
        totalUsage.promptTokens += data.usage?.input_tokens || 0;
        totalUsage.completionTokens += data.usage?.output_tokens || 0;
        totalUsage.totalTokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

        // Assistant의 응답을 대화에 추가
        conversationMessages.push({
          role: 'assistant',
          content: data.content
        });

        // 도구 호출이 있는지 확인
        let hasToolUse = false;
        const toolResults: any[] = [];

        if (data.content && Array.isArray(data.content)) {
          for (const content of data.content) {
            if (content.type === 'tool_use') {
              hasToolUse = true;
              console.log(`🔧 Claude가 도구 호출: ${content.name}`, content.input);
              
              try {
                const toolResult = await this.executeTools(content.name, content.input);
                console.log(`📊 도구 실행 결과:`, toolResult);
                
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: content.id,
                  content: JSON.stringify(toolResult)
                });
              } catch (error) {
                console.error(`❌ 도구 실행 실패 (${content.name}):`, error);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: content.id,
                  content: `Error: ${error.message}`,
                  is_error: true
                });
              }
            } else if (content.type === 'text') {
              finalResponse += content.text;
            }
          }
        }

        // 도구 호출이 없으면 종료
        if (!hasToolUse) {
          break;
        }

        // 도구 결과를 대화에 추가
        if (toolResults.length > 0) {
          conversationMessages.push({
            role: 'user',
            content: toolResults.map(result => JSON.stringify(result)).join('\n\n')
          });
        }

        iteration++;
      }

      return {
        content: finalResponse,
        usage: totalUsage
      };
    } catch (error) {
      console.error('Claude API 호출 실패:', error);
      throw error;
    }
  }

  private async executeTools(toolName: string, input: any): Promise<any> {
    // 도구 실행 - MCP 제거됨, 직접 API 사용
    console.log(`도구 실행 요청: ${toolName}`);
    
    try {
      switch (toolName) {
        case 'naver_search_all':
        case 'naver_blog_search':
          // 네이버 관련 도구는 직접 API 사용
          console.log('네이버 도구는 직접 API로 처리됨');
          return { error: '네이버는 직접 API 사용' };
        case 'youtube_search':
          console.log('YouTube 검색 도구는 더 이상 지원되지 않음');
          return { error: 'YouTube 검색 기능 제거됨' };
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`도구 실행 실패 (${toolName}):`, error);
      return { error: error.message };
    }
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    throw new Error('Claude는 이미지 생성을 지원하지 않습니다.');
  }
}

export class GeminiClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini ${this.config.model} 텍스트 생성 시작 (${attempt}/${maxRetries})`);
        
        // 메시지를 Gemini 형식으로 변환
        let textContent = '';
        for (const message of messages) {
          if (message.role === 'system') {
            textContent += `System: ${message.content}\n\n`;
          } else if (message.role === 'user') {
            textContent += `User: ${message.content}`;
          }
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: textContent
                }]
              }],
              generationConfig: {
                maxOutputTokens: 8000,
                temperature: 0.7
              }
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ Gemini 응답 수신 완료`);
        
        return {
          content: data.candidates[0]?.content?.parts[0]?.text || '',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0
          }
        };
        
      } catch (error) {
        console.error(`Gemini API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Gemini 텍스트 생성에 실패했습니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🟡 Gemini 2.5 Flash Image 이미지 생성 시작 (${attempt}/${maxRetries})`);
        
        // Gemini 2.5 Flash Image Preview 모델 사용 (2025년 8월 출시)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt // 직접 프롬프트 사용 (Create an image: 접두어 불필요)
                }]
              }]
            })
          }
        );

        console.log(`📊 Gemini 응답 상태: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini 오류 응답 (${attempt}/${maxRetries}):`, errorText);
          
          if (attempt === maxRetries) {
            throw new Error(`Gemini Image API 오류: ${response.status} ${response.statusText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        console.log(`✅ Gemini 응답 수신 완료`);
        
        // Gemini 2.5 Flash Image의 실제 응답 구조에 따른 이미지 데이터 추출
        const parts = data.candidates?.[0]?.content?.parts;
        let imageData = null;
        
        if (parts && Array.isArray(parts)) {
          // parts 배열에서 inlineData가 있는 요소 찾기
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              break;
            }
          }
        }
        
        if (imageData) {
          console.log('✅ Gemini 이미지 데이터 추출 성공');
          // Base64 데이터를 data URL로 변환
          return `data:image/png;base64,${imageData}`;
        } else {
          console.error('Gemini 응답 구조:', JSON.stringify(data, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error('Gemini에서 이미지 데이터를 추출할 수 없습니다.');
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`Gemini Image API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Gemini 이미지 생성에 실패했습니다.');
  }
}

// Runware 스타일별 실제 모델 매핑
const runwareStyleModels = {
  'sdxl-base': {
    realistic: 'civitai:4201@130072', // Realistic Vision V6.0
    photographic: 'civitai:102438@133677', // SDXL Base (사진 특화)
    illustration: 'civitai:24149@144666', // Mistoon Anime (일러스트)
    anime: 'civitai:24149@144666', // Mistoon Anime
    dreamy: 'civitai:1125067@1250712' // CyberRealistic (몽환적)
  },
  'flux-base': {
    realistic: 'civitai:618692@691639', // FLUX.1 Schnell
    photographic: 'civitai:618692@691639', // FLUX.1 Schnell
    illustration: 'civitai:618692@691639', // FLUX.1 Schnell
    anime: 'civitai:618692@691639', // FLUX.1 Schnell
    dreamy: 'civitai:618692@691639' // FLUX.1 Schnell
  }
};

export class RunwareClient extends BaseLLMClient {
  async generateText(messages: LLMMessage[], options?: { tools?: LLMTool[] }): Promise<LLMResponse> {
    throw new Error('Runware는 텍스트 생성을 지원하지 않습니다. 이미지 생성 전용입니다.');
  }

  async generateImage(prompt: string, options?: { quality?: 'low' | 'medium' | 'high'; size?: '512x768' | '768x512' | '1024x1024' | '1024x1536' | '1536x1024' }): Promise<string> {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Runware 이미지 생성 시작 (${attempt}/${maxRetries}) - 프롬프트: ${prompt}`);
        
        // 해상도 옵션을 width, height로 변환
        let width = 1024;
        let height = 1024;
        
        if (options?.size) {
          const [w, h] = options.size.split('x').map(Number);
          width = w;
          height = h;
        }
        
        // 품질에 따른 steps 설정 (Runware는 steps로 품질 조절)
        let steps = 20; // 기본값
        if (options?.quality === 'low') steps = 10;
        else if (options?.quality === 'medium') steps = 15;
        else if (options?.quality === 'high') steps = 25;

        // 스타일에 따른 실제 모델 선택
        let actualModel = this.config.model;
        console.log(`🔍 Runware 설정 확인:`, {
          configModel: this.config.model,
          configStyle: this.config.style,
          availableStyleModels: Object.keys(runwareStyleModels)
        });
        
        if (this.config.style && runwareStyleModels[this.config.model as keyof typeof runwareStyleModels]) {
          const styleModels = runwareStyleModels[this.config.model as keyof typeof runwareStyleModels];
          actualModel = styleModels[this.config.style as keyof typeof styleModels] || this.config.model;
          console.log(`🎨 Runware 스타일 매핑: ${this.config.model} + ${this.config.style} → ${actualModel}`);
        } else {
          console.log(`⚠️ 스타일 매핑 실패 - 기본 모델 사용: ${actualModel}`);
        }

        // UUID 생성 (간단한 방법)
        const taskUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        const response = await fetch('https://api.runware.ai/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify([
            {
              taskType: 'imageInference',
              taskUUID: taskUUID,
              positivePrompt: prompt,
              width: width,
              height: height,
              model: actualModel, // 스타일에 따라 매핑된 실제 모델 사용
              numberResults: 1,
              steps: steps,
              CFGScale: 7,
              seed: Math.floor(Math.random() * 1000000)
            }
          ])
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Runware API 상세 오류 (${attempt}/${maxRetries}):`, errorText);
          console.error(`📝 요청 데이터:`, JSON.stringify({
            taskType: 'imageInference',
            taskUUID: taskUUID,
            positivePrompt: prompt,
            width: width,
            height: height,
            model: actualModel,
            numberResults: 1,
            steps: steps,
            CFGScale: 7,
            seed: Math.floor(Math.random() * 1000000)
          }, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error(`Runware API 오류: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          // 재시도 전 잠시 대기 (500ms * attempt)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const data = await response.json();
        
        // 응답에서 이미지 URL 추출
        if (data.data && data.data[0] && data.data[0].imageURL) {
          console.log(`✅ Runware 이미지 생성 완료: ${data.data[0].imageURL}`);
          return data.data[0].imageURL;
        } else {
          console.error('Runware 응답 구조:', JSON.stringify(data, null, 2));
          
          if (attempt === maxRetries) {
            throw new Error('Runware에서 이미지 URL을 추출할 수 없습니다.');
          }
          
          // 재시도 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`Runware API 호출 실패 (${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // 재시도 전 잠시 대기 (500ms * attempt)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    throw new Error('Runware 이미지 생성에 실패했습니다.');
  }
}

export class LLMClientFactory {
  private static informationClient: BaseLLMClient | null = null;
  private static writingClient: BaseLLMClient | null = null;
  private static imageClient: BaseLLMClient | null = null;
  private static isLoading = false; // 로딩 중 상태
  private static isLoaded = false; // 로드 완료 상태
  private static cachedSettings: any = null; // 설정 캐시
  private static cachedTestingStatus: any = null; // 테스트 상태 캐시

  static createClient(config: LLMConfig): BaseLLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'claude':
        return new ClaudeClient(config);
      case 'gemini':
        return new GeminiClient(config);
      case 'runware':
        return new RunwareClient(config);
      default:
        throw new Error(`지원되지 않는 LLM 공급업체: ${config.provider}`);
    }
  }

  static setInformationClient(config: LLMConfig): void {
    this.informationClient = this.createClient(config);
  }

  static setWritingClient(config: LLMConfig): void {
    this.writingClient = this.createClient(config);
  }

  static setImageClient(config: LLMConfig): void {
    this.imageClient = this.createClient(config);
  }

  static getInformationClient(): BaseLLMClient {
    if (!this.informationClient) {
      throw new Error('Information LLM client not configured');
    }
    return this.informationClient;
  }

  static getWritingClient(): BaseLLMClient {
    if (!this.writingClient) {
      throw new Error('Writing LLM client not configured');
    }
    return this.writingClient;
  }

  static getImageClient(): BaseLLMClient {
    if (!this.imageClient) {
      throw new Error('Image LLM client not configured');
    }
    return this.imageClient;
  }

  // 클라이언트 존재 여부 확인 메서드들
  static hasInformationClient(): boolean {
    return this.informationClient !== null;
  }

  static hasWritingClient(): boolean {
    return this.writingClient !== null;
  }

  static hasImageClient(): boolean {
    return this.imageClient !== null;
  }

  // 캐시된 설정 정보 반환 (API 호출 없음)
  static getCachedModelStatus(): { information: string; writing: string; image: string } {
    if (!this.isLoaded || !this.cachedSettings || !this.cachedTestingStatus) {
      return {
        information: '미설정',
        writing: '미설정',
        image: '미설정'
      };
    }

    const settings = this.cachedSettings;
    const testingStatus = this.cachedTestingStatus;

    return {
      information: this.hasInformationClient() && settings.information?.apiKey && testingStatus.information?.success 
        ? `${settings.information.provider} ${settings.information.model}` 
        : '미설정',
      writing: this.hasWritingClient() && settings.writing?.apiKey && testingStatus.writing?.success 
        ? `${settings.writing.provider} ${settings.writing.model}` 
        : '미설정',
      image: this.hasImageClient() && settings.image?.apiKey && testingStatus.image?.success 
        ? `${settings.image.provider} ${settings.image.model}` 
        : '미설정'
    };
  }

  // LLMSettings.tsx에서 사용할 캐시된 설정 데이터 반환
  static getCachedSettings(): { settings: any; testingStatus: any } | null {
    if (!this.isLoaded || !this.cachedSettings || !this.cachedTestingStatus) {
      return null;
    }
    return {
      settings: this.cachedSettings,
      testingStatus: this.cachedTestingStatus
    };
  }

  // 캐시된 설정 업데이트 (자연스러운 방식)
  static updateCachedSettings(settings: any, testingStatus: any): void {
    this.cachedSettings = settings;
    this.cachedTestingStatus = testingStatus;
    
    // 클라이언트도 업데이트
    if (settings.information?.apiKey) {
      this.setInformationClient(settings.information);
    }
    if (settings.writing?.apiKey) {
      this.setWritingClient(settings.writing);
    }
    if (settings.image?.apiKey) {
      this.setImageClient(settings.image);
    }
  }

  // 이미지 설정 업데이트 (Step3에서 사용)
  static updateImageSetting(key: 'quality' | 'size' | 'style', value: string): void {
    if (!this.cachedSettings) return;
    
    // 캐시된 설정 업데이트
    if (!this.cachedSettings.image) {
      this.cachedSettings.image = {};
    }
    this.cachedSettings.image[key] = value;
    
    // 실제 설정 파일에도 저장 (올바른 구조로)
    if ((window as any).electronAPI && typeof (window as any).electronAPI.saveSettings === 'function') {
      (window as any).electronAPI.saveSettings({
        settings: this.cachedSettings,
        testingStatus: this.cachedTestingStatus
      });
    }
  }

  // 기본 설정 로드 (싱글톤 패턴으로 중복 방지)
  static async loadDefaultSettings(): Promise<void> {
    // 이미 로드되었으면 스킵
    if (this.isLoaded) {
      return;
    }
    
    // 로딩 중이면 대기
    if (this.isLoading) {
      console.log('⏭️ LLM 설정 로딩 중, 대기...');
      return;
    }

    // 로딩 시작
    this.isLoading = true;

    try {
      console.log('🔄 LLM 설정 로드 시작');
      
      // Electron API가 있는지 확인
      if (!(window as any).electronAPI || typeof (window as any).electronAPI.loadSettings !== 'function') {
        console.warn('Electron API를 사용할 수 없어 기본값을 사용합니다.');
        this.loadDefaultSettingsFromLocalStorage();
        this.isLoaded = true;
        this.isLoading = false;
        return;
      }

      // Electron API를 통해 설정 로드
      const savedData = await (window as any).electronAPI.loadSettings();
      console.log('✅ 저장된 LLM 설정 로드됨:', savedData);
      
      if (savedData) {
        // 새로운 구조: 직접 설정들이 들어있음
        const settings = savedData.settings || savedData; // 구 버전 호환성 유지
        const testingStatus = savedData.testingStatus || {
          information: { success: true },
          writing: { success: true },
          image: { success: true }
        };
        
        // 설정과 테스트 상태 캐시
        this.cachedSettings = settings;
        this.cachedTestingStatus = testingStatus;
        
        console.log('파싱된 설정:', settings);
        console.log('테스트 상태:', testingStatus);
        
        // API 키가 있는 설정 적용 (테스트 성공 여부 무시하고 일단 적용)
        if (settings.information?.apiKey) {
          console.log('정보요약 AI 설정 로드:', settings.information);
          console.log('정보요약 AI 테스트 상태:', testingStatus.information);
          this.setInformationClient(settings.information);
        } else {
          console.warn('정보요약 AI 설정이 없습니다:', settings.information);
        }
        
        if (settings.writing?.apiKey) {
          console.log('글쓰기 AI 설정 로드:', settings.writing);
          console.log('글쓰기 AI 테스트 상태:', testingStatus.writing);
          this.setWritingClient(settings.writing);
        } else {
          console.warn('글쓰기 AI 설정이 없습니다:', settings.writing);
        }
        
        if (settings.image?.apiKey) {
          console.log('이미지 AI 설정 로드:', settings.image);
          console.log('이미지 AI 테스트 상태:', testingStatus.image);
          this.setImageClient(settings.image);
        } else {
          console.warn('이미지 AI 설정이 없습니다:', settings.image);
        }
        
        console.log('🎉 LLM 설정 로드 완료');
      } else {
        console.log('저장된 설정이 없어 기본값을 사용합니다.');
        this.loadDefaultValues();
      }
      
      // 로딩 완료
      this.isLoaded = true;
      this.isLoading = false;
    } catch (error) {
      console.error('❌ LLM 설정 로드 실패:', error);
      this.loadDefaultValues();
      this.isLoaded = true;
      this.isLoading = false;
    }
  }

  // localStorage에서 설정 로드 (웹 환경용 백업)
  private static loadDefaultSettingsFromLocalStorage(): void {
    try {
      const savedSettings = localStorage.getItem('llm-settings');
      console.log('localStorage에서 LLM 설정 로드:', savedSettings);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('파싱된 설정:', settings);
        
        if (settings.information?.apiKey) {
          console.log('정보요약 AI 설정 로드:', settings.information);
          this.setInformationClient(settings.information);
        }
        if (settings.writing?.apiKey) {
          this.setWritingClient(settings.writing);
        }
        if (settings.image?.apiKey) {
          this.setImageClient(settings.image);
        }
      } else {
        this.loadDefaultValues();
      }
    } catch (error) {
      console.error('localStorage LLM 설정 로드 실패:', error);
      this.loadDefaultValues();
    }
  }

  // 기본값 설정
  private static loadDefaultValues(): void {
    console.log('기본값 설정을 로드합니다.');
    // 기본값은 설정하지 않음 - 사용자가 직접 설정해야 함
    // 필요시 아래 주석을 해제하여 기본값 설정 가능
    /*
    this.setInformationClient({
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: 'demo'
    });
    this.setWritingClient({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: 'demo'
    });
    this.setImageClient({
      provider: 'gemini',
      model: 'gemini-2.5-flash-image',
      apiKey: 'demo'
    });
    */
  }

  /**
   * 정보처리 AI 연결 상태 확인 (설정 + 테스트 상태 포함)
   */
  static isInformationClientAvailable(): boolean {
    // 1. 클라이언트가 설정되어 있는지 확인
    if (!this.hasInformationClient()) {
      return false;
    }
    
    // 2. 캐시된 설정과 테스트 상태 확인
    if (!this.isLoaded || !this.cachedSettings || !this.cachedTestingStatus) {
      return false;
    }
    
    // 3. API 키가 있고 테스트가 성공했는지 확인
    const settings = this.cachedSettings;
    const testingStatus = this.cachedTestingStatus;
    
    return !!(settings.information?.apiKey && testingStatus.information?.success);
  }

  /**
   * 현재 설정된 정보처리 AI 정보 반환
   */
  static getInformationClientInfo(): string {
    const modelStatus = this.getCachedModelStatus();
    return modelStatus.information || '미설정';
  }
}