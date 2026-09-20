<template>
  <view class="page records-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">秒杀记录</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 状态 Tab -->
    <view class="record-tabs">
      <view
        v-for="(tab, idx) in tabs"
        :key="idx"
        class="record-tab"
        :class="{ active: currentTab === idx }"
        @tap="setTab(idx)"
      >{{ tab }}</view>
    </view>

    <!-- 搜索 + 时间筛选 -->
    <view class="record-tools">
      <view class="search-box">
        <view class="search-icon"></view>
        <input
          class="search-input"
          placeholder="搜索商品或秒杀编号"
          confirm-type="search"
          :value="searchValue"
          @input="searchValue = $event.detail.value"
          @confirm="onSearch"
        />
      </view>
      <view class="time-filter" @tap="showTimeFilter">全部时间　▣</view>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!loggedIn" class="record-empty">
      <text>登录后查看秒杀记录</text>
      <view class="record-login-btn" @tap="goLogin">去登录</view>
    </view>

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view v-if="loading" class="record-empty">正在加载…</view>
      <view v-else-if="filteredRecords.length === 0" class="record-empty">暂无秒杀记录～</view>
      <view
        v-for="item in filteredRecords"
        :key="item.orderNo"
        class="record card"
      >
        <view class="record-photo">
          <image :src="item.image" mode="aspectFill" />
          <text class="record-badge">{{ item.badge }}</text>
        </view>
        <view class="record-main">
          <text class="record-title ellipsis">{{ item.title }}</text>
          <text class="record-code">秒杀编号：{{ item.code }}</text>
          <text class="record-date">参与时间：{{ item.date }}</text>
          <view class="record-price">
            实付：<text>¥{{ item.price }}</text>
          </view>
        </view>
        <view class="record-side">
          <text class="status" :class="item.tone">{{ item.status }}</text>
          <text class="record-note">{{ item.note }}</text>
          <view
            class="record-btn"
            :class="item.tone"
            @tap.stop="action(item)"
          >{{ item.action }}</view>
        </view>
      </view>

      <view v-if="!loading && filteredRecords.length > 0" class="no-more">没有更多了</view>
    </view>
  </view>
</template>

