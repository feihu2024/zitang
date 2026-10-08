<template>
  <view class="page share-page">
    <view class="safe-top"></view>

    <!-- 顶部导航：返回 / 标题 / 页码 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">‹</view>
      <text class="nav-title">分享好友</text>
      <text v-if="posters.length" class="nav-count">{{ active + 1 }} / {{ posters.length }}</text>
    </view>

    <view class="share-shell">
      <!-- 加载中 -->
      <view v-if="loading" class="share-state">
        <view class="loading-ring"></view>
        <text class="state-text">海报加载中...</text>
      </view>

      <!-- 沉浸式大图预览 -->
      <template v-else-if="posters.length">
        <view class="stage" @touchstart="onTouchStart" @touchend="onTouchEnd">
          <view v-for="(poster, index) in posters" :key="poster.key" class="poster-card"
            :class="{ current: index === active }">
            <image class="poster-img" :src="poster.imageUrl" mode="aspectFill" />
            <!-- 按管理端配置的百分比位置叠加二维码（接口 erwpic）：有图用 image，否则用 CSS 占位 -->
            <image v-if="poster.shareImageUrl" class="poster-qr" :src="poster.shareImageUrl" mode="aspectFit"
              :style="{ left: poster.qrX + '%', top: poster.qrY + '%', width: poster.qrW + '%', height: poster.qrH + '%' }" />
            <view v-else class="poster-qr"
              :style="{ left: poster.qrX + '%', top: poster.qrY + '%', width: poster.qrW + '%', height: poster.qrH + '%' }">
            </view>
          </view>
          <view v-if="posters.length > 1" class="stage-arrow prev" @tap="move(-1)">‹</view>
          <view v-if="posters.length > 1" class="stage-arrow next" @tap="move(1)">›</view>
        </view>

        <!-- 海报信息（图下居中，深色轻文案） -->
        <view class="stage-meta">
          <text class="meta-name">{{ posters[active] && posters[active].name }}</text>
          <text v-if="posters[active] && posters[active].slogan" class="meta-slogan">{{ posters[active].slogan }}</text>
          <text v-if="fromFallback" class="meta-note">示例海报 · 后台配置后自动替换</text>
        </view>
      </template>

      <!-- 空状态 -->
      <view v-else class="share-state">
        <view class="state-icon">▣</view>
        <view class="state-text">海报库暂无内容</view>
        <view class="state-sub">请在管理后台「分享海报」中上传海报底图</view>
      </view>
    </view>

    <!-- 底部操作栏：次操作一行 + 主按钮通栏 -->
    <view class="share-actions">
      <view class="sub-row">
        <view class="sub-btn" @tap="shareTimeline">
          <text class="sub-icon">◎</text>
          <text class="sub-label">朋友圈</text>
        </view>
        <view class="sub-btn" @tap="savePoster">
          <text class="sub-icon">▣</text>
          <text class="sub-label">保存相册</text>
        </view>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <button class="main-btn" open-type="share">分享好友</button>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <view class="main-btn" @tap="shareToFriend">分享好友</view>
      <!-- #endif -->
    </view>

    <!-- 隐藏 canvas：用于合成底图 + 二维码，供保存和分享使用 -->
    <canvas id="poster-canvas" type="2d" class="compose-canvas" />
  </view>
</template>

<script>
import { get, resolveAssetUrl } from '@/utils/api.js'
import { getMyInviteCode, isLoggedIn } from '@/utils/auth.js'

// 后端未配置海报时的内置示例（与交互原型 E-25 一致，仅作预览兜底）
const FALLBACK_POSTERS = [
  { key: 'fb-1', name: '把自然的好\n分享给你', slogan: '植萃生活 · 温和洗护新选择', imageUrl: '/static/promo-plant.jpg', qrX: 75.2, qrY: 85.1, qrW: 20, qrH: 12, fallback: true },
  { key: 'fb-2', name: '一缕花香\n开启好心情', slogan: '精选植萃 · 清新留香', imageUrl: '/static/product-rose.jpg', qrX: 75.2, qrY: 85.1, qrW: 20, qrH: 12, fallback: true },
  { key: 'fb-3', name: '今日好物\n值得被看见', slogan: '扫码进入植萃生活小程序', imageUrl: '/static/detail-hero.jpg', qrX: 75.2, qrY: 85.1, qrW: 20, qrH: 12, fallback: true },
  { key: 'fb-4', name: '生活有光\n分享有礼', slogan: '邀请好友 · 一起收获绿色惊喜', imageUrl: '/static/promo-cup.jpg', qrX: 75.2, qrY: 85.1, qrW: 20, qrH: 12, fallback: true }
]

