<template>
  <view class="page ti-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">我的业绩</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 当前级别卡片 -->
    <view class="perf-card">
      <view class="card-deco deco-a"></view>
      <view class="card-deco deco-b"></view>
      <view class="level-top">
        <text class="level-label">当前级别</text>
        <text v-if="info.tierRate" class="level-rate">{{ info.tierRate }}% 分成</text>
      </view>
      <view class="level-name">{{ info.tierName || '普通' }}</view>
      <view class="level-month">
        本月团队业绩 ¥{{ formatMoney(info.total) }}
        <text class="level-month-sub">冻结 ¥{{ formatMoney(info.pending) }}</text>
      </view>
      <!-- 下一档进度 -->
      <view v-if="info.nextMin != null" class="next-tier">
        <view class="next-tier-bar">
          <view class="next-tier-fill" :style="{ width: progressPct + '%' }"></view>
        </view>
        <text class="next-tier-text">距「{{ info.nextName || ('档位' + (info.tierNo + 1)) }}」（{{ info.nextRate }}%）还差 ¥{{ formatMoney(info.gap) }}</text>
      </view>
      <view v-else class="next-tier">
        <text class="next-tier-text">🎉 已达最高档 {{ info.tierRate }}%</text>
      </view>
    </view>

    <!-- 销售业绩：当日 / 本月 / 累计 -->
    <view class="card block-card">
      <view class="section-title">销售业绩<text class="section-sub">元</text></view>
      <view class="perf-grid">
        <view class="perf-cell">
          <text class="perf-cell-label">当日</text>
          <view class="perf-metric">
            <text class="perf-metric-k">业绩</text>
            <text class="perf-metric-v">¥{{ formatMoney(info.todayPerf.total) }}</text>
          </view>
          <view class="perf-metric">
            <text class="perf-metric-k">冻结</text>
            <text class="perf-metric-v frozen">¥{{ formatMoney(info.todayPerf.pending) }}</text>
          </view>
        </view>
        <view class="perf-cell">
          <text class="perf-cell-label">本月</text>
          <view class="perf-metric">
            <text class="perf-metric-k">业绩</text>
            <text class="perf-metric-v">¥{{ formatMoney(info.total) }}</text>
          </view>
          <view class="perf-metric">
            <text class="perf-metric-k">冻结</text>
            <text class="perf-metric-v frozen">¥{{ formatMoney(info.pending) }}</text>
          </view>
        </view>
        <view class="perf-cell">
          <text class="perf-cell-label">累计</text>
          <view class="perf-metric">
            <text class="perf-metric-k">业绩</text>
            <text class="perf-metric-v">¥{{ formatMoney(info.cumPerf.total) }}</text>
          </view>
          <view class="perf-metric">
            <text class="perf-metric-k">冻结</text>
            <text class="perf-metric-v frozen">¥{{ formatMoney(info.cumPerf.pending) }}</text>
          </view>
        </view>
      </view>
      <view class="block-tip">业绩 = 本人及推荐链下级的现金实付累计（含运费）；冻结为未确认收货部分，确认收货后转已结算，退款自动冲减。</view>
    </view>

    <!-- 我的收益（级差分成） -->
    <view class="card block-card">
      <view class="section-title">我的收益<text class="section-sub">级差分成 · 元</text></view>
      <view class="income-row">
        <view class="income-cell">
          <text class="income-cell-label">待到账（冻结中）</text>
          <text class="income-cell-val pending">¥{{ formatMoney(info.income.pending) }}</text>
        </view>
        <view class="income-cell">
          <text class="income-cell-label">已到账</text>
          <text class="income-cell-val settled">¥{{ formatMoney(info.income.settled) }}</text>
        </view>
      </view>
      <view class="income-mini">
        <text class="income-mini-item">今日 <b>¥{{ formatMoney(info.income.today) }}</b></text>
        <text class="income-mini-item">本月 <b>¥{{ formatMoney(info.income.month) }}</b></text>
        <text class="income-mini-item">累计 <b>¥{{ formatMoney(info.income.total) }}</b></text>
      </view>
      <view class="block-tip">下单人拿本人档位比例，上级拿级差；订单确认收货后收益由「冻结中」转「已到账」并计入余额。</view>
    </view>

    <!-- 收益明细流水 -->
    <view class="section-title list-title">收益明细</view>
    <view class="state-filter">
      <text
        v-for="f in stateFilters"
        :key="f.value"
        class="state-chip"
        :class="{ active: stateFilter === f.value }"
        @tap="setStateFilter(f.value)"
      >{{ f.label }}</text>
    </view>
    <view class="ledger-list">
      <view v-for="item in items" :key="item.id" class="ledger-item card">
        <view class="ledger-icon" :class="stateClass(item.state)">¥</view>
        <view class="ledger-main">
          <text class="ledger-title">{{ item.productName || item.title || '级差收益' }}</text>
          <text class="ledger-buyer" v-if="item.buyerName">购买人 {{ item.buyerName }}</text>
          <text class="ledger-time">{{ item.createdAt }}</text>
        </view>
        <view class="ledger-side">
          <text class="ledger-amount" :class="amountClass(item.state)">{{ amountText(item) }}</text>
          <text class="ledger-state" :class="stateClass(item.state)">{{ stateText(item.state) }}</text>
        </view>
      </view>

      <view v-if="!loading && !items.length" class="empty-box">
        <view class="empty-icon">📈</view>
        <text class="empty-text">暂无级差收益</text>
        <text class="empty-sub">下级下单后，你的级差分成会按商品和购买人显示在这里</text>
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
      info: {
        enabled: false,
        month: '', total: 0, pending: 0, settled: 0,
        tierNo: 0, tierName: '', tierRate: 0,
        nextMin: null, nextRate: null, nextName: null, gap: 0,
        tiers: [],
        todayPerf: { pending: 0, settled: 0, total: 0 },
        cumPerf: { pending: 0, settled: 0, total: 0 },
        income: { pending: 0, settled: 0, total: 0, today: 0, month: 0 }
      },
      stateFilter: 'all',
      stateFilters: [
        { label: '全部', value: 'all' },
        { label: '冻结中', value: 'frozen' },
        { label: '已结算', value: 'settled' }
      ],
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
    },
    progressPct() {
      if (this.info.nextMin == null || this.info.nextMin <= 0) return 100
      const pct = (this.info.total / this.info.nextMin) * 100
      return Math.max(0, Math.min(100, pct))
    }
  },
  onLoad() {
    if (!isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => this.goBack(), 600)
      return
    }
    this.loadInfo()
    this.load()
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.page += 1
      this.load(true)
    }
  },
  onPullDownRefresh() {
    Promise.all([this.loadInfo(), this.load()]).finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async loadInfo() {
      try {
        const d = await get('/api/wxapp/team-incentive/my')
        // 兜底合并，避免旧缓存/缺字段导致模板取值报错
        this.info = Object.assign({}, this.info, d || {}, {
          todayPerf: Object.assign({ pending: 0, settled: 0, total: 0 }, (d && d.todayPerf) || {}),
          cumPerf: Object.assign({ pending: 0, settled: 0, total: 0 }, (d && d.cumPerf) || {}),
          income: Object.assign({ pending: 0, settled: 0, total: 0, today: 0, month: 0 }, (d && d.income) || {})
        })
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },
    async load(append) {
      this.loading = true
      try {
        const params = { page: this.page, size: this.size }
        if (this.stateFilter !== 'all') params.state = this.stateFilter
        const resp = await get('/api/wxapp/team-incentive/records', params)
        this.total = resp.total || 0
        this.items = append ? this.items.concat(resp.items || []) : (resp.items || [])
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    setStateFilter(v) {
      if (this.stateFilter === v) return
      this.stateFilter = v
      this.page = 1
      this.items = []
      this.load()
    },
    formatMoney(v) {
      return Number(v || 0).toFixed(2)
    },
    stateText(s) {
      const map = { frozen: '冻结中', settled: '已结算', refunded: '已扣回', cancelled: '已取消' }
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
      return sign + this.formatMoney(item.amount)
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
.ti-page {
  background: #f6f8f6;
  padding-bottom: 48rpx;
  overflow-x: hidden;
}
.white {
  background: #fff;
}

/* 导航栏 */
.nav-bar {
  height: 92rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  background: #fff;
  position: relative;
}
.nav-back {
  font-size: 56rpx;
  font-weight: 300;
  color: #333;
  line-height: 1;
}
.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 38rpx;
  font-weight: 700;
}
.capsule {
  margin-left: auto;
  font-size: 30rpx;
  color: #999;
}

/* 当前级别卡片 */
.perf-card {
  position: relative;
  margin: 24rpx 26rpx;
  padding: 40rpx 36rpx 34rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #3fae57, #237b39);
  overflow: hidden;
  box-shadow: 0 12rpx 30rpx rgba(35, 123, 57, 0.22);
}
.card-deco {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  pointer-events: none;
}
.card-deco.deco-a {
  width: 260rpx;
  height: 260rpx;
  top: -120rpx;
  right: -76rpx;
}
.card-deco.deco-b {
  width: 140rpx;
  height: 140rpx;
  bottom: -66rpx;
  left: -54rpx;
}
.level-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.level-label {
  color: rgba(255, 255, 255, 0.88);
  font-size: 28rpx;
}
.level-rate {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}
.level-name {
  position: relative;
  margin-top: 14rpx;
  color: #fff;
  font-size: 72rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  line-height: 1.15;
}
.level-month {
  position: relative;
  margin-top: 16rpx;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.level-month-sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.75);
  font-size: 24rpx;
  font-weight: 400;
}
.next-tier {
  position: relative;
  margin-top: 28rpx;
}
.next-tier-bar {
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
}
.next-tier-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #fff;
  transition: width 0.4s ease;
}
.next-tier-text {
  display: block;
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.88);
  font-size: 25rpx;
}

/* 通用卡片块 */
.card {
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 42, 34, 0.04);
}
.block-card {
  margin: 12rpx 26rpx 0;
  padding: 32rpx 30rpx 26rpx;
}
.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #262927;
  margin-bottom: 20rpx;
}
.section-sub {
  margin-left: 14rpx;
  font-size: 24rpx;
  font-weight: 400;
  color: #a5aba7;
}
.block-tip {
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #a5aba7;
}

