# 大夫山森林公园智能导览

面向老年游客的适老化导览。当前是可手机打开的网页版（扫码即用），页面和交互按需求表原型来。微信小程序账号下来后，可以把同一套页面迁过去。

## 现在能做什么

- 首次进入选标准 / 超大 / 特大字体
- 首页：当前位置、搜索、地图入口、附近推荐
- 完整地图：按景点、厕所、休息、出口、餐饮筛选，点标注看卡片
- 地点详情 + 语音介绍
- 园内自定义路网导航（不依赖高德机动车路网）
- 真实 GPS；靠近景点约 55 米自动播讲解
- 「我的」里可改字号、语音、音量；室内演示可改成自选所在地点

点位按 2021 年《总体规划》附图整理，名称和位置待景区核对现状。

## 在电脑上打开

```bash
cd dafushan-guide
npm install
npm run dev
```

终端会给出本地地址。同一 Wi-Fi 下，手机浏览器打开它显示的局域网地址（形如 `http://192.168.x.x:5173`）。

## 固定网址（扫码即用）

线上地址：https://starfish85.github.io/personal-projects/dafushan-guide/

源码：https://github.com/starfish85/personal-projects/tree/main/dafushan-guide

这是 GitHub Pages 的 https 地址，电脑不用开着也能扫码打开。更新网页后在 `dafushan-guide` 目录运行 `./scripts/publish-pages.sh` 会重新发布。

## 现场演示（真定位必须用 https）

手机浏览器的 GPS 在普通 `http` 下通常不给，请用上面的固定网址。没有网或要改代码时，可在本机：

```bash
npm run build
npm run preview
```

没有账号时，可先在「我的」打开「室内演示」，自选「游客中心」等地点，不依赖 GPS 也能走完流程。

## 以后迁微信小程序

页面已经按小程序习惯拆开（进门、首页、地图、附近、详情、导航、我的）。有 AppID 后，可用 uni-app / 原生小程序按这些页面重做一层，定位改成 `wx.getLocation`。

## 你需要继续对接景区的材料

见 `资料/给景区工作人员的资料清单.md`。
