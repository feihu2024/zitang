import { createSSRApp } from 'vue'
import App from './App.vue'
import { shareMixin } from './utils/share.js'

export function createApp() {
  const app = createSSRApp(App)
  // 全局分享 mixin：所有页面转发/分享到朋友圈时自动携带邀请码 invite=xxx
  app.mixin(shareMixin)
  return {
    app
  }
}
