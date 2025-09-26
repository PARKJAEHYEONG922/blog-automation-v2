"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeWebService = void 0;
const playwright_1 = require("playwright");
class ClaudeWebService {
    constructor() {
        this.browser = null;
        this.page = null;
    }
    async openBrowser() {
        try {
            // 기존 크롬 브라우저 연결 (로그인된 상태)
            this.browser = await playwright_1.chromium.connectOverCDP('http://localhost:9222');
            // 만약 CDP 연결 실패하면 새 브라우저 실행
            if (!this.browser) {
                this.browser = await playwright_1.chromium.launch({
                    headless: false,
                    args: [
                        '--remote-debugging-port=9222',
                        '--no-sandbox',
                        '--disable-setuid-sandbox'
                    ]
                });
            }
            this.page = await this.browser.newPage();
            await this.page.goto('https://claude.ai/new');
            // 로그인 대기
            await this.page.waitForSelector('textarea[placeholder*="메시지"]', { timeout: 60000 });
        }
        catch (error) {
            console.error('클로드 웹 브라우저 열기 실패:', error);
            throw error;
        }
    }
    async sendPrompt(prompt) {
        if (!this.page) {
            throw new Error('브라우저가 열려있지 않습니다.');
        }
        try {
            // 메시지 입력창 찾기
            const textarea = await this.page.waitForSelector('textarea[placeholder*="메시지"]');
            // 프롬프트 입력
            await textarea.fill(prompt);
            // 전송 버튼 클릭
            const sendButton = await this.page.waitForSelector('button[aria-label*="전송"], button[aria-label*="Send"]');
            await sendButton.click();
        }
        catch (error) {
            console.error('프롬프트 전송 실패:', error);
            throw error;
        }
    }
    async waitForResponse() {
        if (!this.page) {
            throw new Error('브라우저가 열려있지 않습니다.');
        }
        try {
            // AI 응답 완료 대기 (로딩 인디케이터가 사라질 때까지)
            await this.page.waitForFunction(() => {
                const loadingElements = document.querySelectorAll('[data-testid="loading"], .loading, [class*="loading"]');
                return loadingElements.length === 0;
            }, { timeout: 300000 }); // 5분 대기
            // 추가로 2초 대기 (안전장치)
            await this.page.waitForTimeout(2000);
        }
        catch (error) {
            console.error('AI 응답 대기 실패:', error);
            throw error;
        }
    }
    async downloadContent() {
        if (!this.page) {
            throw new Error('브라우저가 열려있지 않습니다.');
        }
        try {
            // 다운로드 버튼 찾기 및 클릭
            const downloadButton = await this.page.waitForSelector('button[aria-label*="다운로드"], button[aria-label*="Download"]');
            // 다운로드 시작
            const [download] = await Promise.all([
                this.page.waitForEvent('download'),
                downloadButton.click()
            ]);
            // 다운로드 완료 대기 및 경로 얻기
            const path = await download.path();
            if (!path) {
                throw new Error('다운로드 파일 경로를 찾을 수 없습니다.');
            }
            // 파일 내용 읽기
            const fs = require('fs');
            const content = fs.readFileSync(path, 'utf-8');
            // 임시 파일 삭제
            fs.unlinkSync(path);
            return content;
        }
        catch (error) {
            console.error('콘텐츠 다운로드 실패:', error);
            throw error;
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
exports.ClaudeWebService = ClaudeWebService;
