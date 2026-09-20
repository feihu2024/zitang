<template>
  <view class="page detail-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">秒杀详情</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载失败 -->
    <view v-if="loadError" class="load-error">{{ loadError }}</view>

    <block v-else-if="detail">
      <!-- 主图轮播 -->
      <view class="hero-wrap">
        <swiper class="hero-swiper" :current="heroIndex" @change="onHeroChange">
          <swiper-item v-for="(img, idx) in carousel" :key="idx" @tap="previewHero">
            <image :src="img" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <text class="pager">{{ heroIndex + 1 }}/{{ carousel.length || 1 }}</text>
      </view>

      <!-- 价格卡 -->
      <view class="price-card card">
        <view class="price-main">
          <text v-if="detail.sessionTime" class="slot-badge">{{ detail.sessionTime }} 场</text>
          <view class="price-line">
            <text class="price-label">秒杀价</text>
            <text class="price-symbol">¥</text>
            <text class="price-big">{{ currentSku ? currentSku.seckillPrice : detail.seckillPrice }}</text>
            <text v-if="detail.discount" class="price-discount">{{ detail.discount }}</text>
          </view>
          <text class="old-price">¥{{ currentSku ? currentSku.originalPrice : detail.originalPrice }}</text>
          <text class="detail-title">{{ detail.productName }}</text>
          <view v-if="detail.tags && detail.tags.length" class="detail-tags">
            <text v-for="(t, i) in detail.tags" :key="i">{{ t }}</text>
          </view>
        </view>
        <view class="time-card">
          <text class="time-title">{{ detail.sessionState === 'running' ? '距结束' : '距开始' }}</text>
          <view class="time-row">
            <text class="time">{{ count.h }}</text>
            <text class="colon">:</text>
            <text class="time">{{ count.m }}</text>
            <text class="colon">:</text>
            <text class="time">{{ count.s }}</text>
          </view>
          <view class="stock-text">
            <text>限量 <text class="accent">{{ detail.totalStock }}</text>件</text>
            <text>剩余 <text class="accent">{{ detail.stockLeft }}</text>件</text>
          </view>
        </view>
      </view>

      <!-- 已选规格 -->
      <view class="spec card" @tap="openSkuPanel">
        <text class="spec-label">已选</text>
        <text class="spec-value">{{ currentSku ? fmtSkuName(currentSku.skuName) : '请选择规格' }}</text>
        <text class="spec-arrow">›</text>
      </view>

      <!-- 活动规则 -->
      <view class="rules card">
        <text class="block-title">活动规则</text>
        <view class="rule-grid">
          <view class="rule-item">
            <view class="rule-icon">▣</view>
            <text class="rule-txt">限购{{ detail.rules.limit }}件/人</text>
          </view>
          <view class="rule-item">
            <view class="rule-icon">◷</view>
            <text class="rule-txt">抢到后可随时支付</text>
          </view>
          <view class="rule-item">
            <view class="rule-icon">♧</view>
            <text class="rule-txt">售完即止</text>
          </view>
          <view class="rule-item">
            <view class="rule-icon">％</view>
            <text class="rule-txt">限量抢购 · 先到先得</text>
          </view>
        </view>
      </view>

      <!-- 图文详情 -->
      <view class="story-card card">
        <view class="story-tabs">
          <text class="story-tab active">商品详情</text>
        </view>
        <view v-if="!detail.detailHtml" class="story-banner">
          <text class="story-sub">{{ detail.subtitle || '植萃秒杀 · 限时特惠' }}</text>
          <text class="story-main">{{ detail.productName }}</text>
          <text v-if="detail.tags && detail.tags.length" class="story-tag">{{ detail.tags.join(' · ') }}</text>
        </view>
        <rich-text v-else class="detail-html" :nodes="detailNodes"></rich-text>
        <view class="promises">
          <view class="promise-item">
            <text class="promise-title">▣ 极速发货</text>
            <text class="promise-desc">产地直发 新鲜到家</text>
          </view>
          <view class="promise-item">
            <text class="promise-title">◇ 坏果包赔</text>
            <text class="promise-desc">坏果包赔 放心购买</text>
          </view>
          <view class="promise-item">
            <text class="promise-title">盾 正品保障</text>
            <text class="promise-desc">源头直采 品质保证</text>
          </view>
        </view>
      </view>
    </block>

    <!-- 底部购买栏 -->
    <view class="buy-bar">
      <view class="mini-action" @tap="share">
        <text class="mini-icon">↗</text>
        <text class="mini-label">分享</text>
      </view>
      <view class="mini-action" @tap="service">
        <text class="mini-icon">♧</text>
        <text class="mini-label">客服</text>
      </view>
      <view class="buy-btn" :class="{ disabled: !canBuy }" @tap="buy">{{ buyBtnText }}</view>
    </view>

    <!-- SKU 选择面板 -->
    <view v-if="showSku && detail" class="sku-mask" @tap="showSku = false">
      <view class="sku-sheet" @tap.stop>
        <view class="sku-head">
          <text class="sku-title">选择规格</text>
          <text class="sku-close" @tap="showSku = false">×</text>
        </view>
        <view class="sku-list">
          <view
            v-for="sku in detail.skus"
            :key="sku.id"
            class="sku-item"
            :class="{ active: selectedSkuId === sku.id }"
            @tap="selectSku(sku)"
          >
            <text class="sku-name">{{ fmtSkuName(sku.skuName) }}</text>
            <view class="sku-price">
              <text class="sku-seckill">¥{{ sku.seckillPrice }}</text>
              <text class="sku-old">¥{{ sku.originalPrice }}</text>
            </view>
            <text class="sku-limit">限购 {{ sku.limit }} 件</text>
          </view>
        </view>
        <view class="sku-confirm" @tap="showSku = false">确认</view>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'
