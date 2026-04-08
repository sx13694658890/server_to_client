# TiTiler 栅格图层 · 前端说明（MapLibre）

本文件补充 **MapLibre GL JS** 对接要点；**路径、接口、调试** 以 **[前端对接指南.md](./前端对接指南.md)** 为准（本仓库 TiTiler 为根路径 `TilerFactory`，**无** `/cog` 前缀）。

官方渲染参数：[TiTiler User Guide — Rendering](https://developmentseed.org/titiler/user_guide/rendering/#rescaling)。

---

## 1. 与对接指南的关系

| 对接指南 | 本仓库 `web` 环境变量 |
|----------|----------------------|
| `{BASE}` | `VITE_TITILER_BASE_URL`（无尾斜杠） |
| `GET {BASE}/WebMercatorQuad/tilejson.json?url=...&tilesize=256` | 由 `VITE_AGRI_TITILER_COG_URL` 自动拼接，或由 `VITE_AGRI_TITILER_TILEJSON_PATH` 手写相对路径 / 完整 URL |
| 瓦片 | TileJSON 返回的 `tiles` 模板，须与 `tilesize`、查询参数一致 |

---

## 2. MapLibre：TileJSON → raster 源

```ts
const tileJsonUrl = `${import.meta.env.VITE_TITILER_BASE_URL}/WebMercatorQuad/tilejson.json?${params}`;
// params 须含 encodeURIComponent(url) 的数据源地址，及 tilesize=256 等，见 前端对接指南.md

const res = await fetch(tileJsonUrl, { mode: 'cors', credentials: 'omit' });
const tilejson = await res.json();

map.addSource('ndvi-layer', {
  type: 'raster',
  tiles: tilejson.tiles,
  tileSize: tilejson.tileSize ?? 256,
  bounds: tilejson.bounds,
  minzoom: tilejson.minzoom,
  maxzoom: tilejson.maxzoom,
});
```

若此前使用 **Docker 官方镜像** 的 `/cog/WebMercatorQuad/...`，现改为 **`/WebMercatorQuad/...`**，否则 TileJSON 会 **404**。

---

## 3. 本仓库默认开发配置

见 `apps/web/.env.development` 与 **[前端对接指南.md](./前端对接指南.md) §3.2、§5**。

- 默认 `VITE_AGRI_TITILER_COG_URL` 为 OSGeo 公网样例，**与农业演示地块地理位置无关**，仅验证链路。  
- 未配置 COG / TileJSON 时地图仍可用，不叠加 TiTiler 栅格。

---

## 4. 错误与弱网（验收对齐）

| 情况 | 建议 |
|------|------|
| TileJSON **404** | 核对 `{BASE}/docs` OpenAPI；路径应为 `/{tileMatrixSetId}/tilejson.json`，**不要**再拼 `/cog`。 |
| CORS | 对接指南 §5；开发期服务端可放宽，生产收紧域名。 |
| 422 / 缺 `url` | 查询串须包含 `url=`，且整体编码正确。 |

更多见 [REQUIREMENTS.md](./REQUIREMENTS.md) §4.1。

---

## 5. 关联文档

- **权威接口说明**：[前端对接指南.md](./前端对接指南.md)  
- 需求对照：[REQUIREMENTS.md](./REQUIREMENTS.md)  
- TiTiler 官方：[Getting Started](https://developmentseed.org/titiler/user_guide/getting_started/)
