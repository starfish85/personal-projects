# 个人项目

自己做的产品和小项目合集。每个子目录是一个独立项目，默认分支始终是 `main`。

不要为每个项目单独开分支；以后有新项目，在 `main` 上新建文件夹，并在下面表格加一行。

## 产品

| 目录 | 说明 | 演示 |
| --- | --- | --- |
| [dafushan-guide](dafushan-guide) | 广州番禺大夫山森林公园适老化智能导览 | https://starfish85.github.io/personal-projects/dafushan-guide/ |
| [rike](rike) | 日课：练吉他计数、全屏曲谱、乐理笔记 | https://starfish85.github.io/personal-projects/rike/ |
| [moments-quotes](moments-quotes) | 片语：记下金句，发圈时按图配文 | https://starfish85.github.io/personal-projects/pianyu/ |

## 其他

| 目录 | 说明 |
| --- | --- |
| [wechat-checkin](wechat-checkin) | 暑假学校微信小程序签到打卡（AutoJs6，真实定位） |

## 练手

| 目录 | 项目 | 技术 |
| --- | --- | --- |
| [practice/expense-book](practice/expense-book) | 衣食住行记账 | 微信小程序 / 手机网页 |
| [practice/login-register-flow](practice/login-register-flow) | 注册登录（锁定 / 记住我） | Tkinter, MySQL, Redis, bcrypt |
| [practice/contact-manager-mysql](practice/contact-manager-mysql) | 通讯录 | Tkinter, MySQL |
| [practice/contact-manager-redis-cache](practice/contact-manager-redis-cache) | 通讯录 + Redis 缓存 | Tkinter, MySQL, Redis |
| [practice/notepad-persistence](practice/notepad-persistence) | 记事本（保存历史） | Tkinter, MySQL |
| [practice/drawing-board-mysql](practice/drawing-board-mysql) | 画板 | Tkinter, MySQL |
| [practice/calculator-history](practice/calculator-history) | 命令行计算器 | Python, MySQL |
| [practice/clock-mysql-logger](practice/clock-mysql-logger) | 终端时钟打点 | Python, MySQL |
| [practice/snake-game-mysql](practice/snake-game-mysql) | 贪吃蛇（记分） | Pygame, MySQL |
| [practice/shopping-cart](practice/shopping-cart) | 购物车 | Flask, MySQL |
| [practice/data-analysis](practice/data-analysis) | 订单数据看板 | MySQL, Matplotlib |
| [practice/order-analysis](practice/order-analysis) | 订单分析导出 | MySQL, Pandas |

## 以后怎么加项目

```text
personal-projects/
  README.md
  dafushan-guide/        ← 产品
  wechat-checkin/        ← 暑假打卡
  practice/              ← Python 练手
  your-new-app/          ← 新产品直接新建文件夹
```

1. 练手项目放到 `practice/`，产品放到仓库根目录的独立文件夹。
2. 项目自己的 README 写清楚怎么运行。
3. 回到根目录 README，把新项目加进对应表格。
4. 需要单独演示网址时，在对应项目里发布到本仓库的 `gh-pages`。大夫山演示：https://starfish85.github.io/personal-projects/dafushan-guide/ ；日课：https://starfish85.github.io/personal-projects/rike/