<script>
import { get, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

export default {
  data() {
    return {
      searchValue: '',
      currentTab: 0,
      tabs: ['全部', '待支付', '已成功', '已失效'],
      tabKeys: ['all', 'pending_pay', 'success', 'expired'],
      records: [],
      loading: false,
      loggedIn: false
    }
  },
  computed: {
    // 本地关键词过滤（商品名 / 秒杀编号）
    filteredRecords() {
      const kw = this.searchValue.trim()
      if (!kw) return this.records
      return this.records.filter(r => (r.title || '').includes(kw) || (r.code || '').includes(kw))
    }
  },
  onShow() {
    this.loggedIn = isLoggedIn()
    if (this.loggedIn) this.loadRecords()
    else this.records = []
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/profile/index' })
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/profile/index' })
    },
    setTab(idx) {
      if (this.currentTab === idx) return
      this.currentTab = idx
      this.loadRecords()
    },
    async loadRecords() {
      this.loading = true
      try {
        const res = await get('/api/wxapp/seckill/records', {
          tab: this.tabKeys[this.currentTab],
          page: 1,
          size: 50
        })
        this.records = (res.items || []).map(r => ({
          ...r,
          image: resolveAssetUrl(r.image),
          code: r.orderNo
        }))
      } catch (e) {
        this.records = []
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onSearch() {
      // filteredRecords 已随输入实时过滤，回车仅给出反馈
      const value = this.searchValue.trim()
      if (!value) return
      uni.showToast({ title: `找到 ${this.filteredRecords.length} 条记录`, icon: 'none' })
    },
    showTimeFilter() {
      uni.showActionSheet({
        itemList: ['全部时间', '近7天', '近30天', '近3个月']
      })
    },
    action(item) {
      if (item.action === '去支付') {
        uni.navigateTo({ url: '/pages/order-pay/index?orderNo=' + item.orderNo })
      } else if (item.action === '查看订单') {
        uni.navigateTo({ url: '/pages/order-detail/index?orderNo=' + item.orderNo })
      } else {
        // 再次秒杀 → 回秒杀列表
        uni.redirectTo({ url: '/pages/flash/index' })
      }
    }
  }
}
</script>

<style scoped>
.records-page {
  background: #fafafa;
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

/* 状态 Tab */
.record-tabs {
  height: 92rpx;
  padding: 0 38rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #eee;
}
.record-tab {
  height: 92rpx;
  line-height: 92rpx;
  padding: 0 16rpx;
  position: relative;
  font-size: 29rpx;
  color: #555;
}
.record-tab.active {
  color: #f32622;
  font-weight: 700;
}
.record-tab.active::after {
  content: '';
  position: absolute;
  left: 25%;
  bottom: 0;
  width: 50%;
  height: 6rpx;
  border-radius: 6rpx;
  background: #f32622;
}

/* 搜索 + 时间筛选 */
.record-tools {
  padding: 18rpx 24rpx;
  display: flex;
  gap: 16rpx;
  background: #fff;
}
.record-tools .search-box {
  flex: 1;
  background: #f6f7f6;
}
.time-filter {
  width: 200rpx;
  height: 74rpx;
  line-height: 74rpx;
  text-align: center;
  border-radius: 38rpx;
  background: #f6f7f6;
  color: #5d625e;
  font-size: 22rpx;
  white-space: nowrap;
}

/* 记录列表 */
.record-list {
  padding: 4rpx 20rpx 30rpx;
}
.record {
  min-height: 250rpx;
  margin-top: 18rpx;
  padding: 18rpx;
  display: flex;
  gap: 18rpx;
}
.record-photo {
  width: 184rpx;
  height: 214rpx;
  flex: none;
  position: relative;
  border-radius: 13rpx;
  overflow: hidden;
  background: #f3f3f3;
}
.record-photo image {
  width: 100%;
  height: 100%;
}
.record-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 7rpx 14rpx;
  border-radius: 0 0 12rpx 0;
  background: linear-gradient(90deg, #ff5432, #f22a25);
  color: #fff;
  font-size: 19rpx;
  font-weight: 600;
}
.record-main {
  flex: 1;
  min-width: 0;
  padding-top: 6rpx;
  display: flex;
  flex-direction: column;
  gap: 15rpx;
  color: #858985;
  font-size: 20rpx;
}
.record-title {
  color: #262927;
  font-size: 27rpx;
  font-weight: 700;
}
.record-price {
  margin-top: auto;
  color: #555;
  font-size: 22rpx;
}
.record-price text {
  color: #f32622;
  font-size: 30rpx;
  font-weight: 700;
}
.record-side {
  width: 160rpx;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14rpx;
  padding-top: 6rpx;
  text-align: right;
}
.status {
  font-size: 27rpx;
  font-weight: 700;
}
.status.pay {
  color: #ff5b22;
}
.status.success {
  color: #2d9b3b;
}
.status.failed {
  color: #777;
}
.record-note {
  color: #777;
  font-size: 19rpx;
  line-height: 1.5;
}
.record-btn {
  width: 150rpx;
  height: 58rpx;
  line-height: 56rpx;
  margin-top: auto;
  text-align: center;
  border: 2rpx solid #f43028;
  border-radius: 32rpx;
  color: #f43028;
  font-size: 22rpx;
}
.record-btn.pay {
  border: 0;
  line-height: 58rpx;
  background: linear-gradient(90deg, #ff5831, #f41d22);
  color: #fff;
  font-weight: 700;
}
.no-more {
  text-align: center;
  padding: 30rpx;
  color: #aaa;
  font-size: 22rpx;
}

/* 空态 / 未登录 */
.record-empty {
  padding: 90rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26rpx;
  color: #999;
  font-size: 26rpx;
}
.record-login-btn {
  padding: 16rpx 70rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff5a31, #f51c21);
  color: #fff;
  font-size: 27rpx;
  font-weight: 700;
}
</style>
