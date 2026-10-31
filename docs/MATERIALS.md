# 项目材料索引

## 当前正式版

- 根目录 `src/`、`package.json`、`package-lock.json`、`edgeone.json`：已部署正式版源码和构建配置。
- [架构](ARCHITECTURE.md)：运行边界、数据流、接口、状态与代码入口。
- [运行与部署](GETTING_STARTED.md)：本地配置、检查和托管步骤。
- [验收记录](verification.md)、[结构化结果](verification-result.json)：两组真实线上检索的实际检查。
- [示例检索截图](assets/正式版-线上示例检索.jpg)、[独立问题概览](assets/正式版-线上独立问题概览.jpg)、[独立问题出处](assets/正式版-线上独立问题检索.jpg)、[初始空看板](assets/正式版-线上空看板.jpg)。

## 产品设计 v3

[设计主文档](product-design/医学问询产品设计_v3.md) 与 [给队友的阅读说明](product-design/00_给队友的阅读说明.md)。同目录还保留 Word、PDF、HTML，以及 PNG/SVG 流程图，方便阅读与编辑。

这份文档形成于正式版改造之前，其中预置资料、模拟样稿等描述属于当时的 Demo 设计。当前实现以源码和架构说明为准；待讨论项不等同于已经完成。

## 路演与制作工具

- [历史路演材料](../materials/pitch/README.md)：PPT、MP4 和截图归档。
- [制作工具说明](../tools/README.md)：PPT 生成、截图与演示录制脚本。
- [历史版本说明](../archive/README.md)：两个历史源码快照及匿名化的旧部署指令。

## 公开整理范围

上传内容经过凭据模式检查；本地环境变量文件没有读取或上传，公开配置模板为空白。未上传 Git 历史、依赖目录、构建缓存、云控制台截图和账号原始日志。旧预构建部署 ZIP 可以从对应源码重建，因此只保留历史源码快照。

公开副本中的本机用户路径、联系地址、域名验证值和云实例标识作了匿名化；Word/PPT 的作者元数据统一为 Project Team。源工作目录与备用演示版保持原样。文件校验清单见 [PUBLICATION_MANIFEST.json](../PUBLICATION_MANIFEST.json)。

