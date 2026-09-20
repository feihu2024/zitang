<template>
  <view class="page detail-page">
    <view class="safe-top detail-top-bg"></view>

    <!-- 加载中 -->
    <view v-if="loading" class="detail-state">
      <text class="state-icon">⏳</text>
      <text class="state-text">素材加载中…</text>
    </view>
    <!-- 加载失败 / 已下架 -->
    <view v-else-if="loadError" class="detail-state" @tap="goBack">
      <text class="state-icon">⚠️</text>
      <text class="state-text">{{ loadError }}</text>
      <text class="state-retry">点击返回</text>
    </view>

    <view v-else class="detail-shell">
      <!-- 导航栏 -->
      <view class="nav-bar">
        <text class="nav-back" @tap="goBack">‹</text>
        <text class="nav-title">推广素材详情</text>
      </view>

      <!-- 概要卡 -->
      <view class="summary card">
        <image v-if="item.cover" class="summary-image" :src="item.cover" mode="aspectFill" />
        <view class="summary-main">
          <text class="summary-title">{{ item.name }}</text>
          <text class="summary-meta">{{ item.count }}个素材 · {{ item.date }}更新</text>
          <view class="summary-tags">
            <text>可商用</text>
            <text>高清素材</text>
            <text>一键使用</text>
          </view>
        </view>
      </view>

      <!-- 图片素材 -->
      <view v-if="item.images.length" class="inline-section card">
        <view class="inline-head">
          <view class="head-left">
            <text class="head-icon">▱</text>
            <view class="head-info">
              <text class="head-title">图片素材</text>
              <text class="head-sub">共{{ item.images.length }}张 · 左右滑动预览</text>
            </view>
          </view>
          <text class="head-badge">JPG</text>
        </view>
        <scroll-view class="image-gallery" scroll-x show-scrollbar="false">
          <view class="gallery-row">
            <view
              v-for="(img, idx) in item.images"
              :key="idx"
              class="image-card"
              @tap="previewImage(idx)"
            >
              <image class="image-card-img" :src="img" mode="aspectFill" />
              <view class="image-card-info">
                <text class="ic-name">推广图片 {{ idx + 1 }}</text>
                <text class="ic-meta">点击预览</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <button class="inline-action" @tap="saveAllImages">⇩ 一键保存全部图片</button>
      </view>

      <!-- 视频素材 -->
      <view v-if="item.videoUrl" class="inline-section card">
        <view class="inline-head">
          <view class="head-left">
            <text class="head-icon">▶</text>
            <view class="head-info">
              <text class="head-title">视频素材</text>
              <text class="head-sub">推广宣传短视频</text>
            </view>
          </view>
          <text class="head-badge">MP4</text>
        </view>
        <view class="video-compact">
          <view class="video-thumb" @tap="openVideo">
            <image class="video-thumb-img" :src="item.cover" mode="aspectFill" />
            <text class="thumb-play">▶</text>
            <text class="thumb-label">点击播放</text>
          </view>
          <view class="video-info">
            <text class="video-name">推广宣传视频</text>
            <text>在线播放 · 高清画质</text>
            <text>MP4 格式</text>
            <!-- #ifdef MP-WEIXIN -->
            <button class="video-btn" @tap="downloadVideo">⇩ 下载视频</button>
            <!-- #endif -->
            <!-- #ifdef H5 -->
            <button class="video-btn" @tap="openVideoUrl">⇩ 打开视频</button>
            <!-- #endif -->
          </view>
        </view>
      </view>

      <!-- 推广文案 -->
      <view v-if="item.content" class="inline-section card">
        <view class="inline-head">
          <view class="head-left">
            <text class="head-icon">▯</text>
            <view class="head-info">
              <text class="head-title">推广文案</text>
              <text class="head-sub">适合朋友圈 · 社群</text>
            </view>
          </view>
          <text class="head-badge">推荐</text>
        </view>
        <view class="copy-box">
          <text>{{ item.content }}</text>
        </view>
        <view class="copy-meta">
          <text>{{ item.content.length }}字</text>
          <text>可直接编辑后发布</text>
        </view>
        <button class="inline-action" @tap="copyText">▣ 一键复制文案</button>
      </view>

      <!-- 素材使用说明 -->
      <view class="guide card">
        <text class="guide-title">素材使用说明</text>
        <view class="guide-steps">
          <view class="guide-step">
            <text class="step-no">1</text>
            <text class="step-name">预览素材</text>
            <text class="step-desc">确认内容与尺寸</text>
          </view>
          <view class="guide-step">
            <text class="step-no">2</text>
            <text class="step-name">一键使用</text>
            <text class="step-desc">保存、复制或下载</text>
          </view>
          <view class="guide-step">
            <text class="step-no">3</text>
            <text class="step-name">发布推广</text>
            <text class="step-desc">分享至合适渠道</text>
          </view>
        </view>
        <text class="guide-tip">素材仅限品牌授权渠道使用，请勿修改品牌标识或用于违规推广。</text>
      </view>
    </view>

    <!-- 视频播放弹层 -->
    <view v-if="videoOpen" class="video-modal" @tap="closeVideo">
      <view class="video-modal-box" @tap.stop="noop">
        <text class="video-modal-close" @tap="closeVideo">×</text>
        <video
          class="video-player"
          :src="item.videoUrl"
          controls
          autoplay
          object-fit="contain"
        ></video>
      </view>
    </view>
  </view>
