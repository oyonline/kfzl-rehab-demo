import { defineConfig } from 'vitest/config'

/**
 * 冒烟测试配置 —— 只测服务端，不测组件。
 *
 * 目的不是覆盖率，是让「这个仓能不能跑、核心不变量还在不在」可被机器验证：
 * 迁移能否重入、密码与令牌是否可信、越权是否真的挡住、驳回是否真的停止下发。
 * 这几条一旦破，演示当场出事，而人工点页面不一定点得到。
 *
 * 每个测试文件在独立 worker 里跑，setup 给各自分配一个临时数据库，
 * 互不干扰，也绝不碰开发用的 data/app.db。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // better-sqlite3 是原生模块，多线程下重复加载会告警；用 forks 稳妥
    pool: 'forks',
  },
})
