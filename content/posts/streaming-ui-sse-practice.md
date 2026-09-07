title: 做 AI 应用绕不开的一关：流式渲染怎么落地
slug: streaming-ui-sse-practice
tags: [前端, Agent]
excerpt: 打字机效果只是起点。真正的难点在断线、降级、Markdown 增量渲染和长会话的性能。
published_at: 2026-09-07 10:40:00

## 为什么必须流式

大模型生成一篇长回答要十几秒。如果等全部生成完再返回，用户盯着一个转圈的 loading 看十几秒，体验是灾难性的。

所以流式不是优化项，是必需品。而在前端，流式意味着你要处理一堆以前不用管的问题。

## SSE 还是 WebSocket

我的选择标准很简单：

- **只需要服务端往客户端推**（AI 对话、进度通知、实时日志）→ SSE
- **需要双向高频通信**（协作编辑、多人游戏、IM）→ WebSocket

AI 对话场景几乎全是单向的，SSE 更轻：它是普通 HTTP 请求，`EventSource` 原生支持，自带断线重连，走现有的 HTTP 基础设施不用额外配网关。

但 `EventSource` 有个硬伤：只能发 GET，不能带自定义请求头。一旦你的接口需要 Authorization 或者要 POST 一段长 prompt，就得换成 `fetch` + `ReadableStream` 自己解析。

## 自己解析流的基本骨架

用 `fetch` 拿到 `response.body`（一个 `ReadableStream`），然后手动读 chunk：

```js
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // SSE 以空行分隔事件，必须攒够一整个事件再处理
  const events = buffer.split('\n\n');
  buffer = events.pop();

  for (const evt of events) {
    const data = evt.split('\n')
      .filter(l => l.startsWith('data:'))
      .map(l => l.slice(5).trim())
      .join('\n');
    if (data === '[DONE]') return;
    append(JSON.parse(data).delta);
  }
}
```

这里最容易踩的坑是 **chunk 边界**。网络层不保证一次 `read` 就是一个完整的 SSE 事件，可能半个事件、可能三个事件。必须用 buffer 攒，按 `\\n\\n` 切，剩下的留在 buffer 里。我第一版没做这件事，结果大概每十条消息会出现一次 JSON 解析失败。

## 打字机不能太"真"

直接每收到一个 chunk 就 `setState` 一次，React 会疯狂重渲染，长回答到后面明显掉帧。

两个处理：

1. **攒批**：用 `requestAnimationFrame` 或者 16ms 的节流，把这段时间收到的 chunk 合并成一次更新
2. **长内容虚拟化**：回答超过一定长度后，Markdown 渲染的 DOM 节点会非常重，需要配合虚拟滚动或者只渲染可视区域

## Markdown 增量渲染的麻烦

AI 输出的是 Markdown，而且是**不完整的 Markdown**——你随时可能拿到半个代码块、半个表格、半个加粗符号。

直接每次全量重新解析整个字符串，简单但性能差；想做增量解析，要处理的边界情况多得离谱。

我的折中方案：对已完成的部分做缓存，只对"最后一个未闭合的块"做实时解析。代码高亮延迟到代码块闭合后再做，避免每帧都跑一遍语法分析。

## 断线和降级

生产环境必须考虑的事情：

- **主动重连**：`EventSource` 自带，但 fetch 方案要自己做，建议指数退避
- **断点续传**：把已接收的内容长度记下来，重连时告诉服务端从哪里继续（前提是服务端支持）
- **优雅降级**：流式接口挂了，能不能退回一次性返回？哪怕慢，也别让用户看到错误页
- **用户主动中断**：AbortController 取消请求，同时通知服务端停止生成——这一点很重要，Token 是真金白银

## 状态机比布尔值靠谱

一个 AI 对话界面至少有这些状态：空闲、等待首 token、流式接收中、中断中、出错、已完成。

用三个布尔值（`isLoading` / `isStreaming` / `isError`）去管理，迟早会出现互相矛盾的组合。我后来换成了显式的状态机，UI 渲染只依赖当前状态，逻辑一下就清爽了。

## 小结

流式渲染看着是个小功能，真做完整会发现它牵扯到网络层、状态管理、渲染性能和错误处理。

这也是为什么现在很多团队招"AI 前端"时，会专门问这一块——因为它没法靠调库解决，只能靠自己踩过坑。
