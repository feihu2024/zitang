<template>
  <view class="page ledger-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">积分明细</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 资产摘要卡 -->
    <view class="summary-card">
      <view class="card-deco deco-a"></view>
      <view class="card-deco deco-b"></view>
      <view class="summary-head">
        <text class="summary-label">可用积分</text>
        <view class="frozen-chip">
          <view class="frozen-chip-dot"></view>
          <text class="frozen-chip-text">冻结中 {{ formatPoints(summary.frozenPoints) }}</text>
        </view>
      </view>
      <view class="summary-amount">
        <text class="summary-value">{{ formatPoints(summary.points) }}</text>
      </view>
    </view>

    <!-- 流水列表 -->
    <view class="ledger-list">
      <view v-for="item in items" :key="item.id" class="ledger-item card">
        <view class="ledger-icon" :class="stateClass(item.state)">●</view>
        <view class="ledger-main">
          <text class="ledger-title">{{ item.title }}</text>
          <text class="ledger-time">{{ item.createdAt }}</text>
          <text class="ledger-order" v-if="item.orderNo">订单 {{ item.orderNo }}</text>
        </view>
        <view class="ledger-side">
          <text class="ledger-amount" :class="amountClass(item.state)">{{ amountText(item) }}</text>
          <text class="ledger-state" :class="stateClass(item.state)">{{ stateText(item.state) }}</text>
        </view>
      </view>

      <view v-if="!loading && !items.length" class="empty-box">
        <view class="empty-icon">●</view>
        <text class="empty-text">暂无积分明细</text>
        <text class="empty-sub">卖出商品获得积分后，可在这里查看</text>
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
      summary: { points: 0, frozenPoints: 0 },
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
    async load(append) {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/wallet/point-records', {
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
    formatPoints(v) {
      return String(Math.round(Number(v || 0)))
    },
    stateText(s) {
      const map = { frozen: '冻结中', settled: '已到账', refunded: '已扣回', cancelled: '已取消' }
      return map[s] || s
    },
    stateClass(s) {
      const map = { frozen: 'frozen', settled: 'settled', refunded: 'refunded', cancelled: 'cancelled' }
      return map[s] || ''
    },
    amountClass(s) {
      return s === 'settled' || s === 'frozen' ? 'positive' : 'negative'
    },
    amountText(item) {
      const sign = item.state === 'settled' || item.state === 'frozen' ? '+' : '-'
      return sign + this.formatPoints(item.amount)
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
  background: #f6f8f6;
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
  padding: 36rpx 32rpx 40rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #f5b24b, #e8932a);
  overflow: hidden;
  box-shadow: 0 12rpx 30rpx rgba(232, 147, 42, 0.22);
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
  background: rgba(255, 255, 255, 0.18);
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
.summary-value {
  color: #fff;
  font-size: 64rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
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
  font-weight: 700;
  flex: none;
}
.ledger-icon.settled {
  background: #fdf3e3;
  color: #e8932a;
}
.ledger-icon.frozen {
  background: #e8f0ff;
  color: #007aff;
}
.ledger-icon.refunded,
.ledger-icon.cancelled {
  background: #f2f2f5;
  color: #8e8e93;
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
  color: #e8932a;
}
.ledger-amount.negative {
  color: #8e8e93;
}
.ledger-state {
  padding: 5rpx 14rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  line-height: 1;
}
.ledger-state.settled {
  background: rgba(232, 147, 42, 0.12);
  color: #e8932a;
}
.ledger-state.frozen {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
}
.ledger-state.refunded,
.ledger-state.cancelled {
  background: rgba(142, 142, 147, 0.12);
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
  background: #f7f0e4;
  color: #d9b98a;
  font-size: 48rpx;
  font-weight: 700;
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
