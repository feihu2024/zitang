<template>
  <view class="page group-page">
    <view class="safe-top white"></view>
    <view class="group-shell">

      <!-- 顶部导航 -->
      <view class="nav-bar">
        <text class="nav-back" @tap="goBack">‹</text>
        <text class="nav-title">拼团活动</text>
        <view class="capsule">••· ◎</view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-wrap">
        <view class="search-box">
          <view class="search-icon"></view>
          <input
            class="search-input"
            placeholder="搜索商品或拼团活动"
            confirm-type="search"
            :value="searchValue"
            @confirm="onSearch"
          />
        </view>
      </view>

      <!-- 状态 Tab -->
      <view class="tabs">
        <view
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="tab"
          :class="{ active: activeTab === idx }"
          @tap="setTab(idx)"
        >{{ tab }}</view>
      </view>

      <!-- 排序筛选 -->
      <view class="sort-row">
        <scroll-view scroll-x show-scrollbar="false" class="sort-scroll">
          <view class="sort-list">
            <text
              v-for="(s, idx) in sorts"
              :key="idx"
              class="pill sort-pill"
              :class="{ active: sort === idx }"
              @tap="setSort(idx)"
            >{{ s }}{{ idx === 2 ? ' ↕' : '' }}</text>
          </view>
        </scroll-view>
        <view class="filter" @tap="showFilter">
          <text class="filter-icon">▽</text>筛选
        </view>
      </view>

      <!-- 顶部 Banner -->
      <image class="group-banner" src="/static/group-banner.jpg" mode="aspectFill" @tap="openFirst" />

      <!-- 拼团列表 -->
      <view v-if="loading && groups.length === 0" class="page-tip">加载中...</view>
      <view v-else-if="groups.length === 0" class="empty-box">
        <text class="empty-icon">🎁</text>
        <text class="empty-text">暂无拼团活动</text>
      </view>
      <view class="group-list" v-else>
        <view
          v-for="item in filteredGroups"
          :key="item.id"
          class="group-card card"
          @tap="openDetail(item)"
        >
          <view class="group-photo">
            <image :src="item.image" mode="aspectFill" />
            <text class="group-badge" :class="item.badgeClass">{{ item.badge }}</text>
          </view>
          <view class="group-info">
            <text class="group-title ellipsis">{{ item.title }}</text>
            <text class="group-desc ellipsis">{{ item.desc }}</text>
            <view class="price-row">
              <view class="group-price">
                <text>¥</text>
                <text>{{ item.price }}</text>
                <text>拼团价</text>
              </view>
              <text class="old-price">¥{{ item.old }}</text>
            </view>
          </view>
          <!-- 进行中 / 即将开始 -->
          <view v-if="!item.ended" class="group-action">
            <view class="countdown">
              <text>{{ item.pending ? '距开始' : '距结束' }}</text>
              <text class="time">{{ item.time[0] }}</text>
              <text>:</text>
              <text class="time">{{ item.time[1] }}</text>
              <text>:</text>
              <text class="time">{{ item.time[2] }}</text>
            </view>
            <view class="progress">
              <view :style="{ width: item.progress + '%' }"></view>
            </view>
            <view class="need">
              <text>还差 <text class="need-num">{{ item.need }}</text> 人成团</text>
              <text>剩余 <text class="need-num">{{ item.stock }}</text> 份</text>
            </view>
            <view class="primary-btn action-btn">{{ item.button }}</view>
          </view>
          <!-- 已结束 -->
          <view v-else class="group-action ended">
            <text class="ended-label">已结束</text>
            <text>活动已结束</text>
            <view class="ended-btn">查看详情</view>
          </view>
        </view>
      </view>

    </view>

    <!-- 底部 TabBar -->
    <TabBar current="activity" />
  </view>
</template>

<script>
import { get, resolveAssetUrl } from '@/utils/api.js'
import TabBar from '@/components/TabBar/TabBar.vue'

