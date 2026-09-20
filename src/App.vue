<script>
import { saveInviteCode, devAutoLogin } from '@/utils/auth.js'
import { loadGlobalShareCard } from '@/utils/share.js'

export default {
  onLaunch(options) {
    // 解析分享携带的邀请码（小程序分享卡片 / H5 链接均通过 invite 参数传递）
    const invite = (options && options.query && options.query.invite) || ''
    if (invite) saveInviteCode(invite)
    // #ifdef H5
    // H5 兜底：直接从地址栏解析（部分入口 options 不携带 query）
    if (!invite) {
      const m = (window.location.search || '').match(/[?&]invite=([^&]+)/)
      if (m) saveInviteCode(decodeURIComponent(m[1]))
    }
    // #endif
    // 拉取全局分享卡片配置（灵活参数 → 系统参数），供全局分享 mixin 使用
    loadGlobalShareCard()
    // #ifdef H5
    // H5 开发预览：未登录时自动以调试会员「路飞」身份登录
    devAutoLogin()
    // #endif
  },
  onShow() {
    // 应用显示
  },
  onHide() {
    // 应用隐藏
  }
}
</script>

<style lang="scss">
/* ===== 全局样式（跨端通用） ===== */
page {
  --green: #20b768;
  --deep-green: #176c39;
  --soft-green: #eaf8ef;
  --orange: #ff6b25;
  --red: #ff3b42;
  --ink: #202322;
  --muted: #7d837f;
  --line: #edf0ed;
  background: #f7f8f6;
  color: #202322;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
}

view, text, image, scroll-view, button, input {
  box-sizing: border-box;
}

button::after {
  border: 0;
}

/* ===== 通用工具类 ===== */
.muted { color: var(--muted); }
.red { color: var(--red); }
.green { color: var(--green); }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 30rpx rgba(25, 64, 38, 0.06);
}

.safe-top {
  height: calc(28rpx + env(safe-area-inset-top));
}

/* 搜索框通用样式 */
.search-box {
  height: 74rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 0 24rpx;
  border-radius: 40rpx;
  background: #fff;
  color: #9b9f9c;
}

.search-icon {
  width: 30rpx;
  height: 30rpx;
  border: 4rpx solid #909691;
  border-radius: 50%;
  position: relative;
  flex: none;
}
.search-icon::after {
  content: '';
  width: 14rpx;
  height: 4rpx;
  background: #909691;
  position: absolute;
  right: -11rpx;
  bottom: -6rpx;
  transform: rotate(45deg);
  border-radius: 2rpx;
}
.search-input {
  flex: 1;
  height: 74rpx;
  font-size: 26rpx;
}

/* 圆角胶囊按钮 */
.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  white-space: nowrap;
}

/* 页面根容器 */
.page {
  min-height: 100vh;
  padding-bottom: calc(126rpx + env(safe-area-inset-bottom));
}

/* 主色调按钮 */
.primary-btn {
  background: linear-gradient(90deg, #ff6b25, #ff3b42);
  color: #fff;
  border-radius: 999rpx;
  font-weight: 700;
  text-align: center;
}
</style>