import { getSelectedAddress, loadAddresses, fullAddress } from '@/utils/address.js'

export default {
  data() {
    return {
      activityId: 0,
      entrySessionId: 0, // 从哪个场次点进来的（跨场次活动按该场次展示状态）
      detail: null,
      loadError: '',
      heroIndex: 0,
      selectedSkuId: 0,
      showSku: false,
      submitting: false,
      count: { h: '00', m: '00', s: '00' },
      timer: null
    }
  },
  computed: {
    carousel() {
      const imgs = (this.detail && this.detail.carousel) || []
      return imgs.length ? imgs.map(i => resolveAssetUrl(i)) : ['/static/detail-hero.jpg']
    },
    currentSku() {
      const skus = (this.detail && this.detail.skus) || []
      return skus.find(s => s.id === this.selectedSkuId) || skus[0] || null
    },
    // 图文详情：给富文本图片强制加上宽度限制，避免超宽图片溢出屏幕
    detailNodes() {
      const html = (this.detail && this.detail.detailHtml) || ''
      if (!html) return ''
      const fit = 'max-width:100%;width:100%;height:auto;display:block;'
      return html
        // 已有 style 的 img：追加约束样式
        .replace(/<img([^>]*?)\sstyle="([^"]*)"/gi,
          (m, attrs, style) => `<img${attrs} style="${style};${fit}"`)
        // 无 style 的 img：直接补上
        .replace(/<img((?![^>]*\sstyle=)[^>]*?)\s*\/??>/gi,
          (m, attrs) => `<img${attrs} style="${fit}">`)
    },
    canBuy() {
      return !!(this.detail && this.detail.sessionState === 'running' && this.detail.stockLeft > 0)
    },
    buyBtnText() {
      if (!this.detail) return ''
      if (this.detail.sessionState === 'running') {
        if (this.detail.stockLeft <= 0) return '已售罄'
        const price = this.currentSku ? this.currentSku.seckillPrice : this.detail.seckillPrice
        return `¥${price}　立即秒杀`
      }
      if (this.detail.sessionState === 'upcoming') return `${this.detail.sessionTime || ''} 开始抢购`
      return '活动已结束'
    }
  },
  onLoad(options) {
    this.activityId = Number(options.id) || 0
    this.entrySessionId = Number(options.session_id) || 0
    if (!this.activityId) {
      this.loadError = '参数错误：缺少活动ID'
      return
    }
    this.load()
    loadAddresses() // 预热地址缓存（下单前需要收货地址）
  },
  onShow() {
    loadAddresses(true) // 从地址页返回时刷新
  },
  onUnload() {
    this.stopTimer()
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/flash/index' })
      }
    },
    // ---- 加载详情 ----
    async load() {
      try {
        const qs = this.entrySessionId ? '?session_id=' + this.entrySessionId : ''
        const data = await get('/api/wxapp/seckill/activities/' + this.activityId + qs)
        this.detail = data
        this.loadError = ''
        // 默认选中第一个 SKU
        if (data.skus && data.skus.length && !this.selectedSkuId) {
          this.selectedSkuId = data.skus[0].id
        }
        this.startTimer()
      } catch (e) {
        this.loadError = e.message || '加载失败'
      }
    },
    onHeroChange(e) {
      this.heroIndex = e.detail.current
    },
    // 规格名兼容：空值/空 JSON 快照 → 默认规格；JSON 对象取规格值拼接
    fmtSkuName(name) {
      const t = (name || '').trim()
      if (!t || t === '{}' || t === '[]') return '默认规格'
      if (t.startsWith('{')) {
        try {
          const vals = Object.values(JSON.parse(t)).filter(Boolean)
          return vals.length ? vals.join(' / ') : '默认规格'
        } catch (e) {
          return t
        }
      }
      return t
    },
    previewHero() {
      uni.previewImage({ urls: this.carousel, current: this.carousel[this.heroIndex] })
    },
    // ---- SKU 选择 ----
    openSkuPanel() {
      if (!this.detail || !this.detail.skus || this.detail.skus.length <= 1) return
      this.showSku = true
    },
    selectSku(sku) {
      this.selectedSkuId = sku.id
    },
    // ---- 倒计时 ----
    startTimer() {
      this.stopTimer()
      this.timer = setInterval(() => this.tick(), 1000)
      this.tick()
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    tick() {
      if (!this.detail) return
      const target = this.detail.sessionState === 'running'
        ? this.detail.sessionEndAt
        : this.detail.sessionStartAt
      const diff = Math.floor((new Date((target || '').replace(/-/g, '/')).getTime() - Date.now()) / 1000)
      if (diff <= 0) {
        this.count = { h: '00', m: '00', s: '00' }
        // 场次状态可能已切换（开始/结束）→ 重拉详情
        this.stopTimer()
        this.load()
        return
      }
      const pad = n => String(n).padStart(2, '0')
      this.count = {
        h: pad(Math.floor(diff / 3600)),
        m: pad(Math.floor((diff % 3600) / 60)),
        s: pad(diff % 60)
      }
    },
    // ---- 分享 / 客服 ----
    share() {
      uni.showToast({ title: '请点击右上角分享', icon: 'none' })
    },
    service() {
      uni.showModal({
        title: '在线客服',
        content: '客服在线时间：9:00–21:00',
        showCancel: false
      })
    },
    // ---- 主按钮：秒杀 ----
    async buy() {
      if (!this.detail) return
      if (this.detail.sessionState === 'upcoming') {
        return uni.showToast({ title: `该场次 ${this.detail.sessionTime || ''} 开始，敬请期待`, icon: 'none' })
      }
      if (!this.canBuy) {
        return uni.showToast({
          title: this.detail.stockLeft <= 0 ? '该商品已售罄' : '秒杀未开始或已结束',
          icon: 'none'
        })
      }
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => uni.navigateTo({ url: '/pages/profile/index' }), 800)
        return
      }
      const address = await this.ensureAddress()
      if (!address) {
        uni.showModal({
          title: '提示',
          content: '请先添加收货地址',
          confirmText: '去添加',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/address-add/index' })
          }
        })
        return
      }
      const sku = this.currentSku
      uni.showModal({
        title: '确认秒杀',
        content: `将以秒杀价 ¥${sku.seckillPrice} 购买 ${this.detail.productName}，抢到后可随时完成支付。`,
        confirmText: '立即支付',
        success: (res) => {
          if (res.confirm) this.submitOrder()
        }
      })
    },
    // 确保地址缓存已就绪：本地无选中地址时向后端拉一次再判断
    async ensureAddress() {
      let address = getSelectedAddress()
      if (!address) {
        await loadAddresses(true)
        address = getSelectedAddress()
      }
      return address
    },
    // ---- 下单 + 支付 ----
    submitOrder() {
      if (this.submitting) return
      const sku = this.currentSku
      const address = getSelectedAddress()
      if (!sku || !address) return
      this.submitting = true
      post('/api/wxapp/seckill/activities/' + this.activityId + '/order', {
        sku_id: Number(sku.id),
        session_id: this.detail.sessionId ? Number(this.detail.sessionId) : null,
        quantity: 1,
        receiver_name: address.name.trim(),
        receiver_phone: address.phone.trim(),
        receiver_address: fullAddress(address),
        receiver_province: address.province || '',
        receiver_city: address.city || '',
        receiver_district: address.district || '',
        remark: ''
      })
        .then(order => {
          this.doPayAfterOrder(order)
        })
        .catch(err => {
          uni.showToast({ title: err.message || '下单失败', icon: 'none' })
          this.load() // 刷新库存/状态
        })
        .finally(() => {
          this.submitting = false
        })
    },
    // 下单成功后直接调起支付：mock 模拟支付 / real 微信支付（与拼团链路一致）
    async doPayAfterOrder(order) {
      let mode = 'mock'
      try {
        const r = await get('/api/wxapp/config/pay-mode')
        mode = r.mode === 'real' ? 'real' : 'mock'
      } catch (e) {
        mode = 'mock'
      }
      if (mode === 'mock') {
        try {
          await post('/api/wxapp/orders/' + order.orderNo + '/mock-pay')
          uni.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/order-detail/index?orderNo=' + order.orderNo })
          }, 800)
        } catch (e) {
          console.error('模拟支付失败:', e)
          uni.showToast({ title: e.message || '支付失败', icon: 'none' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
          }, 800)
        }
        return
      }
      // 真实微信支付：后端下单拿参数 → wx.requestPayment
      try {
        const params = await post('/api/wxapp/orders/' + order.orderNo + '/pay')
        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
          success: () => {
            uni.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => {
              uni.redirectTo({ url: '/pages/order-detail/index?orderNo=' + order.orderNo })
            }, 800)
          },
          fail: (err) => {
            console.error('微信支付失败:', err)
            setTimeout(() => {
              uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
            }, 800)
          }
        })
      } catch (e) {
        console.error('发起支付失败:', e)
        uni.showToast({ title: e.message || '支付失败', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
        }, 800)
      }
    }
  },
  onShareAppMessage() {
    const title = this.detail
      ? `限时秒杀！${this.detail.productName} 只要¥${this.detail.seckillPrice}`
      : '限时秒杀专场'
    return {
      title,
      path: '/pages/flash-detail/index?id=' + this.activityId,
      imageUrl: this.carousel[0] || ''
    }
  }
}
</script>