export default {
  components: { TabBar },
  data() {
    return {
      searchValue: '',
      activeTab: 0,
      sort: 0,
      loading: false,
      tabs: ['全部', '进行中', '即将开始', '已结束'],
      sorts: ['综合', '销量', '价格', '2人团', '3人团'],
      groups: [],
      timer: null
    }
  },
  computed: {
    filteredGroups() {
      const statusMap = ['', 'running', 'pending', 'ended']
      let list = this.groups
      if (this.activeTab > 0) {
        const target = statusMap[this.activeTab]
        list = this.groups.filter(g => g.status === target)
      }
      if (this.sort === 1) list = list.slice().sort((a, b) => b.joined - a.joined)
      else if (this.sort === 2) list = list.slice().sort((a, b) => Number(a.price) - Number(b.price))
      else if (this.sort === 3) list = list.filter(g => g.people === 2)
      else if (this.sort === 4) list = list.filter(g => g.people === 3)
      return list
    }
  },
  onLoad() {
    this.loadGroups()
  },
  onShow() {
    // 主菜单间切换回来时重新拉取数据（首次进入由 onLoad 负责，避免重复请求）
    if (this._loadedOnce) this.loadGroups()
    this._loadedOnce = true
  },
  onPullDownRefresh() {
    this.loadGroups()
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/home/index' })
      }
    },
    setTab(idx) {
      this.activeTab = idx
    },
    setSort(idx) {
      this.sort = idx
    },
    // 后端列表数据 → 页面卡片字段
    mapGroup(item) {
      const running = item.status === 'running'
      const pending = item.status === 'pending'
      const ended = item.status === 'ended'
      return {
        id: item.id,
        image: resolveAssetUrl(item.productCover) || '/static/group-banner.jpg',
        badge: item.people + '人团',
        badgeClass: running ? 'red-badge' : (ended ? 'gray-badge' : 'orange-badge'),
        title: item.productName,
        desc: item.description || '超值拼团 · 限时开抢',
        old: item.originalPrice,
        price: item.groupPrice,
        joined: item.joined,
        people: item.people,
        need: Math.max(1, item.people - (item.joined % item.people)),
        stock: item.stockLeft,
        progress: item.rate,
        status: item.status,
        pending: pending,
        endTime: item.endTime,
        startTime: item.startTime,
        // 即将开始的活动倒计时到开始时间，进行中/已结束倒计时到结束时间
        time: this.calcCountdown(pending ? item.startTime : item.endTime),
        button: running ? (item.people > 2 ? '立即参团' : '去开团') : (ended ? '查看详情' : '即将开始'),
        ended: ended
      }
    },
    // 倒计时：'YYYY-MM-DD HH:mm:ss' → ['HH','MM','SS']
    calcCountdown(endTime) {
      if (!endTime) return ['00', '00', '00']
      const end = new Date(endTime.replace(/-/g, '/')).getTime()
      let diff = Math.max(0, Math.floor((end - Date.now()) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      const pad = n => String(n).padStart(2, '0')
      return [pad(h), pad(m), pad(s)]
    },
    startCountdown() {
      if (this.timer) clearInterval(this.timer)
      this.timer = setInterval(() => {
        this.groups.forEach(g => {
          if (!g.ended) g.time = this.calcCountdown(g.pending ? g.startTime : g.endTime)
        })
      }, 1000)
    },
    async loadGroups() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/group-buy', {
          keyword: this.searchValue || undefined
        })
        this.groups = (resp.items || []).map(item => this.mapGroup(item))
        this.startCountdown()
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
        uni.stopPullDownRefresh()
      }
    },
    onSearch() {
      const value = this.searchValue ? this.searchValue.trim() : ''
      if (!value) {
        uni.showToast({ title: '请输入关键词', icon: 'none' })
        return
      }
      this.loadGroups()
    },
    openDetail(item) {
      if (!item) return
      uni.navigateTo({ url: '/pages/group-detail/index?id=' + item.id })
    },
    // 顶部 Banner：跳转第一个进行中的活动
    openFirst() {
      const first = this.groups.find(g => g.status === 'running') || this.groups[0]
      if (first) this.openDetail(first)
      else uni.showToast({ title: '暂无拼团活动', icon: 'none' })
    },
    showFilter() {
      uni.showActionSheet({
        itemList: ['仅看可参团', '价格从低到高', '剩余名额优先']
      })
    }
  }
}
</script>

