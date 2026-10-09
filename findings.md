# Findings

- 工作区原先为空，项目在 `outputs/taoli-map` 从零创建。
- Node 22.22.0、npm、Git 可用；当前稳定包版本查询结果：Next 16.4.0、React 19.3.0、AMap Loader 1.0.1、Vitest 5.0.3。
- 高德 Loca 2.0 依赖 JS API 2.0，支持连接线、脉冲线、散点和镜头动画。
- 高德安全密钥生产环境应使用服务端代理；JS API 只允许在线加载，因此现场需要备用录屏。

