<template>
  <view class="page records-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">拼团记录</text>
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
          placeholder="搜索商品或拼团编号"
          confirm-type="search"
          :value="searchValue"
          @input="onInput"
        />
      </view>
      <view class="time-filter" @tap="showTimeFilter">▣　{{ timeLabel }}⌄</view>
    </view>

    <!-- 加载/登录提示 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!logged" class="page-tip">请先登录后查看拼团记录</view>

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view
        v-for="item in filteredRecords"
        :key="item.groupNo"
        class="record card"
      >
        <view class="record-photo">
          <image :src="item.image" mode="aspectFill" />
          <text class="record-badge" :class="item.badgeClass">{{ item.badge }}</text>
        </view>
        <view class="record-main">
          <text class="record-title ellipsis">{{ item.title }}</text>
          <text class="record-code">拼团编号：{{ item.groupNo }}</text>
          <text class="record-date">参与时间：{{ item.date }}</text>
          <view class="record-price">
            实付：<text>¥{{ item.price }}</text>
          </view>
        </view>
        <view class="record-side">
          <text class="status" :class="item.statusClass">{{ item.status }}</text>
          <text class="record-note">{{ item.note }}</text>
          <text class="record-people">● ●　<text class="people-num">{{ item.people }}</text></text>
          <view
            class="record-btn"
            :class="item.statusClass"
            @tap.stop="action(item)"
          >{{ item.action }}</view>
        </view>
      </view>

      <view v-if="records.length === 0" class="empty-box">
        <text class="empty-text">暂无拼团记录</text>
        <text class="empty-sub">去拼团页面看看有没有心仪的商品吧</text>
        <view class="empty-btn" @tap="goGroup">去逛逛</view>
      </view>
      <view v-else-if="filteredRecords.length === 0" class="no-more">没有更多了</view>
      <view v-else class="no-more">没有更多了</view>
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
      timeRange: 0, // 0 全部 / 7 近7天 / 30 近30天 / 90 近3个月
      tabs: ['全部', '拼团中', '已成团', '已失败'],
      records: [],
      loading: false,
      logged: true
    }
  },
  computed: {
    timeLabel() {
      return ['全部时间', '近7天', '近30天', '近3个月'][this.timeRange] || '全部时间'
    },
    filteredRecords() {
      const statusMap = ['', 'grouping', 'success', 'failed']
      const target = statusMap[this.currentTab]
      const kw = this.searchValue.trim()
      const now = Date.now()
      const limit = this.timeRange > 0 ? now - this.timeRange * 24 * 3600 * 1000 : 0
      return this.records.filter(r => {
        if (target && r.statusClass !== target) return false
        if (kw && r.title.indexOf(kw) < 0 && r.groupNo.indexOf(kw.toUpperCase()) < 0) return false
        if (limit && new Date(r.date.replace(/-/g, '/')).getTime() < limit) return false
        return true
      })
    }
  },
  onShow() {
    if (!isLoggedIn()) {
      this.logged = false
      return
    }
    this.logged = true
    this.loadRecords()
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/group-buy/records')
        const items = resp.items || []
        // 后端字段 → 页面卡片字段（状态实时计算：grouping/success/failed）
        this.records = items.map(o => {
          const item = (o.items && o.items[0]) || {}
          const status = o.groupStatus
          const joined = o.groupJoined || 0
          const people = o.groupPeople || 2
          const need = Math.max(people - joined, 0)
          const img = item.skuImage || ''
          const map = {
            image: img ? resolveAssetUrl(img) : '/static/product-bath.jpg',
            badge: people + '人团',
            badgeClass: people >= 3 ? 'orange-bg' : 'red-bg',
            title: item.productName || '拼团商品',
            groupNo: o.groupNo || '',
            date: o.createdAt || '',
            price: this.fmtPrice(o.totalAmount),
            status: status === 'grouping' ? '拼团中' : status === 'success' ? '已成团' : '已失败',
            statusClass: status,
            note: status === 'grouping' ? `还差 ${need} 人成团` : status === 'success' ? '拼团成功' : '未成团，货款已退至余额',
            people: `${joined}/${people} 人`,
            action: status === 'grouping' ? '邀请好友' : status === 'success' ? '查看订单' : '再次开团',
            activityId: o.groupActivityId || '',
            orderNo: o.orderNo || ''
          }
          return map
        })
      } catch (e) {
        console.error('加载拼团记录失败:', e)
        this.records = []
      } finally {
        this.loading = false
      }
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/profile/index' })
      }
    },
    setTab(idx) {
      this.currentTab = idx
    },
    onInput(e) {
      this.searchValue = e.detail.value || ''
    },
    showTimeFilter() {
      uni.showActionSheet({
        itemList: ['全部时间', '近7天', '近30天', '近3个月'],
        success: (res) => {
          this.timeRange = [0, 7, 30, 90][res.tapIndex] || 0
        }
      })
    },
    // 记录操作：拼团中→邀请好友（带团号分享参团）；已成团→查看订单；已失败→再次开团
    action(item) {
      if (item.statusClass === 'grouping') {
        uni.navigateTo({
          url: '/pages/group-detail/index?id=' + item.activityId + '&groupNo=' + item.groupNo
        })
      } else if (item.statusClass === 'success') {
        uni.navigateTo({ url: '/pages/order-detail/index?orderNo=' + item.orderNo })
      } else {
        uni.navigateTo({ url: '/pages/group-detail/index?id=' + item.activityId })
      }
    },
    goGroup() {
      uni.redirectTo({ url: '/pages/group/index' })
    }
  }
}
</script>

