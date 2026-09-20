<template>
  <view class="page logistics-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">查看物流</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="page-tip">加载中...</view>

    <template v-else-if="order">
      <!-- 物流状态卡 -->
      <view class="status-card">
        <view class="status-icon" :class="{ 'icon-done': signed }">🚚</view>
        <text class="status-title">{{ statusTitle }}</text>
        <text class="status-sub">{{ statusSub }}</text>
      </view>

      <!-- 物流单号卡 -->
      <view v-if="logistics" class="card">
        <view class="info-row">
          <text class="info-label">快递公司</text>
          <text class="info-value">{{ logistics.deliveryName }}</text>
        </view>
        <view class="info-row" @tap="copyWaybill">
          <text class="info-label">运单编号</text>
          <text class="info-value copy">{{ logistics.waybillId }} · 点击复制</text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="card">
        <view class="card-title">商品信息</view>
        <view v-for="(it, idx) in order.items" :key="idx" class="goods-row">
          <image class="goods-img" :src="itemImage(it)" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ it.productName }}</text>
            <text class="goods-spec">{{ specText(it) }}</text>
          </view>
          <view class="goods-right">
            <text class="goods-price">¥{{ fmtPrice(it.price) }}</text>
            <text class="goods-qty">×{{ it.quantity }}</text>
          </view>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="card">
        <view class="card-title">收货信息</view>
        <view class="info-row">
          <text class="info-label">收货人</text>
          <text class="info-value">{{ order.receiverName }} {{ order.receiverPhone }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">收货地址</text>
          <text class="info-value">{{ order.receiverAddress }}</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="card">
        <view class="card-title">订单信息</view>
        <view class="info-row">
          <text class="info-label">订单编号</text>
          <text class="info-value">{{ order.orderNo }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ order.createdAt }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">发货时间</text>
          <text class="info-value">{{ order.shipTime || '—' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">实付金额</text>
          <text class="info-value amount">¥{{ fmtPrice(order.totalAmount) }}</text>
        </view>
      </view>

      <!-- 物流轨迹 -->
      <view class="card track-card">
        <view class="card-title">物流轨迹</view>
        <template v-if="trackList.length">
          <view
            v-for="(t, idx) in trackList"
            :key="idx"
            class="track-item"
            :class="{ first: idx === 0 }"
          >
            <view class="track-dot" :class="{ done: idx === 0 }"></view>
            <view class="track-body">
              <text class="track-desc" :class="{ current: idx === 0 }">{{ t.desc }}</text>
              <text class="track-time">{{ t.time }}</text>
            </view>
          </view>
        </template>
        <view v-else class="track-empty">
          <text class="track-empty-icon">🚚</text>
          <text class="track-empty-text">{{ tip || '暂无物流信息' }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </template>

    <view v-else class="page-tip">订单不存在</view>
  </view>
</template>

<script>
import { get, resolveAssetUrl } from '@/utils/api.js'

export default {
  data() {
    return {
      orderNo: null,
      order: null,
      logistics: null,
      trackList: [],
      tip: '',
      loading: false
    }
  },
  computed: {
    // 有最新轨迹（视为已揽收/运输中/已签收）
    signed() {
      return this.trackList.length > 0
    },
    statusTitle() {
      if (this.trackList.length) {
        const last = this.trackList[0]
        return /签收|已送达/.test(last.desc) ? '已签收' : '运输中'
      }
      if (this.order) {
        return this.order.status === 'completed' ? '已签收' : '已发货'
      }
      return '物流信息'
    },
    statusSub() {
      if (this.trackList.length) return this.trackList[0].desc
      if (this.tip) return this.tip
      return this.order ? '物流信息暂未同步，请稍后查看' : ''
    }
  },
  onLoad(options) {
    this.orderNo = options.orderNo
    if (this.orderNo) this.loadLogistics()
  },
  methods: {
    async loadLogistics() {
      this.loading = true
      try {
        const r = await get('/api/wxapp/orders/' + this.orderNo + '/logistics')
        this.order = r.order || null
        this.logistics = r.logistics || null
        this.trackList = (r.logistics && r.logistics.trackList) || []
        this.tip = r.message || ''
      } catch (e) {
        console.error('加载物流信息失败:', e)
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    copyWaybill() {
      if (!this.logistics || !this.logistics.waybillId) return
      uni.setClipboardData({ data: this.logistics.waybillId })
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    specText(item) {
      const spec = (item && item.skuSpec) || {}
      const vals = Object.values(spec)
      return vals.length > 0 ? vals.join(' / ') : '默认规格'
    },
    itemImage(item) {
      if (item && item.skuImage) return resolveAssetUrl(item.skuImage)
      return '/static/product-bath.jpg'
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.logistics-page {
  background: #f7f8f6;
  min-height: 100vh;
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

/* 状态卡 */
.status-card {
  padding: 48rpx 0 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
}
.status-icon {
  width: 96rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  border-radius: 50%;
  background: #eaf8ef;
  color: #27b969;
  font-size: 48rpx;
}
.status-icon.icon-done {
  background: #eaf8ef;
}
.status-title {
  margin-top: 20rpx;
  font-size: 34rpx;
  font-weight: 800;
}
.status-sub {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #9aa09b;
  padding: 0 40rpx;
  text-align: center;
}

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}
.card-title {
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  font-size: 24rpx;
}
.info-label {
  color: #9aa09b;
  flex: none;
  margin-right: 24rpx;
}
.info-value {
  color: #3a3f3b;
  text-align: right;
  word-break: break-all;
}
.info-value.copy {
  color: #27b969;
}
.info-value.amount {
  color: #ff3b42;
  font-weight: 800;
}

/* 商品摘要 */
.goods-row {
  display: flex;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f2ef;
}
.goods-row:last-of-type {
  border-bottom: none;
}
.goods-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f2f5f1;
  flex: none;
}
.goods-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.goods-name {
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.goods-spec {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9aa09b;
}
.goods-right {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}
.goods-price {
  color: #ff3b42;
  font-size: 28rpx;
  font-weight: 800;
}
.goods-qty {
  font-size: 22rpx;
  color: #9aa09b;
}

/* 物流轨迹时间线 */
.track-item {
  display: flex;
  position: relative;
  padding-bottom: 36rpx;
}
.track-item:last-child {
  padding-bottom: 0;
}
.track-item::before {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 30rpx;
  bottom: 0;
  width: 2rpx;
  background: #e5e9e4;
}
.track-item:last-child::before {
  display: none;
}
.track-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #e5e9e4;
  flex: none;
  margin-right: 20rpx;
  margin-top: 6rpx;
}
.track-dot.done {
  background: #27b969;
}
.track-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.track-desc {
  font-size: 26rpx;
  color: #3a3f3b;
  line-height: 1.5;
}
.track-desc.current {
  font-weight: 700;
}
.track-time {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9aa09b;
}

/* 空轨迹 */
.track-empty {
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.track-empty-icon {
  font-size: 64rpx;
}
.track-empty-text {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #9aa09b;
  text-align: center;
}

.bottom-space {
  height: 60rpx;
}
</style>
