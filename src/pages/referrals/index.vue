<template>
  <view class="page referrals-page">
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">‹</view>
      <text class="nav-title">我的推荐</text>
    </view>
    <view class="safe-top"></view>

    <view class="shell">
      <!-- 邀请卡片 -->
      <view class="invite-card card">
        <view class="invite-head">
          <text class="invite-title">邀请好友 · 建立推荐关系</text>
          <text class="invite-sub">好友通过你的邀请注册后，自动成为你的推荐会员</text>
        </view>
        <view class="invite-code-row">
          <text class="invite-code-label">我的邀请码</text>
          <text class="invite-code">{{ inviteCode || '--' }}</text>
          <view class="copy-btn" @tap="copyCode">复制</view>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="primary-btn share-btn" open-type="share">⌯ 分享小程序给好友</button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <button class="primary-btn share-btn" @tap="copyLink">⌯ 复制邀请链接</button>
        <!-- #endif -->
      </view>

      <!-- 统计 -->
      <view class="stat-row">
        <text class="stat-title">我推荐的会员</text>
        <text class="stat-count">共 {{ total }} 人</text>
      </view>

      <!-- 简短统计 + 面包屑 -->
      <view class="stat-cards">
        <view class="stat-card">
          <text class="stat-num">{{ stats.referralCount }}</text>
          <text class="stat-label">推荐人数</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.consumerCount }}</text>
          <text class="stat-label">消费人数</text>
        </view>
      </view>

      <view v-if="path.length" class="crumb-bar">
        <text class="crumb-back" @tap="goBack">‹ 返回</text>
        <text class="crumb-path">我的推荐 › {{ path[path.length - 1].nickname }}的推荐（仅一级）</text>
      </view>

      <!-- 级别筛选 -->
      <scroll-view scroll-x class="filter-row" :show-scrollbar="false">
        <view
          v-for="f in filterTabs"
          :key="f.level"
          class="filter-chip"
          :class="{ active: filterLevel === f.level, ['chip-' + f.level]: true }"
          @tap="setFilter(f.level)"
        >{{ f.name }}</view>
      </scroll-view>

      <!-- 下线列表 -->
      <view v-if="items.length" class="list card">
        <view v-for="m in items" :key="m.id" class="ref-item" :class="{ clickable: canDrill }" :data-id="m.id" :data-nickname="m.nickname" @tap="onItemTap">
          <image
            v-if="m.avatarUrl"
            class="ref-avatar-img"
            :src="avatarSrc(m)"
            mode="aspectFill"
          />
          <view v-else class="ref-avatar" :style="{ background: m.avatarColor || '#78bf7c' }">
            {{ (m.nickname || '会').charAt(0) }}
          </view>
          <view class="ref-body">
            <view class="ref-name">{{ m.nickname || '微信用户' }} <text class="ref-uid">ID:{{ m.id }}</text></view>
            <view class="ref-sub">注册于 {{ m.createdAt }} {{ m.phone ? '　☎ ' + maskPhone(m.phone) : '' }}</view>
          </view>
          <view class="ref-right">
            <text class="ref-level" :class="'ref-level-' + m.level">{{ m.levelName || ('VIP' + m.level) }}</text>
            <text v-if="canDrill" class="ref-drill">{{ m.referralCount > 0 ? m.referralCount + '人 ›' : '推荐 ›' }}</text>
          </view>
        </view>
        <view v-if="finished && items.length" class="list-end">— 没有更多了 —</view>
      </view>

      <view v-else-if="loaded" class="empty card">
        <view class="empty-icon">♧</view>
        <view class="empty-text">还没有推荐会员</view>
        <view class="empty-sub">把邀请码分享给好友，TA 注册后就会出现在这里</view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchReferrals } from '@/utils/auth.js'
import { getMyInviteCode } from '@/utils/auth.js'
import { resolveAssetUrl } from '@/utils/api.js'