<style scoped>
.records-page {
  background: #fafafa;
  padding-bottom: 30rpx;
  overflow-x: hidden;
}
.white {
  background: #fff;
}
.page-tip {
  padding: 120rpx 0;
  text-align: center;
  color: #999;
  font-size: 26rpx;
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
  height: 88rpx;
  padding: 0 35rpx;
  background: #fff;
  display: flex;
  justify-content: space-between;
}
.record-tab {
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 14rpx;
  position: relative;
  font-size: 29rpx;
  color: #555;
}
.record-tab.active {
  color: var(--red);
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
  background: var(--red);
}

/* 搜索 + 时间筛选 */
.record-tools {
  padding: 18rpx 28rpx;
  display: flex;
  gap: 18rpx;
  background: #fff;
}
.record-tools .search-box {
  flex: 1;
  background: #f6f7f6;
}
.time-filter {
  width: 190rpx;
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
  padding: 2rpx 24rpx 30rpx;
}
.record {
  min-height: 250rpx;
  margin-top: 16rpx;
  padding: 15rpx;
  display: flex;
  gap: 16rpx;
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
  padding: 6rpx 12rpx;
  color: #fff;
  border-radius: 0 0 10rpx 0;
  font-size: 20rpx;
}
.red-bg {
  background: var(--red);
}
.orange-bg {
  background: #ff7a15;
}
.record-main {
  flex: 1;
  min-width: 0;
  padding-top: 6rpx;
  display: flex;
  flex-direction: column;
  gap: 15rpx;
  color: #858985;
  font-size: 19rpx;
}
.record-title {
  color: #262927;
  font-size: 27rpx;
  font-weight: 700;
}
.record-price {
  margin-top: auto;
  color: #555;
  font-size: 21rpx;
}
.record-price text {
  color: var(--red);
  font-size: 29rpx;
  font-weight: 700;
}
.record-side {
  width: 166rpx;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 13rpx;
  color: #747875;
  font-size: 18rpx;
}
.status {
  padding: 6rpx 16rpx;
  border-radius: 22rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.status.grouping {
  color: #ff661d;
  background: #fff1e8;
}
.status.success {
  color: #2e9a32;
  background: #eff9eb;
}
.status.failed {
  color: #666;
  background: #f0f1f0;
}
.record-note {
  text-align: right;
  white-space: nowrap;
}
.record-people {
  color: #4d5250;
}
.record-people .people-num {
  color: var(--red);
}
.record-btn {
  width: 166rpx;
  height: 50rpx;
  line-height: 50rpx;
  margin-top: auto;
  text-align: center;
  border-radius: 27rpx;
  font-size: 23rpx;
}
.record-btn.grouping {
  background: linear-gradient(90deg, #ff6b25, var(--red));
  color: #fff;
}
.record-btn.success,
.record-btn.failed {
  color: var(--red);
  background: #fff1ef;
}
.no-more {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 22rpx;
}

/* 空状态 */
.empty-box {
  padding: 130rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.empty-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #555;
}
.empty-sub {
  font-size: 22rpx;
  color: #999;
}
.empty-btn {
  margin-top: 18rpx;
  padding: 0 64rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  background: linear-gradient(90deg, #ff6b25, var(--red));
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
</style>