</template>

<script>
import { getPromoMaterialDetail, resolveAssetUrl } from '@/utils/api.js'

export default {
  data() {
    return {
      loading: true,
      loadError: '',
      videoOpen: false,
      item: {
        id: 0,
        name: '',
        cover: '',
        images: [],
        videoUrl: '',
        content: '',
        count: 0,
        date: ''
      }
    }
  },
  onLoad(options) {
    this.materialId = options && options.id ? Number(options.id) : 0
    this.loadDetail()
  },
  methods: {
    /** 拉取推广素材详情（已下架/不存在时后端 404） */
    loadDetail() {
      if (!this.materialId) {
        this.loading = false
        this.loadError = '素材参数缺失'
        return
      }
      this.loading = true
      this.loadError = ''
      getPromoMaterialDetail(this.materialId)
        .then((m) => {
          const images = (m.images || []).map(resolveAssetUrl)
          const poster = images.length
          const video = m.videoUrl ? 1 : 0
          const copy = (m.content || '').trim() ? 1 : 0
          this.item = {
            id: m.id,
            name: m.name || '',
            cover: images[0] || '',
            images: images,
            videoUrl: resolveAssetUrl(m.videoUrl || ''),
            content: m.content || '',
            count: poster + video + copy,
            date: m.updatedAt ? String(m.updatedAt).slice(0, 10).replace(/-/g, '.') : ''
          }
        })
        .catch((err) => {
          this.loadError = (err && err.message) || '素材加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({ url: '/pages/promo/index' })
        }
      })
    },
    /** 预览单张大图（可左右滑动切换） */
    previewImage(idx) {
      uni.previewImage({
        urls: this.item.images,
        current: idx
      })
    },
    /** 一键保存全部图片：小程序逐张存相册；H5 降级为预览长按保存 */
    saveAllImages() {
      const images = this.item.images
      if (!images.length) return
      // #ifdef MP-WEIXIN
      uni.showLoading({ title: '保存中…' })
      let index = 0
      const next = () => {
        if (index >= images.length) {
          uni.hideLoading()
          uni.showToast({ title: images.length + '张图片已保存', icon: 'success' })
          return
        }
        uni.getImageInfo({
          src: images[index],
          success: (r) => {
            uni.saveImageToPhotosAlbum({
              filePath: r.path,
              success: () => { index += 1; next() },
              fail: () => {
                uni.hideLoading()
                uni.showToast({ title: '请允许访问相册后重试', icon: 'none' })
              }
            })
          },
          fail: () => {
            uni.hideLoading()
            uni.showToast({ title: '图片获取失败', icon: 'none' })
          }
        })
      }
      next()
      // #endif
      // #ifdef H5
      uni.previewImage({ urls: images, current: 0 })
      uni.showToast({ title: '长按图片可保存到手机', icon: 'none' })
      // #endif
    },
    openVideo() {
      this.videoOpen = true
    },
    closeVideo() {
      this.videoOpen = false
    },
    noop() {},
    /** H5 端新窗口打开视频 */
    openVideoUrl() {
      // #ifdef H5
      if (this.item.videoUrl) window.open(this.item.videoUrl, '_blank')
      // #endif
    },
    /** 小程序端下载视频并保存到相册 */
    downloadVideo() {
      // #ifdef MP-WEIXIN
      uni.showLoading({ title: '下载中…' })
      uni.downloadFile({
        url: this.item.videoUrl,
        success: (r) => {
          uni.hideLoading()
          if (r.statusCode !== 200) {
            uni.showToast({ title: '视频下载失败', icon: 'none' })
            return
          }
          uni.saveVideoToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => uni.showToast({ title: '视频已保存', icon: 'success' }),
            fail: () => uni.showToast({ title: '请允许访问相册后重试', icon: 'none' })
          })
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '视频下载失败', icon: 'none' })
        }
      })
      // #endif
    },
    copyText() {
      uni.setClipboardData({
        data: this.item.content,
        success: () => uni.showToast({ title: '文案已复制', icon: 'success' })
      })
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: linear-gradient(#eef8f0, #f8faf8 450rpx);
}
.detail-top-bg {
  background: transparent;
}
.detail-shell {
  padding: 0 22rpx 60rpx;
}

/* 加载/失败状态 */
.detail-state {
  padding: 200rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state-icon {
  font-size: 60rpx;
}
.state-text {
  margin-top: 18rpx;
  color: #9aa09c;
  font-size: 24rpx;
}
.state-retry {
  margin-top: 22rpx;
  padding: 10rpx 40rpx;
  border: 1rpx solid #25a95a;
  border-radius: 30rpx;
  color: #1d9a50;
  font-size: 23rpx;
}

/* 导航栏 */
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.nav-back {
  position: absolute;
  left: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 60rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  font-size: 44rpx;
  font-weight: 700;
  color: #233;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d2b22;
}

/* 概要卡 */
.summary {
  padding: 18rpx;
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.summary-image {
  width: 130rpx;
  height: 130rpx;
  border-radius: 20rpx;
  flex: none;
  background: #eef2ee;
}
.summary-main {
  min-width: 0;
}
.summary-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  font-weight: 800;
  color: #1d2b22;
}
.summary-meta {
  display: block;
  margin-top: 10rpx;
  color: #858c87;
  font-size: 19rpx;
}
.summary-tags {
  margin-top: 14rpx;
  display: flex;
  gap: 9rpx;
}
.summary-tags text {
  padding: 6rpx 12rpx;
  border-radius: 16rpx;
  background: #eaf8ef;
  color: #168648;
  font-size: 15rpx;
}

/* 分区卡片 */
.inline-section {
  margin-top: 18rpx;
  padding: 22rpx;
}
.inline-head {
  min-height: 76rpx;
  margin-bottom: 18rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.head-left {
  display: flex;
  gap: 15rpx;
}
.head-icon {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 18rpx;
  background: #e9f8ee;
  color: #178849;
  font-size: 29rpx;
  flex: none;
}
.head-info text {
  display: block;
}
.head-title {
  font-size: 25rpx;
  font-weight: 800;
  color: #1d2b22;
}
.head-sub {
  margin-top: 6rpx;
  color: #89918b;
  font-size: 17rpx;
}
.head-badge {
  padding: 8rpx 16rpx;
  border-radius: 18rpx;
  background: #eff8f1;
  color: #25844b;
  font-size: 16rpx;
  font-weight: 800;
}

/* 图片画廊 */
.image-gallery {
  width: 100%;
  margin-bottom: 18rpx;
  white-space: nowrap;
}
.gallery-row {
  display: flex;
  gap: 18rpx;
}
.image-card {
  width: 310rpx;
  flex: none;
  overflow: hidden;
  border: 1rpx solid #e5ebe6;
  border-radius: 22rpx;
  background: #f7faf7;
}
.image-card-img {
  width: 310rpx;
  height: 350rpx;
  display: block;
}
.image-card-info {
  padding: 14rpx 15rpx;
  display: flex;
  justify-content: space-between;
}
.ic-name {
  font-size: 18rpx;
  font-weight: 800;
  color: #33413a;
}
.ic-meta {
  color: #919792;
  font-size: 14rpx;
}

/* 通用行动按钮 */
.inline-action {
  height: 84rpx;
  margin: 0;
  border-radius: 44rpx;
  background: linear-gradient(90deg, #31b96e, #19884c);
  color: #fff;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 84rpx;
}

/* 视频区 */
.video-compact {
  display: flex;
  gap: 24rpx;
  align-items: stretch;
}
.video-thumb {
  width: 156rpx;
  height: 277rpx;
  overflow: hidden;
  border-radius: 22rpx;
  position: relative;
  background: #183122;
  flex: none;
}
.video-thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 68rpx;
  height: 68rpx;
  line-height: 68rpx;
  padding-left: 4rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #1c8b4d;
  font-size: 28rpx;
}
.thumb-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16rpx;
  text-align: center;
  color: #fff;
  font-size: 16rpx;
}
.video-info {
  flex: 1;
  min-width: 0;
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
}
.video-info text {
  font-size: 17rpx;
  color: #818983;
}
.video-name {
  font-size: 24rpx !important;
  font-weight: 800;
  color: #1d2b22 !important;
}
.video-info text + text {
  margin-top: 10rpx;
}
.video-btn {
  height: 68rpx;
  margin: 0;
  margin-top: auto !important;
  border-radius: 36rpx;
  background: #e9f8ee;
  color: #16884a;
  font-size: 22rpx;
  font-weight: 800;
  line-height: 68rpx;
}

/* 文案区 */
.copy-box {
  padding: 30rpx 28rpx 16rpx;
  border: 1rpx solid #dcece0;
  border-radius: 24rpx;
  background: #f4fbf6;
}
.copy-box text {
  display: block;
  color: #35433a;
  font-size: 23rpx;
  line-height: 1.85;
  white-space: pre-line;
}
.copy-meta {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #838a85;
  font-size: 16rpx;
}

/* 使用说明 */
.guide {
  margin-top: 18rpx;
  padding: 24rpx;
}
.guide-title {
  font-size: 24rpx;
  font-weight: 800;
  color: #1d2b22;
}
.guide-steps {
  margin-top: 22rpx;
  display: flex;
}
.guide-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1rpx solid #e9ece9;
}
.guide-step:last-child {
  border-right: 0;
}
.step-no {
  width: 42rpx;
  height: 42rpx;
  line-height: 42rpx;
  text-align: center;
  border-radius: 50%;
  background: #e7f6eb;
  color: #188a49;
  font-weight: 800;
  font-size: 20rpx;
}
.step-name {
  margin-top: 9rpx;
  font-size: 19rpx;
  font-weight: 700;
  color: #2a382f;
}
.step-desc {
  margin-top: 4rpx;
  color: #8a918c;
  font-size: 15rpx;
}
.guide-tip {
  display: block;
  margin-top: 24rpx;
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f5f7f5;
  color: #858b87;
  font-size: 15rpx;
}

/* 视频播放弹层 */
.video-modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 120;
  padding: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 20, 12, 0.78);
}
.video-modal-box {
  width: 100%;
  max-width: 640rpx;
  position: relative;
}
.video-player {
  width: 100%;
  height: 760rpx;
  border-radius: 32rpx;
  background: #08100b;
}
.video-modal-close {
  position: absolute;
  z-index: 2;
  right: -20rpx;
  top: -70rpx;
  width: 68rpx;
  height: 68rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 50%;
  background: #fff;
  color: #26332a;
  font-size: 48rpx;
}
</style>
