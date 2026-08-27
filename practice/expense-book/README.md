# 衣食住行记账

按伪代码实现的记账小程序：输入金额和备注，用关键字自动分成衣、食、住、行，找不到则归入其他。

核心仍是四个函数：`分类`、`记账`、`统计`、`记一笔`。

## 在手机上用（两种方式）

### 方式一：微信小程序（推荐）

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开本目录 `personal-projects/practice/expense-book`
3. 选择「小程序」，AppID 可先用测试号 / 游客模式
4. 点工具栏「预览」，用手机微信扫码

要长期在自己微信里用，去 [微信公众平台](https://mp.weixin.qq.com/) 注册一个小程序，把 `project.config.json` 里的 `"appid": "touristappid"` 换成你的 AppID。

### 方式二：手机浏览器（不用开发者工具）

电脑和手机连同一个 Wi-Fi，在本目录运行：

```bash
chmod +x start-phone.sh
./start-phone.sh
```

用手机浏览器打开脚本打印出的地址，例如 `http://192.168.x.x:8765/web/`。

- iPhone：Safari 打开后，点分享 → 添加到主屏幕
- Android：Chrome 打开后，点菜单 → 添加到主屏幕

这样主屏幕上会有一个图标，点开就像独立 App。

## 试几笔

- `28` + `午饭` → 食
- `15` + `滴滴` → 行
- `199` + `优衣库` → 衣
- `1200` + `房租` → 住
- `30` + `电影` → 其他

账本存在手机本地，关掉再开不会丢。

## 项目文件

- `utils/ledger.js`：四个核心函数
- `pages/index/`：微信小程序页面
- `app.js` / `app.json` / `app.wxss`：小程序入口
- `web/`：手机浏览器页面
- `start-phone.sh`：让手机访问电脑上的网页版

要让某类备注分得更准，去 `utils/ledger.js` 的 `关键字表` 里加词即可。
