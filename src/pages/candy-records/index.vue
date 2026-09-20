<template>
  <view class="page ledger-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">糖豆明细</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 资产摘要卡 -->
    <view class="summary-card">
      <view class="card-deco deco-a"></view>
      <view class="card-deco deco-b"></view>
      <view class="summary-head">
        <text class="summary-label">可用糖豆</text>
        <view class="frozen-chip">
          <view class="frozen-chip-dot"></view>
          <text class="frozen-chip-text">{{ exchangeRate }} 糖豆抵 1 元</text>
        </view>
      </view>
      <view class="summary-amount">
        <text class="summary-symbol">🍬</text>
        <text class="summary-value">{{ summary.candy || 0 }}</text>
      </view>
      <text class="summary-tip">注册赠送 / 抽奖中奖可获得糖豆，购买支持抵扣的商品时可抵扣部分现金</text>
    </view>

    <!-- 流水列表 -->
    <view class="ledger-list">
      <view v-for="item in items" :key="item.id" class="ledger-item card">
        <view class="ledger-icon" :class="item.amount >= 0 ? 'income' : 'spend'">🍬</view>
        <view class="ledger-main">
          <text class="ledger-title">{{ item.title }}</text>
          <text class="ledger-time">{{ item.createdAt }}</text>
          <text class="ledger-order" v-if="item.orderNo">订单 {{ item.orderNo }}</text>
        </view>
        <view class="ledger-side">
          <text class="ledger-amount" :class="item.amount >= 0 ? 'positive' : 'negative'">{{ amountText(item) }}</text>
        </view>
      </view>

      <view v-if="!loading && !items.length" class="empty-box">
        <view class="empty-icon">🍬</view>
        <text class="empty-text">暂无糖豆明细</text>
        <text class="empty-sub">注册赠送、抽奖中奖、下单抵扣都会记录在这里</text>
      </view>

      <view v-if="items.length && !hasMore" class="no-more">没有更多了</view>
      <view v-if="loading" class="loading-tip">加载中...</view>
    </view>
  </view>
</template>

<script>
import { get } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

export default {
  data() {
    return {
      summary: { candy: 0 },
      exchangeRate: 100,
      items: [],
      page: 1,
      size: 20,
      total: 0,
      loading: false
    }
  },
  computed: {
    hasMore() {
      return this.items.length < this.total
    }
  },
  onLoad() {
    if (!isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => this.goBack(), 600)
      return
    }
    this.loadConfig()
    this.load()
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.page += 1
      this.load(true)
    }
  },
  onPullDownRefresh() {
    this.page = 1
    this.load().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async loadConfig() {
      try {
        const resp = await get('/api/wxapp/candy-config')
        this.exchangeRate = resp.exchangeRate || 100
      } catch (e) { /* 使用默认兑换比例 */ }
    },
    async load(append) {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/wallet/candy-records', {
          page: this.page,
          size: this.size
        })
        this.summary = resp.summary || this.summary
        this.total = resp.total || 0
        this.items = append ? this.items.concat(resp.items || []) : (resp.items || [])
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    amountText(item) {
      const v = Math.round(Number(item.amount || 0))
      return (v >= 0 ? '+' : '') + v
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/profile/index' })
      }
    }
  }
}
</script>

<style scoped>
.ledger-page {
  background: #fdf7f9;
  padding-bottom: 40rpx;
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

/* 资产摘要卡 */
.summary-card {
  position: relative;
  margin: 20rpx 24rpx;
  padding: 36rpx 32rpx 36rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ff8fb2, #e0447f);
  overflow: hidden;
  box-shadow: 0 12rpx 30rpx rgba(224, 68, 127, 0.22);
}
.card-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.09);
  pointer-events: none;
}
.card-deco.deco-a {
  width: 240rpx;
  height: 240rpx;
  top: -110rpx;
  right: -70rpx;
}
.card-deco.deco-b {
  width: 130rpx;
  height: 130rpx;
  bottom: -60rpx;
  left: -50rpx;
}
.summary-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.summary-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  white-space: nowrap;
}
.frozen-chip {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.frozen-chip-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}
.frozen-chip-text {
  color: #fff;
  font-size: 22rpx;
}
.summary-amount {
  position: relative;
  margin-top: 18rpx;
  display: flex;
  align-items: baseline;
}
.summary-symbol {
  font-size: 40rpx;
  margin-right: 10rpx;
}
.summary-value {
  color: #fff;
  font-size: 64rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.summary-tip {
  position: relative;
  display: block;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.8);
  font-size: 21rpx;
  line-height: 1.6;
}

/* 流水列表 */
.ledger-list {
  padding: 4rpx 24rpx 30rpx;
}
.ledger-item {
  margin-top: 18rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.ledger-icon {
  width: 76rpx;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 22rpx;
  font-size: 34rpx;
  flex: none;
}
.ledger-icon.income {
  background: #ffe9f1;
}
.ledger-icon.spend {
  background: #f2f2f5;
}
.ledger-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.ledger-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #262927;
}
.ledger-time {
  font-size: 21rpx;
  color: #8a8f8b;
}
.ledger-order {
  font-size: 19rpx;
  color: #b0b5b1;
}
.ledger-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}
.ledger-amount {
  font-size: 32rpx;
  font-weight: 800;
}
.ledger-amount.positive {
  color: #e0447f;
}
.ledger-amount.negative {
  color: #8e8e93;
}

/* 空态 / 底部 */
.empty-box {
  padding: 90rpx 0 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.empty-icon {
  width: 110rpx;
  height: 110rpx;
  line-height: 110rpx;
  text-align: center;
  border-radius: 50%;
  background: #fdeef3;
  font-size: 52rpx;
}
.empty-text {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #6d736f;
  font-weight: 600;
}
.empty-sub {
  font-size: 22rpx;
  color: #a5aba7;
}
.no-more {
  text-align: center;
  padding: 30rpx;
  color: #aaa;
  font-size: 22rpx;
}
.loading-tip {
  text-align: center;
  padding: 20rpx;
  color: #aaa;
  font-size: 22rpx;
}
</style>
