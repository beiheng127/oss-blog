# OSS Blog — 开源个人博客系统二次开发

基于 [Ghost](https://github.com/TryGhost/Ghost) 做的一次二次开发，目标很简单：做出一个**能注册、能写文章、能评论、能搜索**的个人博客，并且在外观和功能上有我自己能认出来的东西，而不是换个 Ghost 默认主题就交差。这是《开源软件与新技术》实验 01 的交付。

Ghost 本身已经把这些能力都做齐了（账号、编辑器、内容存储、会员、评论），所以我把力气都花在**自定义主题层**上，外加两个自主功能——**按标签 + 阅读时长生成"相关推荐"**、**代码块一键复制 + 返回顶部**。核心代码一行没动，只在主题上动刀，这样上游一升级我还能跟得上。

---


## 一、项目结构（每个文件夹是干嘛的）

```
oss-blog/
├── theme/oss-blog-theme/   ← ★ 二次开发的核心，你改的所有代码都在这
│   ├── default.hbs          全局骨架：导航、页脚、进度条、脚本引入
│   ├── post.hbs             文章详情页：标签chips、相关推荐
│   ├── author.hbs           作者主页：封面、头像、统计、社交、订阅
│   ├── index.hbs            首页（文章列表）
│   ├── partials/post-card.hbs  文章卡片（作者名、阅读时长徽章）
│   ├── assets/css/          样式源码（oss-blog.css、oss-enhance.css）
│   ├── assets/js/           脚本（oss-enhance.js：复制按钮、返回顶部）
│   ├── assets/built/        gulp 编译产物（勿手改，会被覆盖）
│   ├── locales/             多语言文件（zh.json 里有相关推荐翻译）
│   └── locales-local/       翻译的工作目录（gulp 合并用）
├── runtime/                 ← Ghost 运行环境（安装的 Ghost 6.59.0）
│   ├── content/themes/      ← ★ 激活的主题放这（Ghost 实际读的是这里）
│   ├── content/data/        ← ★ SQLite 数据库文件在这
│   ├── versions/6.59.0/     Ghost 源码 + node_modules
│   ├── current → versions/6.59.0  版本切换用的链接
│   └── config.development.json    端口、数据库等配置
├── docs/                    架构文档、基线记录、演示内容清单
├── tests/acceptance.md      验收测试用例
├── start-ghost.bat          ★ 一键启动（双击即可）
├── stop-ghost.bat           ★ 一键停止
└── NOTICE.md                上游版权声明
```

**关键认知**：`theme/oss-blog-theme/` 是你的**源码**（改这里），`runtime/content/themes/oss-blog-theme/` 是 Ghost **实际运行的副本**（改完源码要同步过来）。

---

## 二、数据库说明

**有数据库，用的是 SQLite**——一个单文件的嵌入式数据库，不需要装 MySQL，本地开发最省事。

| 项目   | 值                                                 |
| ---- | ------------------------------------------------- |
| 类型   | SQLite（通过 better-sqlite3 驱动）                      |
| 文件位置 | `runtime/content/data/ghost-local.db`（当前约 1.4MB）  |
| 表数量  | 93 张                                              |
| 配置位置 | `runtime/config.development.json` 的 `database` 字段 |

**核心表**（跟实验要求的功能一一对应）：

| 表                            | 干什么的          | 对应实验功能              |
| ---------------------------- | ------------- | ------------------- |
| `users`                      | 博主/管理员账号      | 可注册、可登录             |
| `members`                    | 前台订阅会员        | 访客注册会员              |
| `posts`                      | 文章            | 可写作                 |
| `posts_meta`                 | 文章扩展字段（阅读时间等） | 阅读时长展示              |
| `tags` / `posts_tags`        | 标签 + 文章标签关联   | 按标签浏览、**相关推荐的匹配依据** |
| `comments` / `comment_likes` | 评论 + 点赞       | 可评论                 |
| `actions`                    | 会员行为记录（浏览等）   | —                   |
| `roles` / `roles_users`      | 权限体系（10种角色）   | 权限控制                |
| `settings`                   | 站点设置（123项）    | —                   |

**备份/恢复**：管理端 Settings → Labs → Export 导出 JSON（含全部内容），Import 上传即可恢复。或者直接复制 `ghost-local.db` 文件也行（停机状态下）。


### 模拟数据 & 邮件配置

这部分不是"功能"，而是为了让博客建起来立刻有内容、能演示注册登录而做的一次性准备，都已落库。

**① 注入的模拟数据**

- 作者账号 3 个（密码 `ghost123`）：李亚恒、张一鸣、王思远
- 标签 4 个：技术（`tech`）、生活（`life`）、开源（`open-source`）、News（`news`，Ghost 默认自带）
- 文章 8 篇，每篇指定 1 个主标签 + 1 个作者，用于触发"相关推荐"（同主标签匹配）

> 如果想自己重建这批数据，用 Ghost 后台逐篇发文章打标签即可；这批是脚本直接写库生成的（含 `lexical` 编辑器内容 + 渲染 `html`），所以前台能正常显示。

**② 邮件 / 注册登录配置（`runtime/config.development.json` 的 `mail` 段）**

Ghost 的会员注册/登录用的是"邮箱魔法链接"（发一封带验证链接的邮件给你）。本项目**当前已配好真实 QQ SMTP**，验证邮件**真发到你的真实邮箱**（默认收件人 `ruia36791@163.com`）：

```json
"mail": {
  "transport": "SMTP",
  "from": "Ghost Blog <934705339@qq.com>",
  "options": {
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true,
    "auth": {
      "user": "934705339@qq.com",
      "pass": "你的QQ邮箱SMTP授权码(16位)"
    }
  }
}
```

**关键点**：
- `pass` 是 **QQ 邮箱 SMTP 授权码**（16 位字符串，**不是登录密码**）。在 `mail.qq.com` 网页版 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 → 开启"IMAP/SMTP服务" → 生成授权码。
- 端口 465 用 SSL，所以 `secure: true`。QQ 不接受 25 端口，必须用 465 或 587。
- `from` 与 `auth.user` 必须一致（QQ 会拒绝"发件人假冒"）。
- 网络：本机到 `smtp.qq.com:465` 直连通畅，不需要代理。
- **`config.development.json` 整个 `runtime/` 目录都已被 `.gitignore` 忽略，不会被推到 GitHub。**
- **登录流程**：前台点"注册/登录" → 填邮箱 → 去**自己的真实邮箱**（163/QQ/任意）收件箱找邮件 → 点邮件里的链接 → 完成登录。
- **管理员后台登录不需要邮件**，`/ghost` 登录和内容管理照常；只有"前台访客注册成会员"才依赖这个 SMTP。

**已验证链路**（2026-09-06 实测）：Ghost 触发 send-magic-link → QQ SMTP (`newxmesmtplogicsvrsza73-0.qq.com`) → AUTH PLAIN 通过 → MAIL FROM/RCPT TO → DATA → `250 OK: queued as.`。邮件进入 QQ 队列后由 QQ 负责投递到收件人邮箱（通常 1–5 分钟到达 163）。

**回退到本地假邮箱**（不想发真实邮件，只本地测试）：把 `mail.options` 改回 `127.0.0.1:2525`，再用 `start-ghost.bat` 一键拉起 `smtp-catch.js` + `extract-magic-link.js --watch` 这两个进程，链接从 `runtime/inbox/latest-magic-link.txt` 拿。

**③ 激活的主题**

当前激活主题是 `oss-blog-theme`（我们的二次开发主题）。切换：后台 Settings → Design → 选主题激活；或直接改数据库 `settings` 表 `active_theme` 的值为 `oss-blog-theme` 并重启 Ghost。

**④ 站点语言**

`settings` 表 `locale` = `zh`。主题里 `{{t "Related Posts"}}` 这类键要显示中文（"相关推荐"），依赖站点语言是 `zh`。若改回 `en`，这些文案会变英文。

> **已注入模拟数据**（2026-09-04 一次性脚本写入，见下方「模拟数据」）：
>
> - 3 个作者账号：李亚恒 / 张一鸣 / 王思远，密码均为 `ghost123`
> - 3 个标签：技术 / 生活 / 开源（各带主题色）
> - 8 篇中文文章（含正文、编辑器 Lexical 内容、作者、主标签），足够撑起前台列表 + 相关推荐
>
> 此外默认标题已改为「北恒的零碎笔记」，站点语言设为 `zh`（这样"相关推荐/阅读时间"才显示中文），激活主题为 `oss-blog-theme`。**管理员账号仍未初始化**——首次打开 <http://localhost:2368/ghost> 会引导你创建。

---

## 三、我改了哪里（逐项说明）

改动全部在主题层，Ghost 核心一行没碰。跟上游 Casper 的差异：

### 3.1 阅读进度条（`default.hbs` + `oss-blog.css`）

页面顶部一条 **4px 的彩虹进度条**，随滚动从左往右增长。读长文时一眼知道自己在哪，而且因为换成彩虹渐变，比之前的单一主题色明显得多。

- HTML：`default.hbs` 第 33 行 `<div class="oss-reading-progress">`
- JS：`default.hbs` 底部内联脚本（监听 scroll/resize 算百分比）
- 样式：`oss-blog.css` 的 `.oss-reading-progress*`

**2026-09-04 改版：单一主题色 → 彩虹渐变。** 原来进度条用 `--ghost-accent-color`（主题色），和顶部导航栏是同一个颜色，趴在最上面很不显眼。改成一条横向彩虹渐变（红→橙→黄→绿→蓝→紫）。关键实现：进度条是**整条 100% 宽**铺满彩虹，通过 `transform: scaleX(pct)` 从左侧裁剪出已读进度。这样渐变**永远保持完整不被压缩**（如果改用 `width` 百分比 + 背景渐变，进度条短的时候彩虹会被挤在一起、颜色跟着进度变形）。<code>scaleX</code> 的缩放只做"裁剪"，彩虹色分布始终是整条。

### 3.2 文章卡片增强（`partials/post-card.hbs`）

首页/列表页的每张文章卡片：

- **作者名**：Casper 原本只有日期，现在显示作者（加粗，`post-card-meta-author`）
- **阅读时长徽章**：胶囊形状的 `oss-reading-badge`，前面有个小圆点装饰，颜色跟主题色

### 3.3 详情页全标签 chips（`post.hbs` 第 63-72 行）

Casper 原本只显示主标签。现在文章头图下方把**该文章的所有标签**都列出来，每个都是可点击的胶囊（chips），点击跳到对应标签的归档页。hover 时边框和文字变主题色。


### 3.4 相关推荐面板（`post.hbs` 第 133-161 行）★自主功能

文章详情页底部，替换掉 Casper 原来的"最新 3 篇"：

```
┌─ 相关推荐  #技术 ──────────────────┐
│  [卡片1]      [卡片2]      [卡片3]  │   ← 同主标签的3篇文章
└────────────────────────────────────┘
```

- **匹配逻辑**：用主题的 `{{#get}}` 助手查 Content API，`filter="tag:{{primary_tag.slug}}+id:-{{id}}"` —— 同主标签 + 排除自己，取 3 篇
- **每张卡片**复用 `post-card` 模板（所以自动带作者名 + 阅读时长徽章）
- **空状态**：同标签没有其他文章时显示"暂无相关推荐"（虚线边框占位）
- **开关**：后台 Design 设置里有 `show_related_posts` 开关（package.json 里定义）
- **为什么放主题层**：这是展示层逻辑，一个 Handlebars 助手就能实现，不用改 Ghost 核心

**相关推荐到底是怎么算的？不是随机的。**

这里回答一个常见疑问——这个"相关推荐"**不是随机抽的，也不是 AI 相似度算的**，它是一个**确定性规则**：

1. **看当前文章的主标签**（`primary_tag`，即文章上排第一位的那个标签）。
2. **找出所有挂了同一标签的文章**，并**排除当前这篇自己**（`filter="tag:{{primary_tag.slug}}+id:-{{id}}"`）。
3. **按发布时间倒序**取最多 **3 篇**（`limit="3"`）。

所以它本质上&#x662F;**"同标签文章里最新的 3 篇"**。带不带标签、标签是否一致直接决定推荐结果：

| 情况          | 结果                                 |
| ----------- | ---------------------------------- |
| 文章没打标签      | 该功能直接不渲染（`{{#if primary_tag}}` 判定） |
| 同标签文章 ≥3 篇  | 显示最新 3 篇                           |
| 同标签只有 1~2 篇 | 显示 1~2 篇（少就少）                      |
| 同标签没有其他文章   | 显示"暂无相关推荐"占位                       |

> 为什么用它？因为它**不需要改 Ghost 核心**、不依赖额外数据源（不像协同过滤要用户行为表），一个 Handlebars `{{#get}}` 就够，而且结果稳定、可复现——同一篇文章每次刷新推荐都一样。缺点也很明显：**只认"同主标签"这一条线**，不会跨标签联想。（实验里主标签是"技术"，所以推荐出来的全是"技术"标签的文章。）

**布局修正（2026-09-04）**：第一版相关推荐渲染后整体偏左、没和正文对齐。原因是推荐面板用了 `.inner`（容器宽 **1200px**），而文章正文 `gh-canvas` 只有 **720px** 且居中——两者左边缘错位；再加上网格硬切 3 列，当推荐只有 1 篇时它就只占左侧 1/3，右侧大片留白，显得没居中。已改为：推荐面板 `max-width: 720px; margin: 0 auto`（与正文同宽同轴居中），卡片网格改 `flex-wrap + justify-content: center`，单篇/多篇都在列内居中。

### 3.5 代码块复制按钮（`assets/js/oss-enhance.js`）★新增

文章里的每个代码块，鼠标悬停时右上角浮现"复制"按钮，点击把代码复制到剪贴板，按钮变成绿色 ✓ 1.6 秒。技术博客写代码示例的刚需。兼容旧浏览器（有 `execCommand` 降级方案）。

### 3.6 返回顶部按钮（`assets/js/oss-enhance.js`）★新增

右下角圆形悬浮按钮，滚动超过 600px 才出现（淡入 + 上移动画），点击平滑滚回顶部。

> 3.5 和 3.6 是**独立文件**（`oss-enhance.js` + `oss-enhance.css`），不经过 gulp 编译，改完源码直接生效，方便后续继续加功能。

### 3.7 双语翻译（`locales/` + `locales-local/`）

`zh.json` 里补了新功能的中文文案：

| 英文                   | 中文        |
| -------------------- | --------- |
| Related Posts        | 相关推荐      |
| No related posts yet | 暂无相关推荐    |
| % min read           | 阅读时间 % 分钟 |
| 1 min read           | 阅读时间 1 分钟 |

> 坑：直接改 `locales/*.json` 会被 `gulp locales` 覆盖，所以源文件放 `locales-local/`，gulp 合并时非空值覆盖。

### 3.8 页脚署名（`default.hbs` 第 104 行）

页脚 "Powered by Ghost" 后面加了 `· Theme: OSS Blog (fork of Casper)`，标注这是二次开发的主题。

### 3.9 标签总览页（`page-tags.hbs`）★新增

Ghost 默认**没有**"一次看到所有标签"的入口——想按标签浏览，只能先点进某篇文章、再点里面的标签。这次在导航 **About 后面加了一个「标签」Tab**，点进去是一个 `/tags/` 总览页，把博客里**所有公开标签**以卡片网格列出来（每张卡片显示标签名 + 该标签下的文章数），点击任意卡片跳到对应标签的归档页。

- **模板**：新建 `page-tags.hbs`（Ghost 路由约定：slug 为 `tags` 的静态页会用这个模板渲染，优先级高于 `page.hbs`）
- **数据**：主题内 `{{#get "tags" limit="all" filter="visibility:public" include="count.posts" order="count.posts desc"}}` —— 取所有公开标签、按文章数倒序
- **导航项**：`posts` 表插入一个 slug=`tags` 的静态页面 + `settings.navigation` 在 About 后面追加 `{"label":"标签","url":"/tags/"}`
- **样式**：`oss-blog.css` 的 `.oss-tags-*`（卡片网格、悬停上浮、无图时用主题色色块占位）

> 这样你**不用点进文章**，直接在顶栏点「标签」就能看到全部标签并按标签筛选文章了。

### 3.10 作者主页改版（`author.hbs`）★新增

每个作者的页面（`/author/xxx/`）原本是 Casper 的简易卡片——就一张封面 + 名字 + 一句 bio + 社交链接，很素。这次改成"博主主页"的风格，并补齐了基本的博主信息区：

- **封面横幅**：作者有 `cover_image` 就铺封面大图；没有就显示一张主题色渐变占位。
- **圆形悬浮头像**：头像做成圆形，骑在封面横幅下沿（`margin-top: -48px`），带白边 + 投影，更有层次。
- **作者名 + 「原创作者」徽章**：徽章用主题色胶囊。
- **统计面板**：核心博主功能——自动统计**该作者写了多少篇文章**（`{{posts.length}}`，与 `{{#foreach posts}}` 同一作用域），如果作者填了「所在地」就一起展示，卡片样式。
- **社交链接图标行**：圆形描边图标，hover 变主题色 + 上浮（x / facebook / linkedin / bluesky / threads / mastodon / tiktok / youtube / instagram / rss，有哪个显示哪个）。
- **订阅 / 登录按钮**：站点开启了会员（`@site.members_enabled`）时显示，未登录给"登录 + 订阅"两个按钮，已登录显示"账户"。（走 Ghost 内置 Portal。）
- **文章列表标题**："作者的文章" + 遍历该作者全部文章（复用 `post-card`）。

> 技术备注：作者字段（名字/bio/所在地/社交/订阅）都要包在 `{{#author}}...{{/author}}` 里取；而"文章数"要用页面顶层上下文的 `{{posts.length}}`（它和 `{{#foreach posts}}` 在同一个作用域）——如果写成 `{{#author}}{{posts.length}}{{/author}}` 会取到空，因为 `{{#author}}` 块会把 `posts` 阴影掉。这是个容易踩的坑。

### 3.11 分页导航（`package.json` + `partials/pagination.hbs` + `oss-design.css` + `default.hbs`）

文章超过一页后，Casper 默认的无限滚动会"假装没分页"——首页只看到滚动条一拉到底，但**所有页都堆在同一页里**，分页按钮完全不存在。原因不是 `.pagination` 没渲染，是下面这一行没闭合好：

```html
<html lang="{{@site.locale}}" class="no-infinite-scroll{{#match @custom.color_scheme "Dark"}} dark-mode{{else match @custom.color_scheme "Auto"}} auto-color{{/match}}>
```

`class="no-infinite-scroll` 引号没补齐（HTML 规范要求属性值必须以 `"` 收尾），浏览器把 `<head>` 一直读到下一个 `"` 才结束属性——结果是 `classList.contains('no-infinite-scroll')` **永远 false**，Casper 的 `assets/built/casper.js`（包含打包后的 infinite-scroll.js）不会停下，滚动到底自动 fetch `/page/2/`、`/page/3/`、`/page/4/` 并插到当前 DOM。

**修复**（四处协同）：

1. `package.json` 的 `config.posts_per_page` 改成 `6`（25 篇 → 6×4+1=5 页）。
2. 新建 `partials/pagination.hbs`，覆盖 Ghost 内置分页模板，做成"数字页码 + 上一页 / 下一页"的胶囊按钮组：
   - 当前页高亮为渐变粉圆按钮（`is-current`）。
   - `{{#match page n}}` 逐个展开页码 1–9，超过 9 页显示 `… 末页`。
   - 仅在 `{{#match pages ">" 1}}` 时渲染（单页不显示"第 1 / 1 页"这种废话）。
3. `default.hbs` 的 `<html>` 标签**双保险**：补齐 `class="no-infinite-scroll{{...}}"` 引号（让 Casper 的内置开关真正生效），同时 CSS 里 `.pagination{display:none !important}` 兜底（万一有第三方脚本）。
4. `oss-design.css` 追加 `.oss-page-num` / `.oss-page-btn` 样式：渐变 hover、扁平胶囊、移动端折行、状态条（小字"共 25 篇 · 第 1 / 5 页"在下方居中）。

> 备注：`package.json` 的 `config` 变更后需重启 Ghost 才生效（theme config 有缓存）。

### 3.12 评论功能修复（数据库层）

文章详情页的 `{{comments}}` helper 依赖 `posts.comment_id` 字段非空。本项目 9 篇老文章（占位脚本直写库）全部 `comment_id IS NULL`，导致评论区一片空白（"会员讨论 / 0 条评论"框架在，但无表单）。

修复：直 SQL 批量补齐 + Ghost 后台 model 钩子的语义对齐：

```sql
UPDATE posts SET comment_id = id WHERE type='post' AND comment_id IS NULL;
```

正常路径下 `comment_id` 由 `core/server/models/post.js` 的钩子自动填：`if (!this.get('comment_id')) this.set('comment_id', this.id)`。**直接 SQL 写入绕过 model 层**，钩子不触发，所以脚本导入文章时 `seed-posts.js` 必须显式 `INSERT … comment_id = id`。下次写导入脚本时把这个写进文档。

### 3.13 批量文章导入（`content/posts/` + `runtime/seed-posts.js`）

不想在后台一篇篇点，用 markdown 源文件批量入库。流程：

```
content/posts/*.md   ──→   seed-posts.js   ──→   posts / tags / posts_tags / posts_authors
                           (markdown-it → html + lexical → SQLite)
```

Markdown 源文件放在 **`content/posts/*.md`**（已入仓），支持简单 front matter：

```markdown
title: 文章标题
slug: article-slug            # 唯一，对应 URL
tags: [AI, Agent]             # 中文标签名，会被映射到既有/约定的英文 slug
excerpt: 一句话摘要
published_at: 2026-09-07 13:30:00
```

跑命令：

```bash
node runtime/seed-posts.js           # 执行导入
node runtime/seed-posts.js --dry     # 只转换不写库，预览
```

两个关键约束：

1. **`comment_id` 必须等于 `post.id`**（见 3.12）。脚本已强制。
2. **标签 slug 要与库中已有标签一致**：seed-posts.js 顶部的 `slugMap` 把 `AI→ai / Agent→agent / 技术→tech / 前端→frontend / 秋招→campus-recruit / 生活→life / 开源→open-source / News→news` 显式映射。如果跳过映射直接写中文标签，会建出**重复标签**（同名中文 slug 与英文 slug 并存），前台 `/tags/` 会出现两个"AI"。

当前 16 篇：15 篇（秋招 / 前端 / AI / Agent / 生活 / 技术，2026-09-07 批量写入）+ 1 篇 GPT-6 Astra。

### 3.14 自定义设计样式（`assets/css/oss-design.css`）

不经过 Gulp 编译、运行时直接 `<link>` 引入，方便快速改视觉。当前风格：

- 顶部导航：紫红渐变 + 径向高光（`linear-gradient` 叠 `radial-gradient`）
- 文章卡片：圆角 + 阴影 + hover 微浮 + 标签色块（左上小角标）
- 标签总览卡：技术粉珊瑚、开源紫靛、生活天青绿、News 琥珀玫红、AI/Agent/前端 沿用主色
- 页脚：深紫渐变 + 社交图标 + 订阅区
- 分页按钮：渐变胶囊、hover 上浮（见 3.11）
- 评论 / 代码块复制按钮 / 返回顶部按钮 配色统一

改视觉只需改这一个文件，刷新就能看（Ghost 会缓存一次，但主题 CSS 改了浏览器要硬刷新 `Ctrl+Shift+R`）。

### 3.15 横向卡片布局（`partials/post-card-h.hbs` + `oss-design.css`）★改版

问题：有的文章有封面图、有的没有，Casper 默认纵向卡片会让没图的卡片从标题开始，网格里上下不对齐。

处理：统一改成**左图右文横卡**——

1. 新建 `partials/post-card-h.hbs`：卡片内部 `flex-direction:row`，**左侧 42%** 固定「图区」——有 `feature_image` 就 `object-fit:cover` 铺满；**没有图就用分类渐变占位**（✦ + 标签名），这样每张卡片左区都有内容、高度一致。
2. 首页 / 标签页 / 作者页的 `post-feed` 改用 `post-card-h`（`partials/post-card.hbs` 保留给**相关推荐**和 404，垂直卡不受影响）。
3. `oss-design.css` 追加横卡样式：`.post-feed` 从 6 列网格改为 **2 列**；卡片圆角 20px、hover 上浮、图片缩放；移动端保持左图右文（缩小图区）。
4. 渐变占位按标签分色调（独特性）：`tag-agent` 蓝紫、`tag-ai` 蓝、`tag-frontend` 粉紫、`tag-life` 青绿、`tag-tech` 红橙、`tag-news` 琥珀玫红等——每张无图卡都不同颜色，避免一整排紫色单调。

> 横卡只在列表 feed 生效；文章详情页顶部大图、相关推荐面板（720px 网格）逻辑不变。

### 3.16 阅读时长（reading-time）模块 ★自主功能

> 背景：首页把阅读时间做成固定海报位，但读者反馈"怎么看都是 4 分钟"——因为 Ghost 内置 `@tryghost/helpers` 默认按 **275 wpm** 估算（偏慢，中文阅读实际 350–500 wpm），造成相近长度的文章都落在同一个整数分钟上，观感像"没实现/写死"。

处理：把"阅读时长"做成三层、可独立校验的功能，而不是只依赖 Ghost 内置 helper——

1. **独立模块** `runtime/scripts/oss-reading-time.js`
   - 纯函数 `computeReadingMinutes(html, featureImage, {wpm})`，可单测；
   - **中文友好**：默认 `wpm = 400`（可用 `--wpm=350` 覆盖），CJK 汉字逐字计、英文按词；
   - 计入图片时间（首图 12s、递减、≥3s）与重读块（h1-h6 / blockquote / pre / code 各 +6s）；
   - CLI：`node runtime/scripts/oss-reading-time.js`（校准并写出 cache）/ `--dry`（只看不写）/ `--wpm=350`。
2. **后端 helper override** `runtime/versions/6.59.0/core/frontend/helpers/reading_time.js`
   - 优先读 `runtime/reading-time-cache.json`（key = post.slug，value = 分钟数）；
   - 命中直接按分钟数 + 翻译模板输出；未命中回退 Ghost 默认计算；
   - 首次加载时把 cache **镜像**一份到 `content/themes/<激活主题>/assets/reading-time-cache.json`。
3. **客户端实时计算 + 阅读进度条** `theme/oss-blog-theme/assets/js/oss-reading-time.js`
   - 文章页对正文（去除 code/pre/blockquote）用同一公式现场算 minutes；
   - 右下角 `oss-reading-badge-widget`：进度条 + 百分比 + 剩余时间（如"剩余约 3 分钟"），滑到底显示"✓ 已读完"；
   - 与 `default.hbs` 顶部那条彩虹预览进度条（`oss-reading-progress`）互补：一条是顶部总进度，一条是右下角"时长 + 剩余"。

效果（`node runtime/scripts/oss-reading-time.js --dry`）：25 篇文章分布为 8 / 5 / 4 / 3 / 1 分钟，长文（GPT-6）8 分钟、短文 1 分钟，不再"一律 4 分钟"。

> 这套是**在 Ghost 提供的 `reading_time` helper 之上做了覆盖与增强**，不是重写——上游升级只需重跑一次 `runtime/scripts/oss-reading-time.js` 重新生成 cache 即可跟上。

### 改动文件清单

| 文件 | 改动类型 |
| --- | --- |
| `default.hbs` | 修改：`<html>` 引号补齐关闭无限滚动、引入 oss-design.css、页脚署名 |
| `post.hbs` | 修改：标签 chips、相关推荐面板 |
| `author.hbs` | **改版**：作者主页博主风（封面+头像+统计+社交+订阅） |
| `page-tags.hbs` | **新增**：`/tags/` 标签总览页模板 |
| `partials/post-card.hbs` | 修改：作者名、阅读时长徽章（仍用于相关推荐 / 404 垂直卡） |
| `partials/post-card-h.hbs` | **新增**：横向卡片（左图右文，无图用分类渐变占位），首页/标签/作者列表用 |
| `index.hbs` `/` `tag.hbs` `/` `author.hbs` | 修改：`post-feed` 引用由 `post-card` 换成 `post-card-h` |
| `partials/pagination.hbs` | **新增**：数字页码导航（覆盖内置分页） |
| `assets/css/oss-blog.css` | 修改：进度条彩虹/徽章/chips/推荐面板样式 + 标签页样式 + 作者页样式 |
| `assets/built/oss-blog.css` | 修改：同步上述样式（页面实际加载这个） |
| `assets/css/oss-enhance.css` | **新增**：复制按钮、返回顶部样式 |
| `assets/js/oss-enhance.js` | **新增**：复制按钮、返回顶部逻辑 |
| `assets/css/oss-design.css` | **新增**：自定义设计样式（粉紫渐变 + 分页胶囊 + 横卡布局 + 分类渐变占位） |
| `locales/zh.json`、`locales-local/zh.json` | 修改：中文翻译（含标签页 + 作者页文案） |
| `package.json` | 修改：`posts_per_page: 6` + `show_related_posts` 自定义设置 |
| `start-ghost.bat` / `stop-ghost.bat` | 修改：smtp-catch / extract-watcher 已无用，因走真实 QQ SMTP |
| `content/posts/*.md` | **新增**：16 篇 Markdown 文章源（秋招 / 前端 / AI / Agent / GPT-6） |
| **数据库** `posts` 表 | 新增 16 篇 + 标签映射修复；`UPDATE posts SET comment_id = id WHERE comment_id IS NULL` 修评论区 |
| **数据库** `settings.navigation` | 修改：About 后追加「标签」导航项 |
| `partials/post-card-v.hbs` | **新增**：竖/横两用文章卡（compact、可被随机提升为 featured 横卡）；`post-card-featured.hbs` / `post-card-h.hbs` 已废弃删除 |
| `assets/js/oss-home.js` | **新增**：每页随机挑一篇做横排 featured（Ghost 只加载内置 helper，故用客户端 JS 实现，主题层单文件） |
| `assets/js/oss-reading-time.js` | **新增**：客户端实时阅读时长计算 + 右下角阅读进度条 widget（进度 / 百分比 / 剩余时间） |
| `runtime/scripts/oss-reading-time.js` | **新增**：独立 reading-time 模块（可单测、`--dry` 预览、`--wpm` 覆盖），中文友好 400 wpm + 图片/重读块加成 |
| `runtime/reading-time-cache.json` | **新增**：`{{reading_time}}` helper 读取的 slug→分钟 缓存（由上面脚本生成） |
| `runtime/versions/6.59.0/core/frontend/helpers/reading_time.js` | 修改：**覆盖** Ghost 内置 helper，优先读 cache，未命中回退默认计算；并镜像 cache 至激活主题 assets |

---

## 四、快速上手（已验证的路径）

### 4.1 启动

**Node 必须是 22.23.1**（Ghost 6.x 的 `engines` 写死 `^22.23.1 || ^24.20.0`），本机位置：

```
C:\Users\ruia3\AppData\Local\nvm\v22.23.1\node.exe
```

双击项目根目录的 **`start-ghost.bat`**，窗口保持打开（关了服务就停）。停止用 **`stop-ghost.bat`**。

或者命令行：

```powershell
cd C:\Users\ruia3\Desktop\oss-blog\runtime
$env:NODE_ENV="development"
C:\Users\ruia3\AppData\Local\nvm\v22.23.1\node.exe current\index.js
```

启动后（首次约 50 秒建库，之后秒起）：

- 前台：<http://localhost:2368>
- 后台：<http://localhost:2368/ghost>

### 4.2 首次初始化（还没做的话）

1. 浏览器打开 <http://localhost:2368/ghost>
2. 按引导创建管理员账号（邮箱 + 密码 + 站点名）
3. 进后台后：**Settings → Design → Change theme**，激活 `oss-blog-theme`
4. 建几篇文章（记得打标签），前台就能看到相关推荐效果

### 4.3 日常写作流程

1. `start-ghost.bat` 启动
2. 后台 Posts → New post，写正文、打标签（**相关推荐靠标签匹配，标签一定要打**）
3. Publish，前台立即可见
4. 用完 `stop-ghost.bat` 停止

### 4.5 批量导入文章（`runtime/seed-posts.js`）

Markdown 源文件放在 **`content/posts/*.md`**（已入仓），带简单 front matter：

```markdown
title: 文章标题
slug: article-slug            # 唯一，对应 URL
tags: [AI, Agent]             # 中文标签名，会被映射到既有/约定 slug
excerpt: 一句话摘要
published_at: 2026-09-07 10:00:00

## 正文正文（Markdown，支持标题/列表/代码块/引用/加粗/行内代码）
```

导入命令：

```bash
node runtime/seed-posts.js           # 执行导入（Markdown -> HTML + lexical -> SQLite）
node runtime/seed-posts.js --dry     # 只转换不写库，预览
```

两个关键点（避免踩坑）：

1. **`comment_id` 必须等于 `post.id`**。直接写库会绕过 Ghost model 层自动补全 `comment_id` 的钩子，导致前台 `{{comments}}` 不渲染评论区。脚本已强制 `comment_id = id`。
2. **标签 slug 要与库中已有标签一致**（`/` 秋招→`campus-recruit`、技术→`tech`、前端→`frontend`、Agent→`agent`、AI→`ai`、开源→`open-source`、生活→`life`、News→`news`）。若写入新的中文标签名却未在 `seed-posts.js` 的 `slugMap` 里配好英文 slug，会建出**重复标签**（同名中文 slug 与英文 slug 并存），需用 `runtime/_fix-tags.js` 重映射并删除重复项。

已有内容：`content/posts/` 下 15 篇（秋招时间线 / 简历项目 / 校招面试清单 / 2026 前端 / SSE 流式渲染 / 端侧 AI / Next.js 三个项目 / Agent 入门 / aether-desk 复盘 / RAG / Agent 技术栈 / AI 与程序员 / AI 行业观察 / 我实际用 AI / 大三复盘），标签覆盖 秋招 / 前端 / AI / Agent / 技术 / 生活 / 开源 / News。

### 4.4 修改主题后怎么生效

改了 `theme/oss-blog-theme/` 里的源码后：

1. 同步到运行目录（HBS/JS/CSS 直接复制对应文件到 `runtime/content/themes/oss-blog-theme/`）
2. 样式和模板改动：重启 Ghost（`stop-ghost.bat` → `start-ghost.bat`）
3. 如果改了 `assets/css/oss-blog.css`（编译型样式），需要跑 `gulp build` 重新生成 `assets/built/`

---

## 五、环境与依赖

| 依赖        | 版本                           | 说明                     |
| --------- | ---------------------------- | ---------------------- |
| Node.js   | `22.23.1`                    | 锁定版本，别用低的              |
| Ghost CLI | `1.32.3`                     | 可选，装运行时用的              |
| 上游 Ghost  | 源码 `v6.62.0` / 运行时 `v6.59.0` | ghost-cli 拉下来的是 6.59.0 |
| 主题基底      | Casper `v5.12.3`             | MIT                    |
| 数据库       | SQLite（better-sqlite3）       | 单文件，零配置                |
| 操作系统      | Windows 11                   | 当前在本机跑通                |

---


## 六、踩坑记录

这部分是真实踩出来的，记下来免得以后重来一遍。

**1. `.pnpm` 内部依赖是空目录，启动报 `ERR_PACKAGE_PATH_NOT_EXPORTED`**

Ghost 起不来，报找不到 `entities` 包的子路径。根因：pnpm 在 Windows 建 symlink 时"先试 dir symlink，失败再退回 junction"，但这台机器的 dir/file symlink **静默失败**（不抛错也不落盘），fallback 永远触发不了，`node_modules/.pnpm/` 下 1400+ 个内部依赖全成了空目录。

解决：patch pnpm 的 `dist/pnpm.mjs` + `dist/worker.js` 两处 `IS_WINDOWS` 分支为无条件 junction；删 `node_modules/.modules.yaml`（否则 pnpm 以为"已最新"跳过重链）；`pnpm install --prod --offline --ignore-scripts` 重链。

**2. better-sqlite3 原生模块加载失败**

直接下 ABI 127（对应 Node 22.23.1）的预编译二进制放进去，备份在 `runtime/native-backup/`。

**3. nvm 符号链接创建失败**

`nvm use` 报 `NVM_SYMLINK is set to a physical file/directory`——nvm 的 mklink 在当前环境静默失败。解决：把 `v22.23.1` 的文件**直接复制**到 `C:\nvm4w\nodejs`（绕过符号链接），node 就能用了。代价是以后 `nvm use` 前要先删这个目录。

**4. `ghost start` / `ghost setup` 报错**

ghost-cli 会调 `reg.exe` 查注册表，部分受限 shell 里被拉黑。解决：直接 `node current\index.js` 启动（`start-ghost.bat` 已经这么做了）。

**5. 启动报 `EADDRINUSE`**

端口 2368 被旧实例占用。`stop-ghost.bat` 停掉旧的再启。

**6. `XxxNode must implement static "getType"` 警告刷屏**

不是错。Ghost 编辑器 Koenig 节点在开发模式的正常提示，忽略。

**7. 直接改 `locales/*.json` 被覆盖**

`gulp locales` 会从 `@tryghost/theme-translations` 重新合并，自己的翻译要放 `locales-local/`。

**8. 会员注册/登录报 "登录尝试次数过多，请在12分钟后重试"（HTTP 429）**

在本地反复调试注册/登录时，几次提交后会撞到 Ghost 内置的**暴力破解限流器**（`@tryghost/brute-knex` + `express-brute`），默认 `freeRetries: 2`、`minWait: 500ms`，等待时间按斐波那契递增，最大 15 分钟 —— 表现就是前端弹窗一直 "请在12分钟后重试"。

链路：`POST /members/api/send-magic-link` 上挂了两个限流器 `membersAuthEnumeration`（按 IP 防枚举，用 `spam.member_login`）和 `membersAuth`（按邮箱防爆破，用 `spam.user_login`），都在 `core/server/web/shared/middleware/api/spam-prevention.js`。阈值来自 `config.development.json` 的 `spam` 段，**Ghost 启动时载入到模块作用域，热修改无效**。

修复：在 `runtime/config.development.json` 里把两个限流段都提到本地开发足够宽松（100000 次 / 7 天），重启 Ghost 即生效：

```json
"spam": {
  "user_login":  { "freeRetries": 100000, "lifetime": 604800 },
  "member_login":{ "freeRetries": 100000, "lifetime": 604800 }
}
```

验证脚本（直接打 send-magic-link，携带 integrity token）：

```bash
TOKEN=$(curl -s -c cj.txt http://localhost:2368/members/api/integrity-token)
curl -s -b cj.txt -c cj.txt -X POST http://localhost:2368/members/api/send-magic-link \
  -H "Content-Type: application/json" -H "Origin: http://localhost:2368" \
  --data "{\"name\":\"Test\",\"email\":\"x@example.com\",\"emailType\":\"signup\",\"integrityToken\":\"$TOKEN\"}"
# 期望 HTTP 201，body 形如 {"inboxLinks":{...}}
```

**9. 邮件魔法链接不在 inbox，而在 Ghost 日志里**

即便 SMTP 端口（2525）监听正常、`smtp-catch.js` 也工作良好，Ghost 6.59 内置 nodemailer 在 **pipeling `RCPT+DATA+headers` 后会主动关闭连接**，正文和终止点 `.` 永远没机会发出去（`ECONNABORTED` / `closed (state=data)`）—— 这是 mailer 侧行为，smtp-catch 改不了。

但 Ghost **同时会把邮件正文（包括魔法链接 URL）打印到 stdout**。解法是新增 `runtime/extract-magic-link.js --watch`：用 `fs.watch` 监听 `runtime/ghost-dev.log`，只要日志新增里出现 `/members/?token=...&action=signup...` 就把最新一条 URL 落到 `runtime/inbox/latest-magic-link.txt`。

完整启动链路（已写进 `start-ghost.bat`）：
1. SMTP 捕获（2525）
2. 魔法链接 watcher（监听 `inbox/*.eml` base64 解码 + `ghost-dev.log` 兜底）
3. Ghost 本身（2368）

用户注册流程：填表 → 等 201 → 打开 `inbox/latest-magic-link.txt` 拿链接 → 浏览器访问 → 完成注册。已用 `end2end@test.local` 端到端跑通（HTTP 200 + `?success=true` + session JWT 颁发成功）。

---

**踩坑：前台注册/登录 "没有发送验证码"（201 成功但永远收不到链接）**

现象：注册弹窗提示"邮件已发送"，`send-magic-link` 也返回 201，但 `latest-magic-link.txt` 不更新、数据库也没有新成员。

根因：本地 `smtp-catch.js` 的两个 SMTP 协议错误导致 nodemailer 把邮件"发送"过程掐断——
1. **多行 EHLO 响应格式错误**：RFC 5321 规定多行回复的**中间行用连字符**（`250-smtp-catch`），只有最后一行用空格（`250 HELP`）。先前全用空格，nodemailer 读到第一行 `250 smtp-catch` 就误以为握手完成，立刻 `MAIL/RCPT/DATA` 全发出去，我们的响应和它的命令**全错位**（`DATA` 收到 `250 HELP` 而不是 `354`）→ nodemailer 认为 DATA 被拒，直接关连接、正文和终止点 📦 都没发。
2. **宣告了 `PIPELINING`**：服务器允许管线化后，nodemailer 把命令一次性 burst 过来，加剧上面的错位。

修复（`runtime/smtp-catch.js`）：
- EHLO 改成正确的多行格式（`250-` 连字符 + 末行 `250 ` 空格）。
- 去掉 `PIPELINING` 能力宣告，让 nodemailer 一条命令等一个响应。

验证：修复后 `sendMail` 返回 `response="250 OK queued"`，`inbox/*.eml` 真正落下邮件；`extract-magic-link.js` 升级为**解码 `inbox/*.eml` 的 base64 正文**来取链接（因为 Ghost 投递成功后不再把邮件打印到 stdout，旧的"读日志"方式失效）。用 `ruia36791@163.com` 端到端跑通：201 → 链接落盘 → 点击 → `/?action=signup&success=true` → session `sub=ruia36791@163.com`。

---

**10. 首页看着像没分页，25 篇全堆在一页**

> 用户反馈："你这个分页并不是分页啊，数据库也没有做好，你还是把所有的数据在一页上了啊"。

排查步骤：
1. `curl http://localhost:2368/ | grep -oc '<article'` —— 服务端确实只返回 6 篇，分页服务正常。
2. 用真实 Chrome（headless + CDP）执行 `document.querySelectorAll('article').length`，**滚动前 6 篇、滚动 6 次后变成 24 篇**——有人在前端静默拉页。
3. `document.documentElement.className` 一查：值是 `no-infinite-scroll>\n<head>...<meta charset=`（**一坨 HTML 都被吞进了 class 属性**），因为某次改 `<html>` 标签时只写了 `class="no-infinite-scroll{{#match...}}` 但忘了补结尾的 `"`。
4. Casper 的 `assets/built/casper.js` 第 17 行就是 `if (document.documentElement.classList.contains('no-infinite-scroll')) return;` —— 属性被吞后整个值成了单个 class 名，contains 永远 false，无限滚动照常拉页。
5. `<html lang="zh" class="no-infinite-scroll>` 看着"差不多"，浏览器静默容忍，肉眼看 HTML 文本也没问题（属性值会读到下一个 `"` 才结束），**只有 `classList.contains` 这种 JS 判断才会暴露**。

**修复**：`<html>` 标签改成 `class="no-infinite-scroll{{#match ...}} auto-color{{/match}}"`（双引号闭环）+ CSS 里 `.pagination{display:none !important}` 兜底。CDP 复测：滚动 6 次仍稳定 6 篇。

**教训**：HTML 属性值没闭合不会报错，但会把后面所有 HTML 吞进属性。grep 自检只看到 `<html[^>]*>` 第一段就停，**会漏掉引号问题**。判定模板 / 主题 bug 时，**先看 `document.documentElement.className` 的实际值**，比看 HTML 源文件可靠。

---

**11. 老 9 篇文章里出现 `<p>undefined</p>` 字样**

> 这是早期"模拟数据脚本"留下的印记——某些字段没取到（接口返回 undefined），markdown 渲染时直接写进 HTML。

修复：一次性 SQL 清理 + lexical JSON 同字段清空：

```sql
UPDATE posts
SET html       = REPLACE(html, '<p>undefined</p>', ''),
    plaintext = REPLACE(plaintext, 'undefined', ''),
    lexical   = JSON_MODIFY(lexical, ...)  -- lexical 里也有，需遍历 children
WHERE html LIKE '%undefined%' OR plaintext LIKE '%undefined%';
```

lexical 是 JSON 结构，递归遍历 `node.text === 'undefined'` 改成空字符串即可。详见 `runtime/_fix-undefined.js`（一次性脚本，写完即删）。

---

**12. 批量导入文章时中文标签建出重复项**

`seed-posts.js` 第一次跑时，`tags: [技术, 前端, AI, Agent, ...]` 中 `技术` 中文名被直接当成 slug 用（`name.toLowerCase().replace(/\s+/g,'-')`），库里已有 `slug='tech'` 的"技术"标签，又新建了一个 `slug='技术'` 的同名标签，**`/tags/` 页面出现两个"技术"**。

修复：在 seed-posts.js 顶部加显式 `slugMap`，中文标签名 → 既定的英文 slug。**后果**：如果将来增加新中文标签，必须先在 slugMap 里登记英文 slug，否则仍会建出重复项。

---

## 七、测试

功能与权限的验收用例在 `tests/acceptance.md`（注册 / 登录 / 文章 / 标签 / 评论 / 搜索 + 权限 + 界面 + 恢复）。

主题兼容性校验：

```bash
cd theme/oss-blog-theme
npm run test   # gscan 检查
```

---

## 八、安全

`.env`、`config.production.json`、数据库、日志、导出文件都在 `.gitignore` 里。管理密钥、数据库口令绝不进 Git 或前端代码。误提交密钥就轮换并清历史，不能只加忽略规则。

---

## 九、上游与第三方资源

| 资源                                  | 来源                                   | License |
| ----------------------------------- | ------------------------------------ | ------- |
| Ghost                               | <https://github.com/TryGhost/Ghost>  | MIT     |
| Casper 主题                           | <https://github.com/TryGhost/Casper> | MIT     |
| 图标（search / fire / lock / avatar 等） | 随 Casper 主题                          | MIT     |
| 复制/返回顶部图标（内联 SVG）                   | 自绘，feather 风格                        | 无版权问题   |

详见 `NOTICE.md`。

---

## 十、还没做完 / 待补充

### 已完成 ✅

- [x] ~~建 8 篇文章 + 3 个标签 + 2 个账号~~（2026-09-04 已注入模拟数据，3 作者 / 4 标签 / 8 文章，密码 ghost123）
- [x] ~~相关推荐布局修正~~（2026-09-04：推荐面板改 720px 对齐正文 + 卡片居中）
- [x] ~~标签总览页 `/tags/`~~（2026-09-04：新增 page-tags.hbs + 导航「标签」Tab，About 后面）
- [x] ~~阅读进度条改彩虹渐变~~（2026-09-04：单一主题色 → 彩虹渐变，scaleX 裁剪不压缩）
- [x] ~~作者主页改版博主风~~（2026-09-04：author.hbs 封面横幅 + 悬浮头像 + 文章数统计 + 社交图标 + 订阅按钮）
- [x] ~~评论功能修复~~（2026-09-06：UPDATE posts SET comment_id = id WHERE comment_id IS NULL，9 篇老文章评论区恢复）
- [x] ~~邮箱魔法链接真发到真实邮箱~~（2026-09-06：QQ SMTP 配通，934705339@qq.com → 任意 163/QQ 收件，授权码不入仓）
- [x] ~~429 限流放宽~~（2026-09-06：runtime/config.development.json 加 spam.freeRetries=100000/7d）
- [x] ~~分页导航重做~~（2026-09-07：数字页码 1–5 + no-infinite-scroll 引号修复 + 渐变胶囊按钮）
- [x] ~~批量文章 15 篇入库~~（2026-09-07：秋招 / 前端 / AI / Agent / 生活 / 技术，覆盖 6 个主标签）
- [x] ~~GPT-6 Astra 专题文章~~（2026-09-07：含三领域对比表、嵌入官方对比图、共 25 篇）
- [x] ~~自定义设计样式 oss-design.css~~（2026-09-07：粉紫渐变 + 卡片阴影 + 分页胶囊 + 标签卡）
- [x] ~~老文章 `<p>undefined</p>` 清理~~（2026-09-07：UPDATE 7 篇文章的 html + plaintext + lexical）

### 截图素材（README 用）

- [ ] 把下面两张截图放到 README 顶部或单独 docs 目录，并加简短说明

![前台页面](tests\前台页面.png)
![后台页面](tests\后台页面.png)

### 真正的待办 🟡

> 按"距离上线"和"影响业务"排过序。短期能自己做完的标 ⭐，需要外部资源（部署 / 设计）的标 🌐。

- [ ] ⭐ 给 4 个新标签（AI / 前端 / Agent / 秋招）上传 `feature_image`（标签页卡背景，目前是渐变兜底）—— 后台 `/ghost/#/tags/` 直接拖图
- [ ] ⭐ 把 9 篇老占位文章重写成实质内容（目前 html 多在 250–290 字，是模板生成的"工程化"等短文）—— 否则读者进来看"为什么值得关注"这种占位句会失去信任
- [ ] ⭐ RSS feed 重新生成一次（数据库新增了 16 篇但订阅源可能还停在 8 篇）—— 后台 Settings → Labs → Reinitialize
- [ ] 🌐 部署到公网（Cloudflare Pages + Ghost proxy / Railway / 一台便宜 VPS），拿到 https 域名
- [ ] 🌐 Live Demo 链接 + 部署架构图（README 顶部加 banner）
- [ ] ⭐ 给 4 个新文章分类写 cover 缩略图（feature_image 自动生成工具：Unsplash Source + 文章 slug）
- [ ] ⭐ 阅读时长统计回归（之前 8 篇老文章的 `reading_time` 字段是 0，新 16 篇需要重算 —— 后台 Settings → Labs → Reindex）
- [ ] ⭐ 站内搜索：Ghost 默认 sodo-search 仅搜标题，正文搜索要装 Search 插件或自己写 helper
- [ ] ⭐ 代码高亮：theme 主题需要重新跑 `gulp build` 加 prism.js，文章里 ```language-* 才能渲染彩色
- [ ] ⭐ GitHub PR / Issue 模板（如果开放给 community 用）
- [ ] ⭐ 备份自动化：`runtime/content/data/ghost-local.db` 每天 dump 一次到 `runtime/backups/`，保留 30 天
- [ ] ⭐ Lighthouse 跑一次：性能 / SEO / 可访问性 三项基本过线
- [ ] ⭐ sitemap.xml 已存在（200 OK），但需要提交到 Google Search Console

### 长期想做的事 🔵

- [ ] 主题迁移到 Gulp 5 + ESM（现在混用 require/esm，部署时容易踩）
- [ ] 把 `seed-posts.js` 抽成独立 npm 包（`@oss-blog/seed`），允许其他人 fork 仓库后一键建自己的内容
- [ ] 加一个"文章视图统计"面板（在 `actions` 表已有数据，前端读出 Top 10）
- [ ] 评论支持 Markdown / 图片上传（默认只支持纯文本）
- [ ] 多语言（en / zh 双语切换，`locale: [en, zh]` + 路由切换）

---

> **更新节奏**：上述 TODO 每完成一项，把"已完成"段对应项的 strikethrough 加上日期，更新"完成日期"，并视情况在 CHANGELOG.md 留一行。

---

## 十一、部署上线

本博客采用 **"本地完整版 Ghost（写作/管理）+ 对外静态展示版"** 的架构。本地版在 `localhost:2368`（会员登录、评论、管理后台、邮件订阅全部可用，适合持续写作）；对外展示版是镜像出来的静态站，零成本、秒开、免备案，适合给 HR/读者一个公网链接。

### 方式一：静态化（零成本，推荐先做，今天就能有链接）

产物已生成在 `static-site/`（40 个页面 + 43 个资源文件，约 6.3MB），由 `runtime/build-static.js` 生成：

```
node runtime/build-static.js /oss-blog/   # 重新抓取最新内容到 static-site/
```

**工作原理**：爬取正在运行的 Ghost 站点（localhost:2368）所有页面（首页/分页/文章/标签/About），注入 `<base href="/oss-blog/">` 让根相对链接在部署前缀下正确解析，并下载全部 css/js/图片（含各响应式尺寸变体）。

**部署到 GitHub Pages**（项目页 `https://<user>.github.io/oss-blog/`）：

```bash
# 1) 把 static-site 挂到 gh-pages 分支
git checkout --orphan gh-pages
git rm -rf .
cp -r static-site/* .
git add .
git commit -m "chore: static snapshot for GitHub Pages"
git push origin gh-pages
git checkout main                      # 回到主分支

# 2) 去 https://github.com/<user>/oss-blog → Settings → Pages
#    选 "Deploy from a branch" + gh-pages + /(root) → Save
#    稍候即可访问 https://<user>.github.io/oss-blog/
```

> 注意：`static-site/` 及 `runtime/` 已在 `.gitignore`，不会进 main（`runtime/` 含数据库 + SMTP 授权码，必须保密）。静态站无会员/评论交互（只做内容展示）；要恢复完整互动请用方式二。

### 方式二：VPS 自托管（功能完整，保留会员/评论/邮件，需小预算）

用 Docker 一键起 `ghost + mysql + caddy`，海外节点免备案：

```yaml
# docker-compose.yml
services:
  ghost:
    image: ghost:latest
    restart: unless-stopped
    ports: ["2368:2368"]
    volumes: ["ghost_content:/var/lib/ghost/content"]
    environment:
      url: "https://blog.你的域名.com"
      database__client: mysql
      database__connection__host: mysql
      database__connection__user: ghost
      database__connection__password: "${MYSQL_PASSWORD}"
      database__connection__database: ghost
      mail__transport: SMTP
      mail__options__host: smtp.qq.com
      mail__options__port: "465"
      mail__options__secure: "true"
      mail__options__auth__user: "934705339@qq.com"
      mail__options__auth__pass: "${QQ_SMTP_CODE}"
      mail__from: "Ghost Blog <934705339@qq.com>"
    depends_on: [mysql]
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    volumes: ["mysql_data:/var/lib/mysql"]
    environment:
      MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD}"
      MYSQL_DATABASE: ghost
      MYSQL_USER: ghost
      MYSQL_PASSWORD: "${MYSQL_PASSWORD}"
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile"]
volumes: { ghost_content: {}, mysql_data: {} }
```

```text
# Caddyfile  (自动 HTTPS)
blog.你的域名.com {
    reverse_proxy ghost:2368
}
```

**必须做的安全项**（2026 年 Ghost 曾出过 CVE，有波及数百站的 ClickFix 攻击）：
1. 定期 `ghost update` / `docker pull ghost:latest` 打补丁；
2. 全程 HTTPS（Caddy 自动证书），Caddyfile 不要裸 http；
3. 后台 `Settings → Security` 尽量关掉不必要的公开注册，管理后台加强密码；
4. 邮件用 QQ SMTP（465 SSL），授权码放环境变量 `QQ_SMTP_CODE`，**千万别写进仓库**；
5. 定期备份 `content/` + `mysql_data/`。

**选型建议**：求职作品集 → 先跑方式一（今天就有链接）；想要真正可互动、长期运营 → 方式二（月几十元 + 一个域名）。两者可并存：本地 Ghost 照常写，静态站随时重新抓取更新。