<style scoped>
.detail-page {
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  background: #fafafa;
  overflow-x: hidden;
}
.white {
  background: #fff;
}

/* 导航栏 */
.nav-bar {
  height: 88rpx;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  background: #fff;
  position: relative;
}
.nav-back {
  font-size: 52rpx;
  font-weight: 300;
  color: #333;
  line-height: 1;
}
.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: 700;
}
.capsule {
  margin-left: auto;
  font-size: 28rpx;
  color: #999;
}

/* 主图 */
.hero-wrap {
  height: 480rpx;
  position: relative;
  background: #fff;
}
.hero-wrap image {
  width: 100%;
  height: 100%;
}
.hero-swiper {
  width: 100%;
  height: 100%;
}
.hero-swiper image {
  width: 100%;
  height: 480rpx;
}
.pager {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  padding: 8rpx 18rpx;
  border-radius: 26rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22rpx;
}

/* 价格卡 */
.price-card {
  margin: -6rpx 20rpx 22rpx;
  padding: 28rpx 26rpx;
  display: flex;
}
.price-main {
  width: 65%;
}
.slot-badge {
  display: inline-block;
  padding: 7rpx 16rpx;
  border-radius: 9rpx;
  background: #ff4a32;
  color: #fff;
  font-size: 21rpx;
  font-weight: 600;
}
.price-line {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  color: #f32622;
}
.price-label {
  margin-right: 12rpx;
  font-size: 26rpx;
}
.price-symbol {
  font-size: 28rpx;
}
.price-big {
  font-size: 64rpx;
  font-weight: 800;
}
.price-discount {
  margin-left: 16rpx;
  padding: 5rpx 12rpx;
  border-radius: 8rpx;
  background: #f32622;
  color: #fff;
  font-size: 21rpx;
}
.old-price {
  display: block;
  margin-top: 10rpx;
  color: #999;
  text-decoration: line-through;
  font-size: 23rpx;
}
.detail-title {
  display: block;
  margin-top: 20rpx;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
}
.detail-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}
.detail-tags text {
  padding: 7rpx 14rpx;
  border-radius: 13rpx;
  background: #f4f4f4;
  color: #777;
  font-size: 20rpx;
}
.time-card {
  width: 35%;
  padding: 28rpx 12rpx;
  text-align: center;
  background: #fff8f5;
  border-radius: 20rpx;
}
.time-title {
  font-size: 21rpx;
  color: #666;
}
.time-row {
  margin: 16rpx 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4rpx;
}
.time-row .time {
  padding: 8rpx;
  border-radius: 8rpx;
  background: #f32825;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.time-row .colon {
  color: #f32825;
  font-weight: 700;
}
.stock-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 19rpx;
  color: #888;
  line-height: 1.6;
}
.accent {
  color: #f32825;
  font-weight: 700;
}