export default {
  data() {
    return {
      inviteCode: '',
      total: 0,
      items: [],
      page: 1,
      size: 20,
      filterLevel: 0,
      levels: [],
      path: [],
      stats: { referralCount: 0, consumerCount: 0 },
      loaded: false,
      finished: false,
      loadingMore: false
    }
  },
  computed: {
    filterTabs() {
      return [{ level: 0, name: '全部' }].concat(this.levels || [])
    },
    canDrill() {
      // 只能往下看一级：本人列表可点进下级，下级的列表不可再点
      return this.path.length === 0
    },
    rootId() {
      return this.path.length ? this.path[this.path.length - 1].id : 0
    }
  },
  onShow() {
    this.inviteCode = getMyInviteCode()
    this.reload()
  },
  onReachBottom() {
    this.loadMore()
  },
  onShareAppMessage() {
    const invite = this.inviteCode
    return {
      title: '我邀请你加入植萃生活，一起拼团省更多',
      path: '/pages/home/index' + (invite ? '?invite=' + invite : '')
    }
  },
  methods: {
    async reload() {
      this.page = 1
      this.items = []
      this.finished = false
      await this.loadPage()
      this.loaded = true
    },
    async loadPage() {
      try {
        const res = await fetchReferrals(this.page, this.size, this.filterLevel, this.rootId)
        this.total = res.total
        this.inviteCode = res.inviteCode || this.inviteCode
        this.levels = res.levels || this.levels
        this.stats = res.stats || this.stats
        this.items = this.items.concat(res.items || [])
        if (this.items.length >= res.total || !(res.items || []).length) this.finished = true
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },
    onItemTap(e) {
      if (!this.canDrill) return
      const id = Number(e.currentTarget.dataset.id)
      if (!id) return
      const nickname = e.currentTarget.dataset.nickname || ('会员' + id)
      this.path.push({ id, nickname })
      this.reload()
    },
    goBack() {
      // 下钻链上有层级时先逐层回退，回到顶层后再退出页面
      if (this.path.length) {
        this.path.pop()
        this.reload()
        return
      }
      uni.navigateBack({ delta: 1 })
    },
    setFilter(level) {
      if (this.filterLevel === level) return
      this.filterLevel = level
      this.reload()
    },
    avatarSrc(m) {
      return resolveAssetUrl(m.avatarUrl)
    },
    async loadMore() {
      if (this.finished || this.loadingMore) return
      this.loadingMore = true
      this.page += 1
      await this.loadPage()
      this.loadingMore = false
    },
    maskPhone(phone) {
      if (!phone || phone.length < 7) return phone
      return phone.slice(0, 3) + '****' + phone.slice(-4)
    },
    copyCode() {
      if (!this.inviteCode) return
      uni.setClipboardData({
        data: this.inviteCode,
        success: () => uni.showToast({ title: '邀请码已复制', icon: 'success' })
      })
    },
    copyLink() {
      const link = 'http://localhost:5173/?invite=' + this.inviteCode
      uni.setClipboardData({
        data: link,
        success: () => uni.showToast({ title: '邀请链接已复制', icon: 'success' })
      })
    }
  }
}
</script>

<style scoped>
.referrals-page {
  background: linear-gradient(#f5f9f3, #f7f8f6);
}
.nav-bar {
  position: relative;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-back {
  position: absolute;
  left: 24rpx;
  width: 60rpx;
  height: 60rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 44rpx;
  color: #333;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 700;
}
.shell {
  padding: 12rpx 28rpx 60rpx;
}

/* ===== 邀请卡片 ===== */
.invite-card {
  padding: 36rpx 32rpx;
  background: linear-gradient(135deg, #f4fbf2 0%, #e7f5e6 60%, #fafdf9 100%);
  border: 1rpx solid rgba(61, 143, 76, 0.15);
}
.invite-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #2c7a43;
}
.invite-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7d837f;
}
.invite-code-row {
  margin-top: 30rpx;
  padding: 22rpx 26rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
}
.invite-code-label {
  font-size: 24rpx;
  color: #666;
}
.invite-code {
  flex: 1;
  margin-left: 20rpx;
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
  color: #237b39;
  font-family: monospace;
}
.copy-btn {
  padding: 10rpx 26rpx;
  border-radius: 24rpx;
  background: #26974f;
  color: #fff;
  font-size: 22rpx;
}
.share-btn {
  margin-top: 30rpx;
  height: 84rpx;
  line-height: 84rpx;
  font-size: 28rpx;
  background: linear-gradient(90deg, #3fae57, #237b39);
}

/* ===== 列表 ===== */
.stat-row {
  margin: 34rpx 6rpx 18rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-title {
  font-size: 28rpx;
  font-weight: 700;
}
.stat-count {
  font-size: 22rpx;
  color: #7d837f;
}
.list {
  padding: 8rpx 28rpx;
}
.ref-item {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f0f2f0;
}
.ref-item:last-child {
  border-bottom: 0;
}
.ref-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.ref-avatar-img {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  flex: none;
}
.ref-body {
  flex: 1;
  min-width: 0;
}
.ref-name {
  font-size: 28rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ref-uid {
  margin-left: 8rpx;
  font-size: 20rpx;
  font-weight: 400;
  color: #9ba19d;
}
.ref-sub {
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #8a908c;
}
.ref-level {
  padding: 6rpx 16rpx;
  border-radius: 18rpx;
  background: #e9f6e8;
  color: #2c8a43;
  font-size: 20rpx;
  font-weight: 700;
  flex: none;
}
/* 简短统计卡 */
.stat-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}
.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 30rpx rgba(25, 64, 38, 0.06);
}
.stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #176c39;
}
.stat-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a908c;
}
/* 面包屑下钻条 */
.crumb-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 20rpx;
  background: #eaf8ef;
  border-radius: 18rpx;
}
.crumb-back {
  flex: none;
  font-size: 24rpx;
  font-weight: 700;
  color: #176c39;
}
.crumb-path {
  font-size: 23rpx;
  color: #5f665f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ref-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex: none;
}
.ref-drill {
  font-size: 20rpx;
  color: #9ba19d;
}
.ref-item.clickable:active {
  background: #f4f8f4;
}
/* 级别徽章四色区分：体验绿 / 白银蓝 / 黄金金 / 钻石玫红 */
.ref-level-1 {
  background: #e9f6e8;
  color: #2c8a43;
}
.ref-level-2 {
  background: #e9f2ff;
  color: #3a6ff5;
}
.ref-level-3 {
  background: #fdf3dd;
  color: #b8862d;
}
.ref-level-4 {
  background: #fceaf1;
  color: #d6547c;
}
/* 级别筛选条 */
.filter-row {
  display: flex;
  white-space: nowrap;
  margin-bottom: 20rpx;
}
.filter-chip {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #5f665f;
  font-size: 24rpx;
  border: 1rpx solid #e4e9e4;
}
.filter-chip.active {
  background: #176c39;
  border-color: #176c39;
  color: #fff;
  font-weight: 700;
}
.list-end {
  padding: 24rpx 0;
  text-align: center;
  color: #b5bab6;
  font-size: 21rpx;
}

/* ===== 空状态 ===== */
.empty {
  padding: 80rpx 40rpx;
  text-align: center;
}
.empty-icon {
  font-size: 72rpx;
  color: #b8d8bb;
}
.empty-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.empty-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8a908c;
}
</style>
