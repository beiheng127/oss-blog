# 项目结构与架构说明（Architecture）

## 请求路径（从主题到内容服务再到数据库）

```
浏览器请求
   │
   ▼
自定义主题 oss-blog-theme（default.hbs / index.hbs / post.hbs / partials/）
   │  通过 {{#get}}、{{#post}}、{{navigation}} 等主题助手
   ▼
Ghost 内容与会员服务（ghost/core：认证、内容、标签、会员、评论、搜索）
   │
   ▼
SQLite 内容库（runtime/content/data/ghost.db）
```

## 关键目录

| 目录 | 作用 | 允许修改 |
|------|------|----------|
| `theme/oss-blog-theme/` | 自定义主题源码（模板 + 样式 + 构建脚本） | ✅ 主要修改边界 |
| `docs/` | 基线、架构、测试文档 | ✅ |
| `tests/` | 验收测试记录 | ✅ |
| `runtime/` | Ghost 运行时（`ghost install local` 生成） | ❌ 不提交、不修改 |
| `ghost/core/` | Ghost 核心源码（上游基线，位于 `../Ghost`） | ❌ 禁止修改 |

## 修改边界原则

1. **只改主题层**：导航、卡片、详情元数据、相关推荐都落在 `theme/oss-blog-theme/`。
2. **不重写基础能力**：认证、编辑器、数据库迁移、后台管理全部复用 Ghost 上游。
3. **运行数据与源代码分离**：数据库、日志、密钥、上传图片一律不进 Git。
4. **可升级**：因为不碰核心，Ghost 升级时主题仍可独立维护与回滚。

## 自主功能的数据流

```
post.hbs（文章详情）
   └── {{#if primary_tag}}
          {{#get "posts" filter="tag:{{primary_tag.slug}}+id:-{{id}}" limit="3"}}
              → 相关推荐面板（展示每篇阅读时长）
```
