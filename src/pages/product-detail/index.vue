<template>
  <view class="page detail-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">商品详情</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载/异常状态 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!product" class="page-tip">商品不存在或已下架</view>

    <template v-else>
      <!-- 轮播图 -->
      <swiper v-if="gallery.length > 0" class="hero-swiper" :indicator-dots="gallery.length > 1"
        :circular="gallery.length > 1" indicator-active-color="#20b768" indicator-color="rgba(255,255,255,0.5)">
        <swiper-item v-for="(img, i) in gallery" :key="i" @tap="previewImage(i)">
          <image class="hero-image" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view v-else class="hero-swiper placeholder-swiper">
        <image class="hero-image" :src="placeholderImg" mode="aspectFill" />
      </view>

      <!-- 价格与标题 -->
      <view class="price-card card">
        <view class="price-line">
          <text class="price-symbol">¥</text>
          <text class="price-big">{{ currentPrice }}</text>
          <text class="price-suffix" v-if="priceRange">起</text>
        </view>
        <view class="sales-stock">
          <text>已售 {{ formatSales(product.sold) }}</text>
          <text :class="{ 'soldout': currentStock === 0 }">{{ currentStock === 0 ? '已售罄' : '库存 ' + currentStock
          }}</text>
        </view>
        <text class="detail-title">{{ product.name }}</text>
        <text class="detail-sub" v-if="product.subtitle">{{ product.subtitle }}</text>
        <view class="detail-tags" v-if="product.categoryName">
          <text>{{ product.categoryName }}</text>
          <text v-if="product.candyRatio > 0" class="candy-tag">🍬 糖豆可抵{{ product.candyRatio }}%</text>
        </view>
      </view>

      <!-- 已选规格 -->
      <view class="spec card" @tap="openSpecPanel">
        <text class="spec-label">已选</text>
        <text class="spec-value">{{ selectedText }}</text>
        <text class="spec-arrow">›</text>
      </view>

      <!-- 图文详情 -->
      <view class="story-card card" v-if="product.detailHtml">
        <text class="block-title">图文详情</text>
        <rich-text class="rich-body" :nodes="product.detailHtml"></rich-text>
      </view>
      <view class="story-card card empty-story" v-else>
        <text class="block-title">图文详情</text>
        <text class="empty-text">暂无图文详情</text>
      </view>

      <!-- 底部操作栏 -->
      <view class="buy-bar">
        <!-- #ifdef MP-WEIXIN -->
        <!-- 小程序端：open-type=share 拉起转发面板，内容由 onShareAppMessage 提供 -->
        <button class="mini-action share-btn" open-type="share">
          <text class="mini-icon">↗</text>
          <text class="mini-label">分享</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="mini-action" @tap="onShareTap">
          <text class="mini-icon">↗</text>
          <text class="mini-label">分享</text>
        </view>
        <!-- #endif -->
        <view class="mini-action" @tap="goHome">
          <text class="mini-icon">⌂</text>
          <text class="mini-label">首页</text>
        </view>
        <view class="buy-btn primary" :class="{ disabled: !canBuy }" @tap="buyNow">立即购买</view>
      </view>
    </template>

    <!-- 规格选择弹层 -->
    <view class="spec-mask" v-if="showSpec" @tap="closeSpecPanel">
      <view class="spec-panel" @tap.stop>
        <view class="spec-head">
          <image class="spec-thumb" :src="currentImage" mode="aspectFill" />
          <view class="spec-info">
            <view class="spec-price-line">
              <text class="price-symbol">¥</text>
              <text class="price-big">{{ currentPrice }}</text>
            </view>
            <text class="spec-stock">{{ currentStock === 0 ? '该规格已售罄' : '库存 ' + currentStock + ' 件' }}</text>
          </view>
          <text class="spec-close" @tap="closeSpecPanel">×</text>
        </view>
        <scroll-view class="spec-body" scroll-y>
          <view v-for="(spec, si) in product.specs" :key="si" class="spec-group">
            <text class="spec-group-name">{{ spec.name }}</text>
            <view class="spec-options">
              <text v-for="(val, vi) in spec.values" :key="vi" class="spec-option"
                :class="{ active: selectedSpec[spec.name] === val }" @tap="selectSpec(spec.name, val)">{{ val }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="spec-confirm" @tap="closeSpecPanel">确定</view>
      </view>
    </view>
  </view>
</template>

<script>
import { get, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'
import { buildSharePath } from '@/utils/share.js'

export default {
  data() {
    return {
      productId: null,
      product: null,
      loading: false,
      showSpec: false,
      selectedSpec: {},
      placeholderImg: '/static/product-bath.jpg'
    }
  },
  computed: {
    // 轮播图：carousel 优先，空则封面图
    gallery() {
      if (!this.product) return []
      const imgs = (this.product.carousel && this.product.carousel.length > 0)
        ? this.product.carousel
        : (this.product.coverUrl ? [this.product.coverUrl] : [])
      return imgs.map(i => resolveAssetUrl(i))
    },
    // 当前 SKU（按已选规格匹配）
    currentSku() {
      if (!this.product || !this.product.skus) return null
      const names = (this.product.specs || []).map(s => s.name)
      if (names.length === 0) return this.product.skus[0] || null
      return this.product.skus.find(sku => {
        return names.every(n => sku.spec_values[n] === this.selectedSpec[n])
      }) || null
    },
    currentPrice() {
      if (this.currentSku) return this.fmtPrice(this.currentSku.price)
      return this.fmtPrice(this.product ? this.product.priceMin : 0)
    },
    // 存在多规格价格时显示“起”
    priceRange() {
      return this.product && this.product.priceMax > this.product.priceMin
    },
    currentStock() {
      if (!this.product) return 0
      return this.currentSku ? (this.currentSku.stock || 0) : (this.product.totalStock || 0)
    },
    currentImage() {
      const skuImg = this.currentSku && this.currentSku.image
      if (skuImg) return resolveAssetUrl(skuImg)
      if (this.gallery.length > 0) return this.gallery[0]
      return this.placeholderImg
    },
    selectedText() {
      if (!this.product || !this.product.specs || this.product.specs.length === 0) {
        return '默认规格'
      }
      const parts = this.product.specs.map(s => this.selectedSpec[s.name] || '')
      return parts.filter(Boolean).join(' / ') || '请选择规格'
    },
    canBuy() {
      return this.currentStock > 0
    }
  },
  onLoad(options) {
    this.productId = options.id
    if (this.productId) {
      this.loadDetail()
    }
  },
  // 商品级分享卡片：后台配置的钩子标题/封面优先，好友点击直达该商品页
  onShareAppMessage() {
    const p = this.product
    const title = (p && p.shareTitle) || (p ? p.name : '好物推荐')
    const result = {
      title,
      path: buildSharePath('/pages/product-detail/index?id=' + this.productId)
    }
    // 分享图：配置的分享封面优先，回退轮播首图；微信仅接受网络 URL
    let img = p && p.shareImage ? resolveAssetUrl(p.shareImage) : ''
    if (!img || img.indexOf('http') !== 0) img = this.gallery[0] || ''
    if (img && img.indexOf('http') === 0) result.imageUrl = img
    return result
  },
  // 商品级分享到朋友圈：query 携带商品 id 与邀请码
  onShareTimeline() {
    const p = this.product
    const sharePath = buildSharePath('/pages/product-detail/index?id=' + this.productId)
    const result = {
      title: (p && p.shareTitle) || (p ? p.name : '好物推荐'),
      query: sharePath.split('?')[1] || ''
    }
    let img = p && p.shareImage ? resolveAssetUrl(p.shareImage) : ''
    if (!img || img.indexOf('http') !== 0) img = this.gallery[0] || ''
    if (img && img.indexOf('http') === 0) result.imageUrl = img
    return result
  },
  methods: {
    async loadDetail() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/products/' + this.productId)
        // 富文本图片自适应屏幕，避免超出
        resp.detailHtml = this.adaptRichHtml(resp.detailHtml)
        this.product = resp
        // 默认选中每个规格组的第一项
        const selected = {}
          ; (resp.specs || []).forEach(s => {
            if (s.values && s.values.length > 0) selected[s.name] = s.values[0]
          })
        this.selectedSpec = selected
      } catch (e) {
        console.error('加载商品详情失败:', e)
        this.product = null
      } finally {
        this.loading = false
      }
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    // 富文本图片自适应：给 img 注入最大宽度约束（rich-text 无法用页面样式穿透）
    adaptRichHtml(html) {
      if (!html) return ''
      return html.replace(/<img[^>]*>/gi, (tag) => {
        if (/style\s*=/i.test(tag)) {
          return tag.replace(/style\s*=\s*(["'])/i, (m, q) => 'style=' + q + 'max-width:100%;height:auto;')
        }
        return tag.replace(/<img/i, '<img style="max-width:100%;height:auto;display:block;"')
      })
    },
    formatSales(sold) {
      const n = Number(sold) || 0
      if (n >= 10000) {
        const v = n / 10000
        return (v % 1 === 0 ? v : v.toFixed(1)) + '万'
      }
      return String(n)
    },
    selectSpec(name, val) {
      this.selectedSpec = { ...this.selectedSpec, [name]: val }
    },
    openSpecPanel() {
      if (this.product && this.product.specs && this.product.specs.length > 0) {
        this.showSpec = true
      }
    },
    closeSpecPanel() {
      this.showSpec = false
    },
    previewImage(idx) {
      uni.previewImage({ urls: this.gallery, current: idx })
    },
    // 本期占位：下单在确认页提交，支付在后续计划实现
    buyNow() {
      if (!this.canBuy) {
        uni.showToast({ title: '该规格已售罄', icon: 'none' })
        return
      }
      const sku = this.currentSku
      if (!sku) {
        uni.showToast({ title: '请选择规格', icon: 'none' })
        return
      }
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          // 项目未配置原生 tabBar（自定义 TabBar），统一用 redirectTo 跳转
          uni.redirectTo({ url: '/pages/profile/index' })
        }, 800)
        return
      }
      uni.navigateTo({
        url: '/pages/order-confirm/index?productId=' + this.product.id + '&skuId=' + sku.id
      })
    },
    showComing() {
      uni.showToast({ title: '功能即将开放', icon: 'none' })
    },
    // 跳转首页（项目使用自定义 TabBar，tab 页间统一用 redirectTo）
    goHome() {
      uni.redirectTo({ url: '/pages/home/index' })
    },
    // H5 端分享：优先调用系统分享面板，不支持时复制商品链接
    onShareTap() {
      const p = this.product
      const title = (p && p.shareTitle) || (p ? p.name : '好物推荐')
      const link = window.location.href
      if (navigator && typeof navigator.share === 'function') {
        navigator.share({ title, url: link }).catch(() => { /* 用户取消不提示 */ })
      } else {
        uni.setClipboardData({
          data: link,
          success: () => uni.showToast({ title: '链接已复制，快去分享吧', icon: 'none' })
        })
      }
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.detail-page {
  background: #f7f8f6;
  min-height: 100vh;
  padding-bottom: 140rpx;
}

/* 顶部导航 */
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #fff;
}

.nav-back {
  font-size: 44rpx;
  color: #1f2320;
  font-weight: 700;
  padding: 0 12rpx;
}

.nav-title {
  font-size: 30rpx;
  font-weight: 700;
}

.capsule {
  font-size: 22rpx;
  color: #9aa09b;
}

.page-tip {
  padding: 200rpx 0;
  text-align: center;
  color: #9aa09b;
  font-size: 26rpx;
}

/* 轮播图 */
.hero-swiper {
  width: 100%;
  height: 750rpx;
}

.hero-image {
  width: 100%;
  height: 100%;
}

.placeholder-swiper {
  display: block;
  background: #f2f5f1;
}

/* 价格卡 */
.price-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx 28rpx 24rpx;
}

.price-line {
  display: flex;
  align-items: baseline;
}

.price-symbol {
  color: #ff3b42;
  font-size: 28rpx;
  font-weight: 700;
}

.price-big {
  color: #ff3b42;
  font-size: 52rpx;
  font-weight: 800;
}

.price-suffix {
  margin-left: 6rpx;
  color: #ff3b42;
  font-size: 24rpx;
}

.sales-stock {
  margin-top: 10rpx;
  display: flex;
  gap: 32rpx;
  font-size: 22rpx;
  color: #9aa09b;
}

.sales-stock .soldout {
  color: #ff3b42;
}

.detail-title {
  display: block;
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.4;
}

.detail-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #747a75;
}

.detail-tags {
  margin-top: 16rpx;
  display: flex;
  gap: 10rpx;
}

.detail-tags text {
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  color: #15995a;
  background: #eaf8ef;
  border: 1rpx solid #b8ebca;
  font-size: 20rpx;
}

.detail-tags .candy-tag {
  color: #e0447f;
  background: #fdeef3;
  border-color: #f7c3d6;
}

/* 已选规格 */
.spec {
  margin: 20rpx 24rpx 0;
  padding: 26rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.spec-label {
  font-size: 26rpx;
  color: #1f2320;
  font-weight: 700;
  flex: none;
}

.spec-value {
  flex: 1;
  font-size: 26rpx;
  color: #15995a;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.spec-arrow {
  color: #c0c4c0;
  font-size: 32rpx;
}

/* 图文详情 */
.story-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
}

.block-title {
  display: block;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.rich-body {
  font-size: 26rpx;
  color: #3a3f3b;
  line-height: 1.7;
}

.empty-story .empty-text {
  font-size: 24rpx;
  color: #9aa09b;
}

/* 底部操作栏（居中限宽，适配桌面 H5 手机壳预览） */
.buy-bar {
  position: fixed;
  left: 50%;
  right: auto;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  bottom: 0;
  height: 110rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 16rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.mini-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  width: 76rpx;
  flex: none;
}

/* 小程序分享按钮：清除 button 默认背景/边框/内边距，外观与普通图标入口一致 */
.share-btn {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  line-height: normal;
  font-size: inherit;
}

.share-btn::after {
  border: none;
}

.mini-icon {
  font-size: 40rpx;
  color: #4b504c;
}

.mini-label {
  font-size: 22rpx;
  color: #7d837f;
}

.buy-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}

.buy-btn.disabled {
  opacity: 0.5;
}

.buy-btn.primary {
  background: linear-gradient(90deg, #52c47d, #27b969);
}

/* 规格选择弹层（居中限宽，适配桌面 H5 手机壳预览） */
.spec-mask {
  position: fixed;
  left: 50%;
  right: auto;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}

.spec-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.spec-head {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f2ef;
}

.spec-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f2f5f1;
  flex: none;
}

.spec-info {
  flex: 1;
  min-width: 0;
}

.spec-price-line {
  display: flex;
  align-items: baseline;
}

.spec-stock {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9aa09b;
}

.spec-close {
  font-size: 40rpx;
  color: #c0c4c0;
  padding: 0 8rpx;
}

.spec-body {
  flex: 1;
  overflow: hidden;
  max-height: 40vh;
  padding-top: 24rpx;
}

.spec-group {
  margin-bottom: 24rpx;
}

.spec-group-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.spec-option {
  padding: 12rpx 28rpx;
  border-radius: 10rpx;
  background: #f5f7f4;
  border: 1rpx solid #f5f7f4;
  font-size: 24rpx;
  color: #3a3f3b;
}

.spec-option.active {
  background: #eaf8ef;
  border-color: #27b969;
  color: #15995a;
  font-weight: 700;
}

.spec-confirm {
  margin-top: 20rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
