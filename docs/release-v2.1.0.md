# v2.1.0 发布检查

版本：2.1.0；发布日期：2026-10-31；存档格式：schema 1，保持兼容。

本次发布包含猎场战图、交互村庄与塔楼六格血量、手绘锻造台和合成台、三地横竖版搜索地形、13格随身物品带、精工轮廓金光，以及战斗掉落材料展示。改动与素材说明见 [版本记录](../CHANGELOG.md) 和 [视觉实施约定](../design/atlas-system/README.md)。

发布前检查均通过：

| 检查 | 结果 | 可复现脚本 |
| --- | --- | --- |
| 版本、README、版本记录、运行依赖和奖励规则 | 11项 | `scripts/audit_release.js` |
| 中英文及官方术语 | 无残留或不一致 | `scripts/audit_i18n.js`、`scripts/audit_official_terms.js` |
| 战斗顺序 | 15项 | `scripts/test_combat_order.js` |
| 普通／恐怖巨兽奖励与蟹甲 | 通过 | `scripts/test_combat_rewards.js`、`scripts/test_crab_plate.js` |
| 日终、胜负、袭击与存档边界 | 52项 | `scripts/test_day_end_victory.js` |
| 完整响应式矩阵 | 442组，0项失败 | `scripts/test_responsive_layout.js` |
| 地区事件与恢复 | 12组 | `scripts/test_region_events.js` |
| 完整14天游戏 | 桌面中文及手机英文均216分 | `scripts/test_full_gameplay.js` |
| 存档保护、战死、怀疑上限和超时 | 通过 | `scripts/test_full_gameplay.js` |
| 离线发布包 | 桌面中文、手机英文均通过 | `scripts/test_release_package.js` |

本次功能实现期间另通过：搜索地形210项／30组流程、合成台90项／10组流程、战斗掉落280项／7组流程、装备带35项／7组流程、村庄24个画面／6组流程、原掷骰同屏154项和完整新手教学。各测试脚本随源码保留；可再生成的截图与JSON报告位于忽略提交的 `outputs/`。

离线包由 `python3 scripts/package_release.py` 生成。压缩包仅含 `UEBH-v2.1.0/` 一个顶层目录，共77个文件；包含入口、样式、脚本、运行素材、README和版本记录，不包含开发脚本、Git目录、截图或旧版本ZIP。压缩包CRC和每个文件内容校验通过，且使用实际解压后的 `file://` 页面验证三地搜索、横竖版背景、锻造、合成、战斗掉落、版本显示、保存及2.0.0存档恢复。摘要随GitHub发行版提供。
