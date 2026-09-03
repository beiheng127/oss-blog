# 上游基线记录（Baseline）

## 固定版本

| 项目 | 仓库 | 固定版本 | Commit | License |
|------|------|----------|--------|---------|
| Ghost（核心/运行时） | https://github.com/TryGhost/Ghost | `v6.62.0` | `d4fbd04045` | MIT |
| Casper（主题基底） | https://github.com/TryGhost/Casper | `v5.12.3` | 见子模块 | MIT |
| RealWorld（业务规范参考） | https://github.com/realworld-apps/realworld | 仅作规范阅读 | — | 逐项核对 |

## 环境版本

- Node.js：`22.23.1`（`engines: ^22.23.1 || ^24.20.0`）
- Ghost CLI：`1.32.3`
- 包管理器：`pnpm 12.2.1`（Ghost 源码）/ `npm`（主题构建）
- 安装日期：2026-09-03
- 运行目录：`runtime/`（`ghost install local`，不提交 Git）

## 基线功能清单（改动前验证）

- [x] 前台首页 + `/ghost` 管理端可访问
- [x] 发布一篇文章、添加标签
- [x] 创建会员账号
- [x] 启用评论、登录后评论
- [x] `ghost stop` / `ghost start` 重启验证通过

## 选型理由

- **Ghost 路线**：具备成熟编辑器、标签、会员、评论、主题机制，可把精力集中在阅读、配置与扩展，不必从零实现认证与存储。
- **非 RealWorld 实现路线**：RealWorld 是 API/E2E 规范仓库而非单一可运行应用，适合做规范对照，不适合作为本地博客成品基线。
