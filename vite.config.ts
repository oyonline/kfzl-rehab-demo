import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite 默认不读 PORT 环境变量，只认 --port 或这里的配置。
    // 显式接上 PORT，调用方（预览工具、容器）分配端口时才能生效；
    // 未设置时留空，回落 Vite 默认的 5173，`pnpm dev` 行为不变。
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    // 开发时前端在 Vite，接口在 Express，两个端口。代理过去才是同源，
    // 否则 /api/auth/login 会打到 Vite 上返回 index.html。
    // 默认 5099 而非 5000 —— macOS 的 AirPlay 接收器占着 5000。
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT ?? 5099}`,
        changeOrigin: true,
      },
    },
  },
})
