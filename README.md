# Mini Apps 🪄

轻量、纯静态、开箱即用的前端小工具与趣味互动 Web 应用合集。  
零服务端依赖，无需配置复杂构建环境，双击 HTML 或托管在静态托管（如 GitHub Pages / Vercel / Cloudflare Pages）即可运行。

- 🌐 **GitHub Pages 在线体验**：[https://selfr7.github.io/mini-apps/](https://selfr7.github.io/mini-apps/)
- 🏠 **selfr.work 官方直达**：[https://selfr.work](https://selfr.work)

---

## 🗂 收录工具列表与在线体验

| 工具名称 | 源码目录 | 类型 | GitHub Pages 直达 | selfr.work 官方直达 |
| :--- | :--- | :--- | :--- | :--- |
| **🐾 猫咪抓鱼** | [`catch-fish/`](./catch-fish/) | 互动游戏 | [在线体验](https://selfr7.github.io/mini-apps/catch-fish/) | [selfr.work/tools/catch-fish/](https://selfr.work/tools/catch-fish/) |
| **🔮 今日塔罗** | [`tarot/`](./tarot/) | 灵感生活 | [在线体验](https://selfr7.github.io/mini-apps/tarot/) | [selfr.work/tools/tarot/](https://selfr.work/tools/tarot/) |
| **🎨 3:4 竖屏图文排版** | [`cover-styler/`](./cover-styler/) | 效率工具 | [在线体验](https://selfr7.github.io/mini-apps/cover-styler/) | [selfr.work/tools/cover-styler/](https://selfr.work/tools/cover-styler/) |

---

## ✨ 工具特性详情

### 1. 🐾 猫咪抓鱼 (`/catch-fish/`)
- **多模式切换**：支持小丑鱼 🐠、小黄鸡 🐥、小仓鼠 🐹 三种动态猎物。
- **自定义设置**：支持自定义猫主子昵称、猫爪花色（白手套、橘猫、黑猫、三花）、游动速度与数量。
- **音效与触控**：内置抓捕音效与真实小肉垫视觉反馈，防误触 HUD 设计。
- **战报海报生成**：一键生成 3:4 比例精致战绩海报，评定捕猎段位并可直接保存到相册或本地下载。

### 2. 🔮 今日塔罗 (`/tarot/`)
- **沉浸式抽牌体验**：洗牌、切牌、翻牌完整动效交互。
- **完整 78 张牌意体系**：内置 22 张大阿卡纳与 56 张小阿卡纳（权杖、圣杯、宝剑、星币）全套卡面与原创深度解析（正逆位启示、象征要素与心理学视角）。
- **随时查阅牌意图鉴**：无需抽牌，首页即可按分类查阅全部 78 张牌意，支持随时切换正逆位解读。
- **直觉笔记**：支持抽牌后记录当下感受与联想。
- **卡片渲染导出**：Canvas 合成高清分享卡片，一键保存至本地。

### 3. 🎨 3:4 竖屏图文排版 (`/cover-styler/`)
- **标准 3:4 竖屏比例**：专为移动端卡片与封面图设计。
- **免费商用精品字体**：内置落霞文楷、得意黑、阿里妈妈数黑体等中文字体 CDN。
- **灵活样式标记**：支持通过 `*重点词*` 等语法快速高亮关键字，支持主副标题字号、字距、描边与阴影微调。
- **多图批量处理**：支持一次性拖入多张背景图片批量排版预览并打包导出。
- **模板导入导出**：支持将排版参数保存为 JSON 模板文件，方便复用。

---

## 🚀 本地运行方式

本项目为纯静态结构，无需执行 `npm install`。

1. **直接打开**：用浏览器直接双击打开任意目录下的 `index.html`。
2. **本地静态服务（推荐）**：
   ```bash
   # 使用 Python 快速启动本地服务
   python -m http.server 8000
   
   # 或者使用 npx serve
   npx serve .
   ```
   随后在浏览器访问 `http://localhost:8000` 即可通过导航页访问所有工具。

---

## 🌐 部署至 GitHub Pages

1. 将仓库 Push 到 GitHub；
2. 进入仓库 **Settings** -> **Pages**；
3. **Branch** 选择 `main` 分支，目录选择 `/ (root)`，点击 **Save**；
4. 等待 1~2 分钟，即可通过 `https://selfr7.github.io/mini-apps/` 在线体验全部工具。

---

## 📄 License

本项目采用 [MIT License](./LICENSE) 开源。
