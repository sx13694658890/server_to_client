/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** 开发代理目标，默认 http://127.0.0.1:8000 */
  readonly VITE_PROXY_TARGET: string;
  /** 设为 `true` 时使用 POST /api/v1/ai/chat/stream（SSE） */
  readonly VITE_AI_CHAT_USE_STREAM: string;
  /** 浮标位置：`left`（默认）或 `right` */
  readonly VITE_AI_CHAT_FAB_POSITION: string;
  /** SSE 流式「打字机」刷新间隔（毫秒），越大越慢、越明显 */
  readonly VITE_AI_CHAT_STREAM_TICK_MS: string;
  /** 农业遥感：高程 XYZ（{z}/{x}/{y}），Terrarium 或 Mapbox Terrain-RGB，见 `VITE_AGRI_DEM_ENCODING` */
  readonly VITE_AGRI_DEM_TILES?: string;
  /** `terrarium`（默认）| `mapbox` */
  readonly VITE_AGRI_DEM_ENCODING?: string;
  /** 可选影像 XYZ，叠在默认底图下 */
  readonly VITE_AGRI_BASEMAP_TILES?: string;
  /** 设为 `1`/`true` 时使用高德 web 瓦片（webst01–04，`style` 见下） */
  readonly VITE_AGRI_GAODE_BASEMAP?: string;
  /** 高德 `style` 参数，默认 `7`（与官网瓦片一致） */
  readonly VITE_AGRI_GAODE_STYLE?: string;
  /** 默认 https；设为 `false`/`0` 时用 http（易混内容被拦，不推荐） */
  readonly VITE_AGRI_GAODE_HTTPS?: string;
  /** 大于 0 时启用 MapLibre 三维地形（与高程源共用） */
  readonly VITE_AGRI_TERRAIN_EXAGGERATION?: string;
  /** TiTiler 服务基址 `{BASE}`，如 http://127.0.0.1:8008；与相对 TILEJSON/COG 拼接 */
  readonly VITE_TITILER_BASE_URL?: string;
  /** TiTiler：相对基址的 tilejson 路径（含 query），或完整 https URL */
  readonly VITE_AGRI_TITILER_TILEJSON_PATH?: string;
  /** TiTiler：数据源 URL，用于拼 `WebMercatorQuad/tilejson.json?...` */
  readonly VITE_AGRI_TITILER_COG_URL?: string;
  /** 瓦片边长，默认 256；须与 MapLibre tileSize 一致 */
  readonly VITE_AGRI_TITILER_TILESIZE?: string;
  readonly VITE_AGRI_TITILER_RESCALE?: string;
  readonly VITE_AGRI_TITILER_COLORMAP_NAME?: string;
  readonly VITE_AGRI_TITILER_OPACITY?: string;
  /** 可选：固定 `GET /agri/demo-bundle?region_id=`，省略则用服务端首个 demo 区域 */
  readonly VITE_AGRI_REGION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
