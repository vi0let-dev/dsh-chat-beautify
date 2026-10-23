# dsh-chat-beautify

给 DeepSeek Harness（DSH）Web 会话界面加一层可切换的视觉预设：**柔光 / 纸感 / 紧凑**。

它只覆盖 DSH 自己的设计令牌（配色、圆角、行高），不改动消息 DOM、不注册工具、不联网、不写 Host 配置。

> 状态：源码已完成并通过结构校验与 16 项单元测试；**尚未在你的 DSH 中安装、启用或做视觉验证**。安装与验收由你自行完成。

---

## 功能

| 预设 | 观感 |
|---|---|
| **柔光** | 暖白底色、更大的圆角与更柔和的边界，阅读更松弛 |
| **纸感** | 低对比度、细边框、更宽行距，接近纸张 |
| **紧凑** | 更紧的行高、更小的圆角、更高的信息密度 |
| **关** | 移除根节点属性，立即恢复 DSH 原始外观 |

每个预设都分别定义了**明亮模式与深色模式**两套取值，跟随 DSH 主题切换，不会出现深色模式下刺眼的情况。

切换入口在输入框下方的统计条区域（`conversation.composer.dock`），是一组很小的按钮：`关 / 柔光 / 纸感 / 紧凑`。

---

## 环境要求

- DSH `>=0.2.1-rc.2 <0.3.0`（`package.json` 的 `engines.dsh`）
- Node.js `^22.19.0 || >=24.0.0`
- 仅适用于 Web 界面（`dsh.client.platform = "web"`）

插件没有运行时依赖；`react` 由 DSH 浏览器模块表提供，不额外打包第二份 React。

---

## 安装

仓库地址：<https://github.com/vi0let-dev/dsh-chat-beautify>

**方式一：界面安装（推荐）**

1. 侧边栏 → **插件** → **添加插件**
2. 输入 `github:vi0let-dev/dsh-chat-beautify`
3. 按提示启用，完全退出 DSH 并重启，然后硬刷新页面（Windows/Linux `Ctrl+F5`，macOS `Cmd+Shift+R`）
4. 会话输入框下方的统计条出现 `关 / 柔光 / 纸感 / 紧凑` 四个小按钮，即安装成功

**方式二：命令行安装**

```powershell
# 先确认自己的 profile 名，不要照抄别人的
$env:DSH_PROFILE

dsh plugin --profile <profile> add github:vi0let-dev/dsh-chat-beautify
```

等仓库打过 tag 之后，可以锁定版本安装：

```powershell
dsh plugin --profile <profile> add github:vi0let-dev/dsh-chat-beautify#v0.1.0
```

**方式三：本地开发调试**

```powershell
dsh plugin --profile <profile> add "C:\path\to\dsh-chat-beautify"
```

本地目录是链接安装，**不要移动或删除原目录**，否则插件随之失效。

**升级**：GitHub 直装会在 profile 里放一份副本，本仓库更新后需要重新执行一次 `dsh plugin ... add` 才会生效；本地链接安装改完刷新页面即可。

**卸载 / 恢复原始外观**：在插件页停用并卸载，重启 DSH 后刷新页面。插件卸载时会移除根节点属性，样式表由 DSH 客户端模块系统回收，残留的只有 localStorage 里的一个键（见下方「配置」）。

> 以上命令需要你自己执行：本仓库不包含任何安装脚本，也不会自动修改你的 profile。

---

## 配置

没有 Host 配置项，`cordis.patch.yml` 里的 `config` 保持空对象。

唯一持久化的数据是浏览器里的一项：

| 键 | 值 | 说明 |
|---|---|---|
| `dsh-chat-beautify:preset` | `off` / `soft` / `paper` / `compact` | 当前预设，仅存在本机浏览器 localStorage |

- 默认预设是 `soft`（柔光）。
- 存储不可用（隐私模式、禁用 storage、配额满）时会静默回退到默认预设，不会阻断界面渲染。
- 想清空选择：在浏览器控制台执行 `localStorage.removeItem('dsh-chat-beautify:preset')` 后刷新。

---

## 测试

```bash
node test/client.test.mjs      # 16 项测试，直接运行（无需 spawn 子进程）
```

也可以 `node --test test`，但在某些受限制的沙箱里跑测试 runner 会因 `spawn EPERM` 失败，直接执行测试文件即可。

测试覆盖：模块注册 id、Slot 注册参数、预设归一化与非法值回退、localStorage 异常兜底、关闭预设、清理函数、样式表去重、明暗双套令牌是否存在、切换器渲染与点击副作用，以及"不含网络 / eval / HTML 注入"的静态断言。

---

## 安全与隐私

- **不联网**：没有 `fetch`、`XMLHttpRequest`、WebSocket。
- **不执行动态代码**：没有 `eval`、`new Function`、`innerHTML`。
- **不读文件、不调 Host 接口、不注册工具**。
- **不采集数据**：没有遥测、没有上报；只写一个 localStorage 键。
- 样式通过 `document.head` 中的 `<style data-plugin="dsh-chat-beautify">` 注入，与官方 `ui-theme` 的做法一致。

---

## 已知限制（请先读）

1. **作用范围依赖两个锚点**：样式写在 `[data-conversation-scroll]` 与 `[data-composer-seat]` 上。这两个属性来自 DSH 自带会话样式；如果未来版本改名，**插件会安静地不生效**，而不会破坏布局。
2. **只影响会话区**：侧边栏、设置页、终端等区域保持 DSH 原样。
3. **不改字号**：字号由你在「设置 → 通用」里控制，插件只覆盖行高与颜色，避免和你的字体设置打架。
4. **不做动画**：消息入场、悬停过渡需要逐元素选择器，DSH 的类名是构建期哈希（如 `cJsG2q_bubble`），写死会在升级后失效，因此本插件刻意不做。
5. **不做逐条消息装饰**：头像、时间戳、分隔线需要消息级 Slot 或稳定选择器，当前没有文档化的钩子，同样不做。
6. **未做运行验证**：本仓库只做了静态核对与单元测试。槽位是否正常渲染、三种预设的实际观感，需要在真实 DSH 中由你确认。

---

## 目录结构

```text
dsh-chat-beautify/
├── package.json          # bundle 声明：dsh.bundle.patch + dsh.client
├── cordis.patch.yml      # 把插件插入 profile 组合树
├── index.js              # Host 半边：空实现（本插件没有 Host 逻辑）
├── client.js             # 全部实现：令牌层 + Style 注入 + dock 切换器
├── locale/{zh,en}.json   # 插件管理器显示的标题与描述
├── icon.svg              # 插件图标
├── test/client.test.mjs  # node:test + node:vm 行为测试
└── README.md
```

## 改造预设

三套令牌都集中在 `client.js` 顶部的 `CSS` 字符串里，按 `html[data-chat-beautify='soft'|'paper'|'compact']` 分块，明亮与深色各一段。改值即改观感；新增预设需要同时更新 `PRESETS` 数组（按钮与校验都读它）。

---

## 许可证

MIT，见 [LICENSE](LICENSE)。