/* 已选规格 */
.spec {
  margin: 0 20rpx 22rpx;
  padding: 28rpx 26rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
}
.spec-label {
  color: #999;
  flex: none;
}
.spec-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spec-arrow {
  font-size: 40rpx;
  color: #ccc;
}

/* 活动规则 */
.rules {
  margin: 0 20rpx 22rpx;
  padding: 28rpx 26rpx;
}
.block-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #f13327;
}
.rule-grid {
  margin-top: 26rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22rpx;
}
.rule-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
}
.rule-icon {
  flex: none;
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  background: #fdeeed;
  color: #f13327;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rule-txt {
  flex: 1;
  min-width: 0;
  color: #555;
  font-size: 22rpx;
  line-height: 1.5;
}

/* 图文详情 */
.story-card {
  margin: 0 20rpx;
  padding: 24rpx;
}
.story-tabs {
  display: flex;
  justify-content: center;
  font-size: 28rpx;
}
.story-tab {
  padding-bottom: 10rpx;
  color: #555;
}
.story-tab.active {
  border-bottom: 6rpx solid #f32f25;
  color: #f32f25;
  font-weight: 700;
}
.story-banner {
  height: 260rpx;
  margin-top: 22rpx;
  padding: 44rpx 36rpx;
  border-radius: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.25)), url('/static/detail-hero.jpg');
  background-size: cover;
  background-position: center;
}
.story-sub {
  font-size: 24rpx;
  letter-spacing: 5rpx;
  color: #333;
}
.story-main {
  margin-top: 10rpx;
  font-family: serif;
  font-size: 52rpx;
  font-weight: 700;
  color: #222;
}
.story-tag {
  margin-top: 14rpx;
  padding: 9rpx 24rpx;
  border-radius: 28rpx;
  background: #f3352a;
  color: #fff;
  font-size: 20rpx;
}
.promises {
  margin-top: 18rpx;
  padding: 20rpx;
  background: #fff8f2;
  border-radius: 16rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.promise-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  border-right: 1rpx solid #eadacb;
}
.promise-item:last-child {
  border-right: 0;
}
.promise-title {
  font-size: 20rpx;
  font-weight: 700;
}
.promise-desc {
  color: #888;
  font-size: 17rpx;
}

