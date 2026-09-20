<template>
  <view class="page transfer-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">积分互转</text>
      <text class="nav-history" @tap="scrollToRecords">⟲</text>
    </view>

    <!-- 我的积分账户卡 -->
    <view class="account-card">
      <view class="card-deco deco-a"></view>
      <view class="card-deco deco-b"></view>
      <view class="account-head">
        <view class="account-title">
          <text class="account-title-icon">▤</text>
          <text class="account-title-text">我的积分账户</text>
        </view>
        <view class="settle-chip">实时结算</view>
      </view>
      <view class="account-body">
        <view class="account-col">
          <text class="account-label">可用积分余额</text>
          <text class="account-value">{{ fmtNum(summary.points) }}</text>
        </view>
        <view class="account-divider"></view>
        <view class="account-col">
          <text class="account-label">冻结积分额</text>
          <text class="account-value">{{ fmtNum(summary.frozenPoints) }}</text>
        </view>
      </view>
    </view>

    <!-- 转出表单 -->
    <view class="form-card card">
      <text class="form-label">受赠人 / 接收方账号 ID</text>
      <view class="input-row">
        <text class="input-icon">👤</text>
        <input
          class="input-main"
          type="number"
          v-model="toId"
          placeholder="请输入对方 ID (例如: 10086)"
          placeholder-class="input-ph"
        />
      </view>
      <view v-if="targets.length" class="target-box">
        <text class="target-tip">仅可转给自己的直推会员，快捷选择：</text>
        <view class="target-chips">
          <view
            v-for="t in targets"
            :key="t.id"
            class="target-chip"
            :class="{ active: toId === String(t.id) }"
            @tap="pickTarget(t)"
          >{{ t.nickname }}（{{ t.id }}）</view>
        </view>
      </view>

      <view class="amount-head">
        <text class="form-label">转账积分数额</text>
        <text class="all-link" @tap="fillAll">全部转出</text>
      </view>
      <view class="input-row">
        <text class="pts-prefix">Pts</text>
        <input
          class="input-main"
          type="number"
          v-model="amount"
          placeholder="0"
          placeholder-class="input-ph"
        />
        <text class="pts-suffix">分</text>
      </view>
      <text class="form-hint">单次可转 1 ~ {{ fmtNum(summary.points) }} 积分</text>

      <view class="submit-btn" :class="{ disabled: submitting }" @tap="onSubmit">
        {{ submitting ? '转出中...' : '确认转出' }}
      </view>
    </view>

    <!-- 互转记录 -->
    <view class="records-card card">
      <view class="records-head">
        <view class="records-title">
          <view class="records-bar"></view>
          <text class="records-title-text">互转记录</text>
        </view>
        <text class="records-count">共 {{ total }} 笔</text>
      </view>
      <view class="filter-row">
        <view
          v-for="f in filters"
          :key="f.value"
          class="filter-chip"
          :class="{ active: direction === f.value }"
          @tap="switchDirection(f.value)"
        >{{ f.label }}</view>
      </view>

      <view class="record-list">
        <view
          v-for="(item, idx) in items"
          :key="item.id"
          class="record-item"
          :class="{ 'no-line': idx === items.length - 1 }"
        >
          <view class="record-avatar" :style="{ background: avatarColor(item) }">
            {{ (item.counterpartName || '会').charAt(0) }}
            <view class="record-dot"></view>
          </view>
          <view class="record-main">
            <text class="record-title">
              {{ item.direction === 'out' ? '转给 ' : '收到 ' }}{{ item.counterpartName || '会员' }}（ID: {{ item.counterpartId || '-' }}）
            </text>
            <view class="record-sub">
              <text class="record-time">{{ fmtTime(item.createdAt) }}</text>
              <text class="record-state" :class="item.state === 'settled' ? 'ok' : 'mut'">{{ stateText(item.state) }}</text>
            </view>
          </view>
          <view class="record-side">
            <text class="record-amount" :class="item.direction">{{ item.direction === 'out' ? '-' : '+' }}{{ fmtNum(item.amount) }}</text>
            <text class="record-unit">Pts</text>
          </view>
        </view>

        <view v-if="!loading && !items.length" class="empty-box">
          <view class="empty-icon">⇄</view>
          <text class="empty-text">暂无互转记录</text>
          <text class="empty-sub">向直推会员转出积分后，可在这里查看</text>
        </view>
        <view v-if="items.length && !hasMore" class="no-more">没有更多了</view>
        <view v-if="loading" class="loading-tip">加载中...</view>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