/* 销售业绩网格 */
.perf-grid {
  display: flex;
  gap: 16rpx;
}
.perf-cell {
  flex: 1;
  min-width: 0;
  padding: 24rpx 18rpx;
  border-radius: 20rpx;
  background: #f4faf5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12rpx;
}
.perf-cell-label {
  font-size: 26rpx;
  color: #6d736f;
  text-align: center;
}
.perf-metric {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8rpx;
}
.perf-metric-k {
  font-size: 22rpx;
  color: #8a8f8b;
  flex: none;
}
.perf-metric-v {
  font-size: 30rpx;
  font-weight: 800;
  color: #2d9b3b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.perf-metric-v.frozen {
  color: #007aff;
}

/* 我的收益 */
.income-row {
  display: flex;
  gap: 16rpx;
}
.income-cell {
  flex: 1;
  min-width: 0;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #f7f9f7;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.income-cell-label {
  font-size: 26rpx;
  color: #6d736f;
}
.income-cell-val {
  font-size: 48rpx;
  font-weight: 800;
}
.income-cell-val.pending {
  color: #007aff;
}
.income-cell-val.settled {
  color: #2d9b3b;
}
.income-mini {
  margin-top: 20rpx;
  display: flex;
  justify-content: space-between;
  padding: 0 6rpx;
}
.income-mini-item {
  font-size: 26rpx;
  color: #8a8f8b;
}
.income-mini-item b {
  color: #262927;
  font-weight: 700;
}

