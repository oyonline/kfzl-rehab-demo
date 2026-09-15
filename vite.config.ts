import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Vite 默认不读 PORT 环境变量，只认 --port 或这里的配置。
    // 显式接上 PORT，调用方（预览工具、容器）分配端口时才能生效；
    // KFZL 固定用 5175，与“工作站_养老”的 5174 分开。
    port: process.env.PORT ? Number(process.env.PORT) : 5175,
    // 开发时前端在 Vite，接口在 Express，两个端口。代理过去才是同源，
    // 否则 /api/auth/login 会打到 Vite 上返回 index.html。
    // KFZL 后端固定用 5100，养老项目继续使用 5099。
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT ?? 5100}`,
        changeOrigin: true,
      },
    },
  },
})
