# 桃李满天下交互地图

导师退休仪式纪念网页：从陕西杨凌出发，按毕业年份播放学生当前工作地，并同步显示姓名、届次和地点。

## 本地运行

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。仪式自动播放入口为：

```text
http://localhost:3000/?mode=ceremony
```

未配置高德 Key 时，页面使用内置演示线路图，时间轴和人物信息仍可正常使用。

## 配置高德地图

1. 在高德开放平台申请“Web端（JS API）”Key和安全密钥。
2. 将 `.env.example` 复制为 `.env.local`，自行填写两个值。
3. 生产环境将相同变量配置到服务器，不要提交 `.env.local`。
4. 在高德控制台配置正式域名白名单。

应用通过 `/_AMapService/*` 服务端代理附加安全密钥，浏览器不会收到 `AMAP_SECURITY_CODE`。`NEXT_PUBLIC_AMAP_KEY` 按高德JS API规范由浏览器使用。

## 数据维护

学生名单位于 `src/data/students.csv`：

```text
id,name,graduation_time,work_location,location_type,display_order
```

- `location_type` 只能填写 `domestic` 或 `overseas`。
- 月份不会影响届次，系统只提取年份。
- 地点坐标和行政区统计维护在 `src/data/locations.ts`。
- 修改后先运行 `npm test`，测试会检查重复、缺失年份及未知地点。

页面标题、导师姓名、杨凌起点和默认播放速度集中维护在 `src/data/site-config.ts`。`mentorName` 留空时页面不会显示导师姓名区域。

## 验证与构建

```powershell
npm test
npm run typecheck
npm run build
npm start
```

## 现场使用

- 建议使用最新版Chrome或Edge，1920×1080或3840×2160分辨率。
- 彩排时确认网络、高德域名白名单和全屏权限。
- 高德JS API只能在线加载，正式仪式应提前录制一份完整1080p播放视频作为断网备用。
- 对外发布前逐人复核姓名、毕业年份和当前工作地点，并确认已获得公开展示许可。