export default {
  data() {
    return {
      posters: [],
      active: 0,
      loading: true,
      touchStartX: null,
      inviteCode: '',
      fromFallback: false,
      composedPath: '',    // 当前选中海报的合成图临时路径
      composing: false     // 是否正在合成
    }
  },
  onShow() {
    this.inviteCode = getMyInviteCode() || ''
    this.loadPosters()
  },
  watch: {
    // 切换海报时预合成，保证分享/保存拿到合成图
    active() {
      this.preCompose()
    }
  },
  onShareAppMessage() {
    const invite = this.inviteCode
    const poster = this.posters[this.active]
    // 分享语：后台配置的优先，留空用默认文案
    const title = (poster && poster.shareTitle) || '我邀请你加入植萃生活，一起拼团省更多'
    // 分享图：优先用预合成的底图+二维码合成图
    const result = {
      title,
      path: '/pages/home/index' + (invite ? '?invite=' + invite : '')
    }
    if (this.composedPath) {
      result.imageUrl = this.composedPath
    } else {
      // 兜底：预合成还没好，用底图
      const img = poster ? poster.imageUrl : ''
      if (img && img.indexOf('http') === 0) result.imageUrl = img
    }
    return result
  },
  methods: {
    // 拉取已启用海报；后端无数据时回退到内置示例保证页面可交互
    async loadPosters() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/posters')
        const items = resp.items || []
        // 二维码图：顶层 resp.erwpic 为全部海报共用；单个 item 也可自带 erwpic 覆盖
        const globalQr = resolveAssetUrl(resp.erwpic || '')
        if (items.length) {
          this.posters = items.map((p) => ({
            key: 'p-' + p.id,
            id: p.id,
            name: p.name,
            slogan: p.slogan || '',
            imageUrl: resolveAssetUrl(p.imageUrl),
            qrX: p.qrX != null ? p.qrX : 75.2,
            qrY: p.qrY != null ? p.qrY : 85.1,
            qrW: p.qrW || 20,
            qrH: p.qrH || 12,
            shareTitle: p.shareTitle || '',
            // item 级 erwpic 优先 → 顶层 erwpic → 旧字段 shareImageUrl 兜底
            shareImageUrl: p.erwpic
              ? resolveAssetUrl(p.erwpic)
              : (globalQr || (p.shareImageUrl ? resolveAssetUrl(p.shareImageUrl) : ''))
          }))
          this.fromFallback = false
        } else {
          this.posters = FALLBACK_POSTERS
          this.fromFallback = true
        }
        if (this.active >= this.posters.length) this.active = 0
      } catch (e) {
        console.error('加载海报失败:', e)
        this.posters = FALLBACK_POSTERS
        this.fromFallback = true
      } finally {
        this.loading = false
        // 海报加载完成（或 fallback）后，预合成当前选中的一张
        this.preCompose()
      }
    },
    // 切换上一张 / 下一张（循环）
    move(step) {
      const n = this.posters.length
      if (!n) return
      this.active = (this.active + step + n) % n
    },
    onTouchStart(e) {
      this.touchStartX = e.touches[0].clientX
    },
    onTouchEnd(e) {
      if (this.touchStartX === null) return
      const distance = e.changedTouches[0].clientX - this.touchStartX
      if (Math.abs(distance) > 35) this.move(distance < 0 ? 1 : -1)
      this.touchStartX = null
    },
    // 分享需要邀请码：未登录时引导到个人中心
    needLogin() {
      if (isLoggedIn() && this.inviteCode) return true
      uni.showToast({ title: '请先登录获取邀请码', icon: 'none' })
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/profile/index' })
      }, 800)
      return false
    },
    // H5：复制带邀请码的首页链接
    shareToFriend() {
      if (!this.needLogin()) return
      const link = 'http://localhost:5173/?invite=' + this.inviteCode
      uni.setClipboardData({
        data: link,
        success: () => uni.showToast({ title: '邀请链接已复制', icon: 'success' })
      })
    },
    // 朋友圈：小程序端通过右上角菜单分享，H5 端复用复制链接
    shareTimeline() {
      // #ifdef MP-WEIXIN
      if (!this.needLogin()) return
      uni.showToast({ title: '已生成分享卡片，请点右上角 ··· 分享到朋友圈', icon: 'none' })
      // #endif
      // #ifdef H5
      this.shareToFriend()
      // #endif
    },
    // 保存相册：合成底图+二维码后保存
    async savePoster() {
      const poster = this.posters[this.active]
      if (!poster) return
      uni.showLoading({ title: '正在生成海报...' })
      try {
        const composed = await this.composePoster(poster)
        uni.hideLoading()
        // #ifdef MP-WEIXIN
        uni.saveImageToPhotosAlbum({
          filePath: composed,
          success: () => uni.showToast({ title: '海报已保存到相册', icon: 'success' }),
          fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
        })
        // #endif
        // #ifdef H5
        uni.previewImage({ urls: [composed] })
        // #endif
      } catch (e) {
        uni.hideLoading()
        console.error('保存海报失败:', e)
        uni.showToast({ title: '生成海报失败', icon: 'none' })
      }
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/home/index' })
      }
    },
    // ----- 以下为 canvas 合成相关 -----
    // 预合成：切换海报或初次加载时调用，结果缓存到 this.composedPath
    async preCompose() {
      if (this.composing) return
      const poster = this.posters[this.active]
      if (!poster || !poster.imageUrl) return
      this.composing = true
      try {
        this.composedPath = await this.composePoster(poster)
      } catch (e) {
        console.error('预合成失败:', e)
        this.composedPath = ''
      } finally {
        this.composing = false
      }
    },
    // 通用下载：把网络图下载到本地临时路径；本地/完整 URL 原样返回
    _downloadImage(url) {
      return new Promise((resolve, reject) => {
        if (!url) return resolve('')
        // 已经是本地路径 / 完整 URL（如 http 或 data:），直接返回
        if (url.indexOf('/static/') === 0 || url.indexOf('http') === 0 || url.indexOf('data:') === 0) {
          return resolve(url)
        }
        uni.downloadFile({
          url,
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        })
      })
    },
    // 合成底图 + 二维码到 canvas，返回导出的临时文件路径
    composePoster(poster) {
      const CANVAS_W = 750   // 设计稿宽度 rpx → px（canvas 用物理像素）
      const CANVAS_H = 1137  // 设计稿海报高度，按 poster-card 比例 507:770 ≈ 0.6584, 750/0.6584 ≈ 1139，微调
      return Promise.resolve().then(async () => {
        // 1) 下载底图
        let bgPath = poster.imageUrl
        if (bgPath.indexOf('http') === 0) {
          bgPath = await this._downloadImage(bgPath)
        }

        // 2) 获取 canvas 对象
        return new Promise((resolve, reject) => {
          const query = uni.createSelectorQuery().in(this)
          query.select('#poster-canvas')
            .fields({ node: true, size: true })
            .exec((res) => {
              if (!res || !res[0] || !res[0].node) {
                return reject(new Error('canvas 节点未找到'))
              }
              const canvas = res[0].node
              const ctx = canvas.getContext('2d')
              const dpr = uni.getSystemInfoSync().pixelRatio || 2
              canvas.width = CANVAS_W * dpr
              canvas.height = CANVAS_H * dpr
              ctx.scale(dpr, dpr)

              // 3) 画底图
              const bgImg = canvas.createImage()
              bgImg.onload = () => {
                ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H)

                // 4) 画二维码（如果有）
                if (poster.shareImageUrl) {
                  let qrPath = poster.shareImageUrl
                  const drawQR = () => {
                    const qrImg = canvas.createImage()
                    qrImg.onload = () => {
                      // 百分比定位 + transform(-50%,-50%) 的中心点转换
                      const qrW = poster.qrW / 100 * CANVAS_W
                      const qrH = poster.qrH / 100 * CANVAS_H
                      const qrX = poster.qrX / 100 * CANVAS_W - qrW / 2
                      const qrY = poster.qrY / 100 * CANVAS_H - qrH / 2
                      ctx.drawImage(qrImg, qrX, qrY, qrW, qrH)
                      // 导出
                      this._exportCanvas(canvas, resolve, reject)
                    }
                    qrImg.onerror = () => {
                      console.warn('二维码图片加载失败，导出仅底图')
                      this._exportCanvas(canvas, resolve, reject)
                    }
                    qrImg.src = qrPath
                  }
                  if (qrPath.indexOf('http') === 0) {
                    this._downloadImage(qrPath).then(drawQR).catch(() => {
                      console.warn('二维码下载失败，导出仅底图')
                      this._exportCanvas(canvas, resolve, reject)
                    })
                  } else {
                    drawQR()
                  }
                } else {
                  this._exportCanvas(canvas, resolve, reject)
                }
              }
              bgImg.onerror = () => reject(new Error('底图加载失败: ' + bgPath))
              bgImg.src = bgPath
            })
        })
      })
    },
    // 把 canvas 导出为临时图片文件
    _exportCanvas(canvas, resolve, reject) {
      // #ifdef H5
      try {
        const dataUrl = canvas.toDataURL('image/png')
        return resolve(dataUrl)
      } catch (e) {
        return reject(e)
      }
      // #endif
      // #ifndef H5
      uni.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      })
      // #endif
    }
  }
}
</script>

