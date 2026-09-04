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

Ghost 的会员注册/登录用的是"邮箱魔法链接"（发一封带验证链接的邮件给你），所以**必须配好能发信的 SMTP**，否则前台注册会报 `500 connect ECONNREFUSED`。

本项目用的是 QQ 邮箱 SMTP：

```json
"mail": {
  "transport": "SMTP",
  "from": "Ghost Blog <你的QQ号@qq.com>",
  "options": {
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true,
    "auth": { "user": "你的QQ号@qq.com", "pass": "你的SMTP授权码" }
  }
}
```

关键点：

- `pass` 用的是 QQ 邮箱的 **SMTP 授权码**（不是 QQ 密码），在 QQ 邮箱网页版 设置 → 账户 → 开启 SMTP 服务后生成。
- **网络注意**：`smtp.qq.com` 的 465/587 端口在部分校园网/公司网会被拦截（本机实测 `smtp.qq.com` 连 443 都不通），此时注册邮件一样发不出去。若遇到，改用一个能通的 SMTP（比如阿里云邮件推送），或改用本地 MailHog 假邮箱做演示。
- **管理员后台登录不需要邮件**，`/ghost` 登录和内容管理照常；只有"前台访客注册成会员"才依赖这个 SMTP。

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

### 改动文件清单

| 文件                                        | 改动类型                                        |
| ----------------------------------------- | ------------------------------------------- |
| `default.hbs`                             | 修改：进度条 HTML/JS（彩虹 scaleX）、页脚署名、引入新文件        |
| `post.hbs`                                | 修改：标签 chips、相关推荐面板                          |
| `author.hbs`                              | **改版**：作者主页博主风（封面+头像+统计+社交+订阅）              |
| `page-tags.hbs`                           | **新增**：`/tags/` 标签总览页模板                     |
| `partials/post-card.hbs`                  | 修改：作者名、阅读时长徽章                               |
| `assets/css/oss-blog.css`                 | 修改：进度条彩虹/徽章/chips/推荐面板样式 + 标签页样式 + 作者页样式    |
| `assets/built/oss-blog.css`               | 修改：同步上述样式（页面实际加载这个）                         |
| `assets/css/oss-enhance.css`              | **新增**：复制按钮、返回顶部样式                          |
| `assets/js/oss-enhance.js`                | **新增**：复制按钮、返回顶部逻辑                          |
| `locales/zh.json`、`locales-local/zh.json` | 修改：中文翻译（含标签页 + 作者页文案）                       |
| `package.json`                            | 修改：`show_related_posts` 自定义设置               |
| **数据库** `posts` 表                         | 新增：slug=`tags` 的静态页面记录 + `posts_authors` 关联 |
| **数据库** `settings.navigation`             | 修改：About 后追加「标签」导航项                         |

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

- [ ] 后台激活 `oss-blog-theme` 后，截一张前台 + 后台的图放进来
- [x] ~~建 8 篇文章 + 3 个标签 + 2 个账号~~（2026-09-04 已注入模拟数据，3 作者 / 4 标签 / 8 文章，密码 ghost123）
- [x] ~~相关推荐布局修正~~（2026-09-04：推荐面板改 720px 对齐正文 + 卡片居中）
- [x] ~~标签总览页 `/tags/`~~（2026-09-04：新增 page-tags.hbs + 导航「标签」Tab，About 后面）
- [x] ~~阅读进度条改彩虹渐变~~（2026-09-04：单一主题色 → 彩虹渐变，scaleX 裁剪不压缩）
- [x] ~~作者主页改版博主风~~（2026-09-04：author.hbs 封面横幅 + 悬浮头像 + 文章数统计 + 社交图标 + 订阅按钮）
- [ ] 把"相关推荐"的实际效果截图（内容已就位，打开任一文章详情页即可看到）
- [ ] 写一篇带代码块的文章，验证复制按钮 + 返回顶部按钮效果（代码块文章目前还没带）
- [ ] GitHub 建仓、推送、开 PR、自审记录补全
- [ ] Live Demo 链接（如果部署到公网）
