import { useState, useCallback } from 'react';
import { ImagePrompt, ImageGenerationOptions } from '../types/generation.types';

export const useImageGeneration = () => {
  const [imagePrompts, setImagePrompts] = useState<ImagePrompt[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  const generateImagePrompts = useCallback(async (content: string, imageCount: number) => {
    setIsGeneratingPrompts(true);
    try {
      const response = await window.electronAPI.generateImagePrompts({ content, imageCount });
      
      if (response.success && response.prompts) {
        const prompts: ImagePrompt[] = response.prompts.map((prompt: string, index: number) => ({
          id: `prompt-${index}-${Date.now()}`,
          prompt,
          isGenerating: false
        }));
        
        setImagePrompts(prompts);
        return { success: true, prompts };
      } else {
        throw new Error((response as any).error || '이미지 프롬프트 생성 실패');
      }
    } catch (error) {
      console.error('이미지 프롬프트 생성 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      };
    } finally {
      setIsGeneratingPrompts(false);
    }
  }, []);

  const generateSingleImage = useCallback(async (promptId: string, options?: ImageGenerationOptions) => {
    const prompt = imagePrompts.find(p => p.id === promptId);
    if (!prompt) return;

    // 생성 중 상태로 변경
    setImagePrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, isGenerating: true, error: undefined } : p
    ));

    try {
      const imageUrl = await window.electronAPI.generateImage(prompt.prompt);
      
      // 성공 시 이미지 URL 업데이트
      setImagePrompts(prev => prev.map(p => 
        p.id === promptId ? { ...p, imageUrl, isGenerating: false } : p
      ));

      return { success: true, imageUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이미지 생성 실패';
      
      // 실패 시 에러 상태 업데이트
      setImagePrompts(prev => prev.map(p => 
        p.id === promptId ? { ...p, error: errorMessage, isGenerating: false } : p
      ));

      return { success: false, error: errorMessage };
    }
  }, [imagePrompts]);

  const generateAllImages = useCallback(async (options?: ImageGenerationOptions) => {
    const results = await Promise.allSettled(
      imagePrompts.map(prompt => generateSingleImage(prompt.id, options))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value?.success
    ).length;

    return {
      total: imagePrompts.length,
      successful,
      failed: imagePrompts.length - successful
    };
  }, [imagePrompts, generateSingleImage]);

  const updatePrompt = useCallback((promptId: string, newPrompt: string) => {
    setImagePrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, prompt: newPrompt } : p
    ));
  }, []);

  const removePrompt = useCallback((promptId: string) => {
    setImagePrompts(prev => prev.filter(p => p.id !== promptId));
  }, []);

  const clearAllPrompts = useCallback(() => {
    setImagePrompts([]);
  }, []);

  return {
    imagePrompts,
    isGeneratingPrompts,
    generateImagePrompts,
    generateSingleImage,
    generateAllImages,
    updatePrompt,
    removePrompt,
    clearAllPrompts
  };
};