<style scoped>
/* ===== 白底轻量背景 ===== */
.share-page {
  background: linear-gradient(180deg, #eef6f0 0%, #f9faf9 30%, #f9faf9 100%);
  overflow-x: hidden;
}

.safe-top {
  height: env(safe-area-inset-top);
}

/* ===== 顶部导航 ===== */
.nav-bar {
  position: relative;
  z-index: 10;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back {
  position: absolute;
  left: 24rpx;
  width: 64rpx;
  height: 64rpx;
  line-height: 62rpx;
  text-align: center;
  font-size: 44rpx;
  color: #2c3a31;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4rpx 14rpx rgba(31, 86, 50, 0.12);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1d2b21;
  letter-spacing: 2rpx;
}

.nav-count {
  position: absolute;
  right: 26rpx;
  padding: 8rpx 22rpx;
  border-radius: 26rpx;
  background: #ffffff;
  color: #5a675e;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 14rpx rgba(31, 86, 50, 0.1);
}

/* ===== 内容区 ===== */
.share-shell {
  height: calc(100vh - 96rpx - env(safe-area-inset-top));
  padding: 10rpx 0 calc(250rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 加载 / 空状态 ===== */
.share-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
}

.loading-ring {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 6rpx solid #dcefe2;
  border-top-color: #2cac61;
  animation: poster-spin 0.9s linear infinite;
}

@keyframes poster-spin {
  to {
    transform: rotate(360deg);
  }
}

.state-icon {
  width: 128rpx;
  height: 128rpx;
  line-height: 128rpx;
  text-align: center;
  font-size: 62rpx;
  color: #7fae8e;
  background: #e4f1e8;
  border-radius: 50%;
}

.state-text {
  font-size: 28rpx;
  color: #67756c;
}

.state-sub {
  font-size: 22rpx;
  color: #9aa79d;
}

/* ===== 沉浸式大图舞台 ===== */
.stage {
  flex: 1;
  min-height: 620rpx;
  margin-top: 8rpx;
  position: relative;
}

.poster-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 507rpx;
  height: 770rpx;
  border-radius: 32rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 26rpx 60rpx rgba(23, 58, 36, 0.16), 0 0 0 1rpx rgba(31, 86, 50, 0.06);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.92);
  transition: transform 0.42s cubic-bezier(0.22, 0.78, 0.22, 1), opacity 0.42s ease;
  pointer-events: none;
}

.poster-card.current {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}

.poster-img {
  width: 100%;
  height: 100%;
}

/* 小程序码占位（按管理端配置的百分比定位） */
.poster-qr {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 4rpx solid #fff;
  border-radius: 8rpx;
  /* background: repeating-conic-gradient(#183d28 0 25%, #fff 0 50%) 0 0/8rpx 8rpx; */
  box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.28);
}

