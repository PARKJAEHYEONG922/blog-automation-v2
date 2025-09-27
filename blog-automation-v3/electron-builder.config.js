module.exports = {
  appId: "com.blog.automation.v3",
  productName: "블로그 자동화 v3",
  directories: {
    output: "release"
  },
  files: [
    "dist/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico"
  },
  publish: {
    provider: "github",
    owner: "PARKJAEHYEONG922",
    repo: "blog-automation-v2"
  },
  // 코드 서명 완전 비활성화
  forceCodeSigning: false,

  // NSIS 설정
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },

  // 추가 환경 변수
  extraMetadata: {
    main: "dist/main.js"
  }
};