<style scoped>
.group-page {
  background: #fafafa;
  overflow-x: hidden;
}
.white {
  background: #fff;
}
.group-shell {
  padding-bottom: 30rpx;
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

/* 搜索栏 */
.search-wrap {
  padding: 16rpx 32rpx 20rpx;
  background: linear-gradient(90deg, #fff5ee, #fff);
}
.search-wrap .search-box {
  background: #fff;
  height: 74rpx;
  border: 1rpx solid #eee;
}

/* 状态 Tab */
.tabs {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 26rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.tab {
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 20rpx;
  margin-right: 20rpx;
  font-size: 29rpx;
  position: relative;
  white-space: nowrap;
  color: #555;
}
.tab.active {
  color: var(--red);
  font-weight: 700;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  width: 50%;
  height: 6rpx;
  border-radius: 6rpx;
  background: var(--red);
}

/* 排序筛选 */
.sort-row {
  height: 92rpx;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  background: #fff;
}
.sort-scroll {
  flex: 1;
  min-width: 0;
}
.sort-list {
  display: inline-flex;
  gap: 12rpx;
  padding-right: 18rpx;
}
.sort-pill {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  color: #454846;
  font-size: 24rpx;
}
.sort-pill.active {
  color: var(--red);
  background: #fff0f0;
}
.filter {
  width: 112rpx;
  text-align: right;
  font-size: 26rpx;
  color: #555;
}
.filter-icon {
  margin-right: 8rpx;
  font-size: 31rpx;
}

/* 顶部 Banner */
.group-banner {
  display: block;
  width: calc(100% - 52rpx);
  height: 157rpx;
  margin: 18rpx 26rpx;
  border-radius: 20rpx;
}

/* 拼团列表 */
.page-tip {
  padding: 120rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.empty-box {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  color: #999;
}
.empty-icon {
  font-size: 72rpx;
}
.empty-text {
  font-size: 27rpx;
}
.group-list {
  padding: 0 24rpx 34rpx;
}
.group-card {
  min-height: 210rpx;
  margin-bottom: 20rpx;
  padding: 18rpx;
  display: flex;
  gap: 18rpx;
  overflow: hidden;
}
.group-photo {
  width: 184rpx;
  height: 184rpx;
  flex: none;
  position: relative;
  border-radius: 14rpx;
  overflow: hidden;
  background: #f4f4f4;
}
.group-photo image {
  width: 100%;
  height: 100%;
}
.group-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 6rpx 13rpx;
  color: #fff;
  border-radius: 0 0 12rpx 0;
  font-size: 21rpx;
}
.red-badge {
  background: var(--red);
}
.orange-badge {
  background: #ff7b16;
}
.gray-badge {
  background: #8f9290;
}
.group-info {
  flex: 1;
  min-width: 0;
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
}
.group-title {
  display: block;
  font-size: 29rpx;
  font-weight: 700;
}
.group-desc {
  display: block;
  margin-top: 10rpx;
  color: #7b807c;
  font-size: 23rpx;
}
.price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10rpx 14rpx;
  margin-top: auto;
}
.group-price {
  display: flex;
  align-items: baseline;
  flex-shrink: 0;
  color: var(--red);
}
.group-price text:nth-child(1) {
  font-size: 21rpx;
}
.group-price text:nth-child(2) {
  font-size: 38rpx;
  font-weight: 800;
}
.group-price text:nth-child(3) {
  margin-left: 8rpx;
  padding: 3rpx 8rpx;
  background: var(--red);
  color: #fff;
  border-radius: 6rpx;
  font-size: 18rpx;
}
.old-price {
  flex-shrink: 0;
  white-space: nowrap;
  color: #aaa;
  text-decoration: line-through;
  font-size: 22rpx;
}

/* 卡片右侧操作区 */
.group-action {
  width: 198rpx;
  flex: none;
  padding: 7rpx 2rpx 3rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.countdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 17rpx;
}
.time {
  padding: 5rpx 6rpx;
  border-radius: 5rpx;
  background: var(--red);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.progress {
  height: 8rpx;
  margin: 17rpx 0 9rpx;
  background: #ffe1e2;
  border-radius: 8rpx;
  overflow: hidden;
}
.progress view {
  height: 100%;
  background: linear-gradient(90deg, #ff6b68, var(--red));
  border-radius: 8rpx;
}
.need {
  display: flex;
  justify-content: space-between;
  color: #555;
  font-size: 17rpx;
}
.need-num {
  color: var(--red);
  font-weight: 500;
}
.action-btn {
  height: 52rpx;
  line-height: 52rpx;
  margin-top: 14rpx;
  font-size: 25rpx;
}

/* 已结束 */
.group-action.ended {
  align-items: center;
  gap: 13rpx;
  color: #777;
  font-size: 22rpx;
}
.ended-label {
  width: 160rpx;
  padding: 8rpx 0;
  text-align: center;
  background: #eee;
  border-radius: 28rpx;
  color: #555;
  font-size: 27rpx;
}
.ended-btn {
  width: 160rpx;
  padding: 11rpx 0;
  text-align: center;
  background: #f3f3f3;
  border-radius: 28rpx;
  font-size: 24rpx;
}
</style>
