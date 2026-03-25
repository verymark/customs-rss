# 海关总署页面变化监控 RSS

目标页面：
`http://www.customs.gov.cn/customs/302249/zfxxgk/fdzdgknr/302274/index.html`

## 目标

**不抓正文，只做变化通知。**

也就是说：
- 只要页面可见内容 / 列表标题 / 链接集合发生变化
- 就往 RSS 里追加一条“页面发生变化”的提醒
- 不在 RSS 里保存全文正文

## 为什么这样更合适

该页面存在反爬 / JS 挑战，普通 HTTP 抓取不稳定。  
如果你的需求只是“有变化就提醒”，最稳的方式不是保存全文，而是：

> **监控页面签名（signature）**

这个 signature 可以来自：
- 页面可见标题列表
- 页面链接列表
- 你手工复制出来的一小段页面目录文本

## 当前脚本怎么用

把你拿到的“页面签名文本”保存成 `latest.txt`，然后运行：

```bash
python3 update_feed.py --text-file latest.txt
```

如果和上次不同：
- `feed.xml` 会新增一条 item
- item 只写“页面发生变化”，不保存正文

如果没变化：
- 输出 `NO_CHANGE`

## 自动更新

仓库已接入 GitHub Actions：
- 每天上午 9:15（北京时间）自动检查一次
- 也支持手动触发 `workflow_dispatch`
- 用 Playwright（Chromium）取页面签名
- 有变化才更新 `feed.xml` 与 `state.json`

工作流文件：
- `.github/workflows/monitor.yml`

核心脚本：
- `monitor.mjs`

## 导入 Inoreader

把 `feed.xml` 放到一个公网可访问地址后，把该 URL 导入 Inoreader 即可。
