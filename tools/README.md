# 历史素材制作工具

- `deck-tools/`：基于 PptxGenJS、React Icons 和 Sharp 生成路演 PPT。
- `video-tools/shots.mjs`：演示版页面截图脚本。
- `video-tools/record.mjs`：演示版自动流程录制与 FFmpeg 合成脚本。

这些脚本保留了原演示版选择器和自动演示流程。本轮没有重新执行它们，不能据此认定它们适配当前正式版。

PPT 脚本依赖外部 `pptx` skill 中的主题辅助函数，该辅助函数不在本项目中。公开副本用 `PPTX_SKILL_DIR` 替代了原本机绝对路径；如要复现，需要自行提供兼容目录。视频脚本默认使用 macOS 上安装的 Chrome，页面默认端口为历史演示的 3100。

制作结果已保存在 [路演材料](../materials/pitch/README.md)。当前应用运行不依赖这些工具。