/* 底部购买栏 */
.buy-bar {
  position: fixed;
  left: 50%;
  right: auto;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  height: calc(140rpx + env(safe-area-inset-bottom));
  padding: 16rpx 24rpx env(safe-area-inset-bottom);
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: #fff;
  box-shadow: 0 -6rpx 24rpx rgba(0, 0, 0, 0.06);
}
.mini-action {
  width: 74rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.mini-icon {
  font-size: 38rpx;
  color: #555;
}
.mini-label {
  font-size: 19rpx;
  color: #555;
}
.buy-btn {
  flex: 1;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff5a31, #f51c21);
  color: #fff;
  font-size: 33rpx;
  font-weight: 700;
}
.buy-btn.disabled {
  background: #bbb;
}

/* 加载失败 / 富文本 */
.load-error {
  margin: 120rpx 40rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.detail-html {
  display: block;
  margin-top: 22rpx;
  width: 100%;
  overflow: hidden;
}
/* 富文本图片自适应：H5 端 rich-text 渲染为原生 img，需深度选择器约束 */
.detail-html ::v-deep img {
  max-width: 100% !important;
  width: 100% !important;
  height: auto !important;
  display: block;
}

/* SKU 选择面板 */
.sku-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}
.sku-sheet {
  width: 100%;
  max-height: 70vh;
  padding: 30rpx 30rpx calc(30rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: #fff;
  overflow-y: auto;
}
.sku-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sku-title {
  font-size: 32rpx;
  font-weight: 700;
}
.sku-close {
  font-size: 44rpx;
  color: #999;
  line-height: 1;
}
.sku-item {
  margin-bottom: 18rpx;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.sku-item.active {
  border-color: #f32622;
  background: #fff7f6;
}
.sku-name {
  flex: 1;
  font-size: 27rpx;
  font-weight: 600;
}
.sku-price {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.sku-seckill {
  color: #f32622;
  font-size: 30rpx;
  font-weight: 700;
}
.sku-old {
  color: #999;
  text-decoration: line-through;
  font-size: 22rpx;
}
.sku-limit {
  color: #f60;
  font-size: 20rpx;
}
.sku-confirm {
  margin-top: 10rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff5a31, #f51c21);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