/* 流水列表 */
.list-title {
  margin: 36rpx 30rpx 0;
}
.state-filter {
  display: flex;
  gap: 16rpx;
  padding: 18rpx 30rpx 0;
}
.state-chip {
  padding: 10rpx 30rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #6d736f;
  font-size: 25rpx;
  border: 1rpx solid #e4e9e4;
}
.state-chip.active {
  background: #237b39;
  border-color: #237b39;
  color: #fff;
  font-weight: 700;
}
.ledger-list {
  padding: 4rpx 26rpx 30rpx;
}
.ledger-item {
  margin-top: 20rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.ledger-icon {
  width: 84rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 24rpx;
  font-size: 40rpx;
  font-weight: 700;
  flex: none;
}
.ledger-icon.settled {
  background: #e8f9ef;
  color: #2d9b3b;
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
  gap: 8rpx;
}
.ledger-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #262927;
}
.ledger-time {
  font-size: 24rpx;
  color: #8a8f8b;
}
.ledger-buyer {
  font-size: 24rpx;
  color: #6d736f;
}
.ledger-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}
.ledger-amount {
  font-size: 38rpx;
  font-weight: 800;
}
.ledger-amount.positive {
  color: #2d9b3b;
}
.ledger-amount.negative {
  color: #8e8e93;
}
.ledger-state {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 1;
}
.ledger-state.settled {
  background: rgba(45, 155, 59, 0.1);
  color: #2d9b3b;
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
  width: 116rpx;
  height: 116rpx;
  line-height: 116rpx;
  text-align: center;
  border-radius: 50%;
  background: #eef3ee;
  color: #9db89f;
  font-size: 56rpx;
  font-weight: 700;
}
.empty-text {
  margin-top: 16rpx;
  font-size: 32rpx;
  color: #6d736f;
  font-weight: 600;
}
.empty-sub {
  font-size: 25rpx;
  color: #a5aba7;
  text-align: center;
  padding: 0 60rpx;
}
.no-more {
  text-align: center;
  padding: 30rpx;
  color: #aaa;
  font-size: 24rpx;
}
.loading-tip {
  text-align: center;
  padding: 20rpx;
  color: #aaa;
  font-size: 24rpx;
}
</style>
