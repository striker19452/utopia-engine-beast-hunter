# 全场景覆盖记录

正式分支：`codex/atlas-interface`。21 组玩家界面已接入 C「猎场战图」；117 个状态点加 3 个补充分支，共生成 480 个尺寸与语言组合。

组合为 1440px 中文、390px 中文、768px 英文、320px 英文。检查结果：0 个布局/翻译/图片问题，0 个页面异常；每组代表画面另作构图与层级检查。状态点可包含多个相关条件，截图不表示该条目中的每种子分支都已单独完成整局。

主检查产物（运行测试后生成，Git 忽略）：[截图图集](../../outputs/atlas-review/index.html)、[机器检查报告](../../outputs/atlas-review/scene-checks.json)。另有全部怪物素描、三种巨兽性格与原始塔形的[补充检查](../../outputs/atlas-review/art-variant-checks.json)。

| 界面组 | 状态点 | 正式入口 | 代表桌面图 | 代表手机图 |
| --- | --- | --- | --- | --- |
| 开场与进入 | 3 / 已接入 | [index.html:81](../../index.html#L81) | [查看](../../outputs/atlas-review/cover-02-1440-zh.png) | [查看](../../outputs/atlas-review/cover-02-390-zh.png) |
| 主地图与全局状态 | 9 / 已接入 | [js/ui.js:7](../../js/ui.js#L7) | [查看](../../outputs/atlas-review/map-02-1440-zh.png) | [查看](../../outputs/atlas-review/map-02-390-zh.png) |
| 搜索选择 | 5 / 已接入 | [js/main.js:34](../../js/main.js#L34) | [查看](../../outputs/atlas-review/search-select-02-1440-zh.png) | [查看](../../outputs/atlas-review/search-select-02-390-zh.png) |
| 搜索掷骰与放置 | 6 / 已接入 | [js/search.js:14](../../js/search.js#L14) | [查看](../../outputs/atlas-review/search-place-02-1440-zh.png) | [查看](../../outputs/atlas-review/search-place-02-390-zh.png) |
| 搜索结算与继续 | 7 / 已接入 | [js/search.js:384](../../js/search.js#L384) | [查看](../../outputs/atlas-review/search-result-02-1440-zh.png) | [查看](../../outputs/atlas-review/search-result-02-390-zh.png) |
| 挑战巨兽与诱饵 | 5 / 已接入 | [js/main.js:68](../../js/main.js#L68) | [查看](../../outputs/atlas-review/hunt-bait-02-1440-zh.png) | [查看](../../outputs/atlas-review/hunt-bait-02-390-zh.png) |
| 战斗主流程 | 7 / 已接入 | [js/combat.js:6](../../js/combat.js#L6) | [查看](../../outputs/atlas-review/combat-02-1440-zh.png) | [查看](../../outputs/atlas-review/combat-02-390-zh.png) |
| 战斗物品与逃跑 | 6 / 已接入 | [js/combat.js:456](../../js/combat.js#L456) | [查看](../../outputs/atlas-review/combat-items-flee-02-1440-zh.png) | [查看](../../outputs/atlas-review/combat-items-flee-02-390-zh.png) |
| 战斗结果 | 4 / 已接入 | [js/combat.js:670](../../js/combat.js#L670) | [查看](../../outputs/atlas-review/combat-outcome-02-1440-zh.png) | [查看](../../outputs/atlas-review/combat-outcome-02-390-zh.png) |
| 建造与维修 | 7 / 已接入 | [js/main.js:233](../../js/main.js#L233) | [查看](../../outputs/atlas-review/build-repair-02-1440-zh.png) | [查看](../../outputs/atlas-review/build-repair-02-390-zh.png) |
| 长老奖励与物品恢复 | 4 / 已接入 | [js/build.js:568](../../js/build.js#L568) | [查看](../../outputs/atlas-review/elder-recharge-02-1440-zh.png) | [查看](../../outputs/atlas-review/elder-recharge-02-390-zh.png) |
| 锻造全过程 | 6 / 已接入；制图风锻造台已更新 | [js/main.js:264](../../js/main.js#L264) | [查看](../../outputs/forge-cartographic/1440-900-zh-rolled.png) | [查看](../../outputs/forge-cartographic/390-844-zh-rolled.png) |
| 合成与配方 | 4 / 已接入 | [js/main.js:298](../../js/main.js#L298) | [查看](../../outputs/atlas-review/craft-02-1440-zh.png) | [查看](../../outputs/atlas-review/craft-02-390-zh.png) |
| 行囊与装备 | 6 / 已接入 | [js/main.js:339](../../js/main.js#L339) | [查看](../../outputs/atlas-review/inventory-02-1440-zh.png) | [查看](../../outputs/atlas-review/inventory-02-390-zh.png) |
| 休息与日终 | 5 / 已接入 | [js/ui.js:756](../../js/ui.js#L756) | [查看](../../outputs/atlas-review/rest-day-end-02-1440-zh.png) | [查看](../../outputs/atlas-review/rest-day-end-02-390-zh.png) |
| 地区事件 | 6 / 已接入 | [js/events.js:214](../../js/events.js#L214) | [查看](../../outputs/atlas-review/events-02-1440-zh.png) | [查看](../../outputs/atlas-review/events-02-390-zh.png) |
| 巨兽袭击村庄 | 6 / 已接入 | [js/events.js:274](../../js/events.js#L274) | [查看](../../outputs/atlas-review/attacks-02-1440-zh.png) | [查看](../../outputs/atlas-review/attacks-02-390-zh.png) |
| 教学与机制提示 | 6 / 已接入 | [js/tutorial.js:40](../../js/tutorial.js#L40) | [查看](../../outputs/atlas-review/tutorial-02-1440-zh.png) | [查看](../../outputs/atlas-review/tutorial-02-390-zh.png) |
| 帮助与行动记录 | 4 / 已接入 | [js/main.js:621](../../js/main.js#L621) | [查看](../../outputs/atlas-review/help-journal-02-1440-zh.png) | [查看](../../outputs/atlas-review/help-journal-02-390-zh.png) |
| 保存/加载/新局 | 5 / 已接入 | [js/main.js:704](../../js/main.js#L704) | [查看](../../outputs/atlas-review/save-load-reset-02-1440-zh.png) | [查看](../../outputs/atlas-review/save-load-reset-02-390-zh.png) |
| 结局与计分 | 6 / 已接入 | [js/main.js:777](../../js/main.js#L777) | [查看](../../outputs/atlas-review/endings-02-1440-zh.png) | [查看](../../outputs/atlas-review/endings-02-390-zh.png) |

连续交互由完整教学测试及地图导航、读档往返、焦点/键盘返回、两次连续袭击、素材缺失测试验证；击杀顺序、战利品和蟹甲规则检查均通过。详细证据与检查边界见 [scene-coverage.json](scene-coverage.json)，组件约定和复验方式见 [README.md](README.md)。

后续改动需更新原状态点或新增状态点、补真实渲染 fixture，再重新生成图集。不能仅凭主地图截图将全局样式标记为通过。

库存分隔与完整战斗面板恢复另通过 [154 项同屏操作检查](../../outputs/viewport-workflows/checks.json)，包括多装备、事件、伏击和蟹甲并存；同骰交叠、交叠击杀与装备造成交叠等 15 项战斗顺序测试通过。

2026-10-30：锻造采用横版／手机版手绘锻造台，原掷骰和精炼格嵌入中央纸面。[56个锻造状态检查](../../outputs/forge-workbench/checks.json)覆盖中英文布局、真实掷骰交互、负数清列、精工／标准／失败、追加材料及缺图回退；同屏操作154项再次通过。新素材来源和完整提示词见 [forge-art.json](../../assets/atlas/forge-art.json)。旧 `outputs/atlas-review/forge-*` 保留为历史证据，本次画面以 `outputs/forge-workbench/` 为准。

随后按地图与村庄的「复古奇幻制图风」重绘两张素材，[14项接入检查](../../outputs/forge-cartographic/checks.json)通过。最新美术画面以 `outputs/forge-cartographic/` 为准，原掷骰交互与布局保留。
