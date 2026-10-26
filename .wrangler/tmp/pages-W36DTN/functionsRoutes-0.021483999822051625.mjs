import { onRequestGet as __api_stats_js_onRequestGet } from "C:\\Users\\ADMIN\\Documents\\shophoaqua\\functions\\api\\stats.js"
import { onRequestPost as __api_track_js_onRequestPost } from "C:\\Users\\ADMIN\\Documents\\shophoaqua\\functions\\api\\track.js"

export const routes = [
    {
      routePath: "/api/stats",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_stats_js_onRequestGet],
    },
  {
      routePath: "/api/track",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_track_js_onRequestPost],
    },
  ]