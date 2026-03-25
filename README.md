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

## 以后可以升级的方向

如果你后面想自动化，我可以再帮你接：
- 浏览器自动读取页面可见标题 / 列表
- 自动生成 signature
- 自动更新 RSS

## 导入 Inoreader

把 `feed.xml` 放到一个公网可访问地址后，把该 URL 导入 Inoreader 即可。