.stage-arrow {
  position: absolute;
  z-index: 9;
  top: 50%;
  transform: translateY(-50%);
  width: 72rpx;
  height: 72rpx;
  line-height: 68rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  color: #1f7a44;
  font-size: 46rpx;
  box-shadow: 0 6rpx 18rpx rgba(24, 73, 40, 0.16);
}

.stage-arrow.prev {
  left: 20rpx;
}

.stage-arrow.next {
  right: 20rpx;
}

/* ===== 海报信息 ===== */
.stage-meta {
  flex: none;
  margin-top: 30rpx;
  padding: 0 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.meta-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2b21;
  white-space: pre-line;
}

.meta-slogan {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7b867e;
}

.meta-note {
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #a9b3ab;
}

/* ===== 底部操作栏：次操作一行 + 主按钮通栏 ===== */
.share-actions {
  position: fixed;
  z-index: 20;
  left: 50%;
  right: auto;
  bottom: 0;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -6rpx 24rpx rgba(29, 67, 42, 0.08);
}

.sub-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.sub-btn {
  height: 84rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: #f2f5f3;
  color: #46534b;
}

.sub-icon {
  font-size: 30rpx;
  line-height: 1;
}

.sub-label {
  font-size: 24rpx;
  font-weight: 500;
}

.main-btn {
  width: 100%;
  margin-top: 16rpx;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  border-radius: 50rpx;
  background: linear-gradient(135deg, #37c473, #1f8f4d);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  box-shadow: 0 12rpx 28rpx rgba(36, 158, 90, 0.32);
  padding: 0;
  margin-left: 0;
  margin-right: 0;
}

.main-btn::after {
  border: 0;
}

/* 隐藏合成 canvas：不能 display:none（微信小程序 canvas 无法渲染） */
.compose-canvas {
  position: fixed;
  left: -9999rpx;
  top: -9999rpx;
  width: 750px;
  height: 1137px;
}
</style>