// 记录头像底色（按对方 ID 取模稳定取色）
const AVATAR_PALETTE = ['#7b6ae0', '#d96a8a', '#5a9de0', '#e09a5a', '#5ab88a']

export default {
  data() {
    return {
      summary: { points: 0, frozenPoints: 0 },
      toId: '',
      amount: '',
      submitting: false,
      targets: [],
      filters: [
        { label: '全部', value: '' },
        { label: '转出', value: 'out' },
        { label: '转入', value: 'in' }
      ],
      direction: '',
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
    this.loadTargets()
    this.loadRecords()
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.page += 1
      this.loadRecords(true)
    }
  },
  onPullDownRefresh() {
    this.page = 1
    Promise.all([this.loadTargets(), this.loadRecords()]).finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    // 可接收互转的直推下线（供快捷选择）
    async loadTargets() {
      try {
        const resp = await get('/api/wxapp/wallet/points-transfer-targets')
        this.targets = resp.items || []
        if (resp.summary) this.summary = resp.summary
      } catch (e) {
        // 接收方候选加载失败不阻塞页面
      }
    },
    async loadRecords(append) {
      this.loading = true
      try {
        const params = { page: this.page, size: this.size }
        if (this.direction) params.direction = this.direction
        const resp = await get('/api/wxapp/wallet/points-transfer-records', params)
        if (resp.summary) this.summary = resp.summary
        this.total = resp.total || 0
        this.items = append ? this.items.concat(resp.items || []) : (resp.items || [])
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    pickTarget(t) {
      this.toId = String(t.id)
    },
    fillAll() {
      this.amount = String(Math.max(0, Math.round(Number(this.summary.points || 0))))
    },
    async onSubmit() {
      if (this.submitting) return
      const toId = parseInt(this.toId, 10)
      const amount = parseInt(this.amount, 10)
      const available = Math.round(Number(this.summary.points || 0))
      if (!toId || toId <= 0) {
        return uni.showToast({ title: '请输入接收方账号 ID', icon: 'none' })
      }
      if (!amount || amount <= 0 || amount > available) {
        return uni.showToast({ title: `单次可转 1 ~ ${available} 积分`, icon: 'none' })
      }
      const confirmed = await new Promise((resolve) => {
        uni.showModal({
          title: '确认转出',
          content: `向会员 ${toId} 转出 ${amount} 积分？转出后即时到账`,
          success: (r) => resolve(!!r.confirm),
          fail: () => resolve(false)
        })
      })
      if (!confirmed) return
      this.submitting = true
      try {
        const resp = await post('/api/wxapp/wallet/points-transfer', {
          to_member_id: toId,
          amount: amount
        })
        uni.showToast({ title: '转出成功', icon: 'success' })
        if (resp.summary) this.summary = resp.summary
        this.amount = ''
        this.page = 1
        this.loadRecords()
      } catch (e) {
        uni.showToast({ title: e.message || '转出失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    switchDirection(d) {
      if (this.direction === d) return
      this.direction = d
      this.page = 1
      this.loadRecords()
    },
    stateText(s) {
      const map = { settled: '转账成功', frozen: '冻结中', refunded: '已扣回', cancelled: '已取消' }
      return map[s] || s
    },
    avatarColor(item) {
      const id = Number(item.counterpartId || 0)
      return AVATAR_PALETTE[id % AVATAR_PALETTE.length]
    },
    fmtNum(v) {
      return String(Math.round(Number(v || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    // 今天/昨天显示相对日期，其余显示 MM-DD HH:mm
    fmtTime(s) {
      if (!s) return ''
      const d = new Date(String(s).replace(/-/g, '/'))
      if (isNaN(d.getTime())) return s
      const pad = (n) => (n < 10 ? '0' + n : '' + n)
      const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
      const now = new Date()
      if (d.toDateString() === now.toDateString()) return '今天 ' + hm
      const yest = new Date(now.getTime() - 86400000)
      if (d.toDateString() === yest.toDateString()) return '昨天 ' + hm
      return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm
    },
    scrollToRecords() {
      uni.pageScrollTo({ selector: '.records-card', duration: 300, fail: () => {} })
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
.transfer-page {
  background: #f4f5f9;
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
.nav-history {
  margin-left: auto;
  font-size: 42rpx;
  line-height: 1;
  color: #333;
}

/* 积分账户卡 */
.account-card {
  position: relative;
  margin: 20rpx 24rpx;
  padding: 34rpx 32rpx 40rpx;
  border-radius: 28rpx;
  background: linear-gradient(120deg, #5b52e2 0%, #7a4be0 55%, #9a4fd8 100%);
  overflow: hidden;
  box-shadow: 0 12rpx 30rpx rgba(106, 90, 224, 0.25);
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
.account-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.account-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.account-title-icon {
  color: rgba(255, 255, 255, 0.85);
  font-size: 30rpx;
}
.account-title-text {
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}
.settle-chip {
  flex: none;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
  font-size: 20rpx;
  white-space: nowrap;
}
.account-body {
  position: relative;
  margin-top: 32rpx;
  display: flex;
  align-items: stretch;
}
.account-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.account-label {
  color: rgba(255, 255, 255, 0.75);
  font-size: 23rpx;
}
.account-value {
  color: #fff;
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}
.account-divider {
  width: 1rpx;
  margin: 6rpx 26rpx;
  background: rgba(255, 255, 255, 0.25);
}

/* 转出表单 */
.form-card {
  margin: 20rpx 24rpx;
  padding: 30rpx 28rpx;
  display: flex;
  flex-direction: column;
}
.form-label {
  font-size: 27rpx;
  font-weight: 700;
  color: #262927;
  margin-bottom: 16rpx;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 18rpx;
  background: #f1f2f6;
}
.input-icon {
  font-size: 30rpx;
  color: #b6bac4;
  flex: none;
}
.input-main {
  flex: 1;
  min-width: 0;
  height: 92rpx;
  font-size: 28rpx;
  color: #262927;
}
.input-ph {
  color: #b6bac4;
}
.target-box {
  margin-top: 16rpx;
}
.target-tip {
  font-size: 21rpx;
  color: #a5aba7;
}
.target-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}
.target-chip {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #f1f2f6;
  color: #5f6672;
  font-size: 22rpx;
  border: 1rpx solid transparent;
}
.target-chip.active {
  background: rgba(106, 90, 224, 0.1);
  border-color: rgba(106, 90, 224, 0.35);
  color: #6a5ae0;
  font-weight: 700;
}
.amount-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32rpx 0 16rpx;
}
.amount-head .form-label {
  margin-bottom: 0;
}
.all-link {
  color: #6a5ae0;
  font-size: 24rpx;
  font-weight: 700;
}
.pts-prefix {
  color: #b6bac4;
  font-size: 30rpx;
  font-weight: 800;
  flex: none;
}
.pts-suffix {
  color: #8a8f9b;
  font-size: 26rpx;
  flex: none;
}
.form-hint {
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #a5aba7;
}
.submit-btn {
  margin-top: 30rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #6a5ae0, #8a4fd8);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(106, 90, 224, 0.28);
}
.submit-btn.disabled {
  opacity: 0.6;
}

/* 互转记录 */
.records-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx 24rpx 12rpx;
}
.records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.records-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.records-bar {
  width: 8rpx;
  height: 30rpx;
  border-radius: 4rpx;
  background: #6a5ae0;
}
.records-title-text {
  font-size: 29rpx;
  font-weight: 800;
  color: #262927;
}
.records-count {
  font-size: 22rpx;
  color: #a5aba7;
}
.filter-row {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
}
.filter-chip {
  padding: 8rpx 26rpx;
  border-radius: 999rpx;
  background: #f1f2f6;
  color: #5f6672;
  font-size: 22rpx;
}
.filter-chip.active {
  background: #6a5ae0;
  color: #fff;
  font-weight: 700;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 4rpx;
  border-bottom: 1rpx solid #f2f3f7;
}
.record-item.no-line {
  border-bottom: 0;
}
.record-avatar {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  flex: none;
}
.record-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #22c55e;
  border: 3rpx solid #fff;
}
.record-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.record-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #262927;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-sub {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.record-time {
  font-size: 21rpx;
  color: #9ba19d;
}
.record-state {
  font-size: 21rpx;
  font-weight: 600;
}
.record-state.ok {
  color: #22c55e;
}
.record-state.mut {
  color: #9ba19d;
}
.record-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}
.record-amount {
  font-size: 32rpx;
  font-weight: 800;
  color: #262927;
}
.record-amount.in {
  color: #1fa15a;
}
.record-unit {
  font-size: 20rpx;
  color: #b0b5b1;
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
  background: #efeafd;
  color: #8a7ae0;
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
