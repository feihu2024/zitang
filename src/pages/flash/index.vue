<template>
  <view class="page flash-page">
    <view class="safe-top flash-red"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar flash-red">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">限时秒杀</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- Hero 区 -->
    <view class="flash-hero">
      <view class="hero-text">
        <text class="hero-sub">限时专享 · 售完即止</text>
        <text class="hero-big">爆款秒杀</text>
        <text class="hero-sub2">低价限时抢</text>
        <text class="hero-tag">正品保障｜限量抢购</text>
      </view>
      <view class="hero-products">
        <image src="/static/product-shampoo.jpg" mode="aspectFill" />
        <image src="/static/product-bath.jpg" mode="aspectFill" />
      </view>
    </view>

    <!-- 场次切换（真实场次数据） -->
    <view class="slot-card card">
      <view v-if="sessions.length === 0" class="slot-empty">今日暂无秒杀场次～</view>
      <view
        v-for="(s, idx) in sessions"
        :key="s.id"
        class="slot"
        :class="{ active: slotIndex === idx }"
        @tap="setSlot(idx)"
      >
        <text class="slot-time">{{ s.time }}</text>
        <text class="slot-state">{{ s.stateText }}</text>
      </view>
    </view>

    <!-- 倒计时（进行中=距结束 / 预告=距开始） -->
    <view v-if="currentSession" class="count-card card">
      <text class="count-label">◷ {{ currentSession.state === 'running' ? '距离本场结束' : '距离本场开始' }}</text>
      <text class="time">{{ count.h }}</text>
      <text class="colon">:</text>
      <text class="time">{{ count.m }}</text>
      <text class="colon">:</text>
      <text class="time">{{ count.s }}</text>
    </view>

    <!-- 商品列表面板 -->
    <view class="sale-panel card">
      <!-- 分类（按当前场次商品的真实分类生成） -->
      <view v-if="categories.length > 1" class="categories">
        <text
          v-for="(cat, idx) in categories"
          :key="idx"
          :class="{ active: category === idx }"
          @tap="setCategory(idx)"
        >{{ cat }}</text>
      </view>

      <!-- 加载 / 空态 -->
      <view v-if="loading" class="sale-empty">正在加载…</view>
      <view v-else-if="filteredProducts.length === 0" class="sale-empty">本场暂无秒杀商品～</view>

      <!-- 商品卡片 -->
      <view class="sale-list">
        <view
          v-for="item in filteredProducts"
          :key="item.id"
          class="sale-item"
          :class="item.state"
          @tap="openProduct(item)"
        >
          <view class="sale-image">
            <image :src="item.cover" mode="aspectFill" />
            <text class="sale-badge">{{ item.badge }}</text>
          </view>
          <view class="sale-copy">
            <text class="sale-title ellipsis">{{ item.productName }}</text>
            <view v-if="item.tags && item.tags.length" class="sale-tags">
              <text v-for="(tag, ti) in item.tags" :key="ti">{{ tag }}</text>
            </view>

            <!-- 即将开始 -->
            <block v-if="item.state === 'upcoming'">
              <text class="start-time">{{ item.sessionTime }} 开始</text>
            </block>

            <!-- 抢购中 / 已售罄 -->
            <block v-else>
              <view class="sale-price">
                <text class="s-old">¥{{ item.originalPrice }}</text>
                <text class="s-price">¥{{ item.seckillPrice }}</text>
                <text v-if="item.discount" class="s-discount">{{ item.discount }}</text>
              </view>
            </block>

            <!-- 底部行：进度 + 操作按钮并排 -->
            <view class="sale-bottom">
              <block v-if="item.state !== 'upcoming' && item.showStock">
                <view class="sale-progress">
                  <text class="progress-text">已抢 {{ item.sold }} 件</text>
                  <view class="progress-bar">
                    <view :style="{ width: item.progress + '%' }"></view>
                  </view>
                  <text class="progress-text">{{ item.state === 'soldout' ? '库存为0' : '仅剩 ' + item.stockLeft + ' 件' }}</text>
                </view>
              </block>
              <view v-else class="sale-bottom-spacer"></view>
              <text class="sale-action">{{ item.action }}{{ item.state !== 'soldout' ? ' ⚡' : '' }}</text>
            </view>
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
      sessions: [],        // 今日场次（后端实时状态）
      slotIndex: 0,
      category: 0,
      products: [],        // 当前场次商品
      loading: false,
      count: { h: '00', m: '00', s: '00' },
      timer: null,
      lastReload: 0        // 防止倒计时归零时频繁重拉场次
    }
  },
  computed: {
    currentSession() {
      return this.sessions[this.slotIndex] || null
    },
    // 分类：全部 + 当前场次商品的真实分类名
    categories() {
      const names = []
      this.products.forEach(p => {
        if (p.categoryName && !names.includes(p.categoryName)) names.push(p.categoryName)
      })
      return ['全部', ...names]
    },
    filteredProducts() {
      if (this.category === 0) return this.products
      const name = this.categories[this.category]
      return this.products.filter(p => p.categoryName === name)
    }
  },
  onShow() {
    // 首次进入 / 从详情页返回都刷新场次与库存
    this.loadSessions()
  },
  onHide() {
    this.stopTimer()
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
        uni.redirectTo({ url: '/pages/home/index' })
      }
    },
    // ---- 场次 ----
    async loadSessions() {
      try {
        const res = await get('/api/wxapp/seckill/sessions')
        this.sessions = res.items || []
        // 默认选中第一个进行中场，否则选第一个预告场
        const runIdx = this.sessions.findIndex(s => s.state === 'running')
        const keep = this.sessions[this.slotIndex]
        const keepIdx = keep ? this.sessions.findIndex(s => s.id === keep.id) : -1
        this.slotIndex = runIdx >= 0 ? runIdx : (keepIdx >= 0 ? keepIdx : 0)
        this.startTimer()
        await this.loadActivities()
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      }
    },
    setSlot(idx) {
      if (this.slotIndex === idx) return
      this.slotIndex = idx
      this.category = 0
      this.startTimer()
      this.loadActivities()
    },
    setCategory(idx) {
      this.category = idx
    },
    // ---- 商品列表 ----
    async loadActivities() {
      const session = this.currentSession
      if (!session) {
        this.products = []
        return
      }
      this.loading = true
      try {
        const res = await get('/api/wxapp/seckill/activities', { session_id: session.id })
        this.products = (res.items || []).map(p => ({
          ...p,
          cover: resolveAssetUrl(p.cover),
          sessionTime: session.time,
          action: p.state === 'upcoming' ? '看详情' : p.action
        }))
        this.category = 0
      } catch (e) {
        this.products = []
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    openProduct(item) {
      // 进行中/未开始均进详情子页；已售罄拦截。带上入口场次，详情页按该场次展示状态
      if (item.state === 'soldout') {
        return uni.showToast({ title: '该商品已售罄', icon: 'none' })
      }
      const sid = this.currentSession ? this.currentSession.id : ''
      uni.navigateTo({
        url: '/pages/flash-detail/index?id=' + item.id + (sid ? '&session_id=' + sid : '')
      })
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
      const session = this.currentSession
      if (!session) {
        this.count = { h: '00', m: '00', s: '00' }
        return
      }
      const target = session.state === 'running' ? session.endAt : session.startAt
      const diff = Math.floor((new Date((target || '').replace(/-/g, '/')).getTime() - Date.now()) / 1000)
      if (diff <= 0) {
        // 场次到期（结束/开始）→ 限频刷新场次状态
        this.count = { h: '00', m: '00', s: '00' }
        const nowTs = Date.now()
        if (nowTs - this.lastReload > 5000) {
          this.lastReload = nowTs
          this.loadSessions()
        }
        return
      }
      const pad = n => String(n).padStart(2, '0')
      this.count = {
        h: pad(Math.floor(diff / 3600)),
        m: pad(Math.floor((diff % 3600) / 60)),
        s: pad(diff % 60)
      }
    }
  }
}
</script>

<style scoped>
.flash-page {
  padding-bottom: 40rpx;
  background: linear-gradient(#f42619 0 420rpx, #fff5f1 650rpx, #f7f7f7 100%);
  overflow-x: hidden;
}
.flash-red {
  background: #f42619;
  color: #fff;
}

/* 导航栏 */
.nav-bar {
  height: 88rpx;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  position: relative;
}
.nav-back {
  font-size: 52rpx;
  font-weight: 300;
  color: #fff;
  line-height: 1;
}
.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}
.capsule {
  margin-left: auto;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.75);
}

/* Hero 区 */
.flash-hero {
  height: 260rpx;
  padding: 28rpx 36rpx;
  display: flex;
  position: relative;
  overflow: hidden;
  color: #fff;
  background: radial-gradient(circle at 75% 25%, #ff8c2b 0, #ff4a14 35%, #e5140d 100%);
}
.hero-text {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.hero-sub {
  font-size: 19rpx;
}
.hero-big {
  margin-top: 10rpx;
  color: #fff3a9;
  font-size: 58rpx;
  font-weight: 900;
  line-height: 1;
}
.hero-sub2 {
  font-size: 52rpx;
  font-weight: 900;
}
.hero-tag {
  margin-top: 15rpx;
  padding: 8rpx 22rpx;
  border-radius: 25rpx;
  background: #fff5d5;
  color: #e42d14;
  font-size: 19rpx;
  font-weight: 700;
}
.hero-products {
  width: 280rpx;
  position: absolute;
  right: 0;
  bottom: -8rpx;
  display: flex;
  align-items: flex-end;
}
.hero-products image {
  width: 145rpx;
  height: 205rpx;
  margin-left: -38rpx;
  border-radius: 32rpx 32rpx 14rpx 14rpx;
  filter: drop-shadow(0 15rpx 18rpx rgba(120, 15, 4, 0.28));
}
.hero-products image:last-child {
  height: 225rpx;
}

/* 场次切换 */
.slot-card {
  height: 116rpx;
  margin: -3rpx 20rpx 0;
  padding: 8rpx;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  position: relative;
  z-index: 4;
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1rpx solid #eee;
}
.slot-time {
  font-size: 28rpx;
  font-weight: 700;
}
.slot-state {
  margin-top: 6rpx;
  color: #777;
  font-size: 19rpx;
}
.slot.active {
  border-radius: 20rpx;
  background: linear-gradient(145deg, #ff502d, #f31d20);
  color: #fff;
}
.slot.active .slot-state {
  color: #fff;
}

/* 倒计时 */
.count-card {
  height: 84rpx;
  margin: 16rpx 20rpx 0;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.count-label {
  margin-right: 10rpx;
  font-size: 23rpx;
}
.count-card .time {
  padding: 7rpx;
  border-radius: 7rpx;
  background: #f43427;
  color: #fff;
  font-size: 23rpx;
  font-weight: 700;
}
.colon {
  font-weight: 700;
  color: #f43427;
}
.coupon {
  margin-left: auto;
  padding-left: 20rpx;
  border-left: 1rpx solid #eee;
  color: #e64b25;
  font-size: 20rpx;
}

/* 商品列表面板 */
.sale-panel {
  margin: 16rpx 20rpx;
  padding: 18rpx 14rpx;
}
.categories {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12rpx;
}
.categories text {
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  border-radius: 30rpx;
  background: #f6f6f6;
  font-size: 22rpx;
}
.categories text.active {
  background: linear-gradient(90deg, #ff401f, #ed1e18);
  color: #fff;
  font-weight: 700;
}

/* 商品卡片 */
.sale-list {
  margin-top: 20rpx;
}
.sale-item {
  min-height: 210rpx;
  margin-bottom: 18rpx;
  padding: 18rpx;
  display: flex;
  gap: 18rpx;
  border: 1rpx solid #ffe1db;
  border-radius: 20rpx;
  background: #fff;
}
.sale-image {
  width: 186rpx;
  height: 186rpx;
  flex: none;
  position: relative;
  overflow: hidden;
  border-radius: 15rpx;
}
.sale-image image {
  width: 100%;
  height: 100%;
}
.sale-badge {
  position: absolute;
  left: 0;
  top: 0;
  padding: 7rpx 14rpx;
  border-radius: 0 0 12rpx 0;
  background: #f62e24;
  color: #fff;
  font-size: 19rpx;
  font-weight: 600;
}
.upcoming .sale-badge {
  background: #ff7b18;
}
.soldout .sale-badge {
  background: #888;
}
.sale-copy {
  flex: 1;
  min-width: 0;
  padding: 6rpx 0;
  display: flex;
  flex-direction: column;
}
.sale-title {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
}
.sale-tags {
  height: 46rpx;
  margin: 12rpx 0;
  display: flex;
  gap: 8rpx;
  overflow: hidden;
}
.sale-tags text {
  padding: 5rpx 12rpx;
  border-radius: 9rpx;
  background: #fff0eb;
  color: #ec593d;
  font-size: 19rpx;
  white-space: nowrap;
}
.sale-price {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.s-old {
  color: #999;
  text-decoration: line-through;
  font-size: 22rpx;
}
.s-price {
  color: #f22821;
  font-size: 42rpx;
  font-weight: 800;
}
.s-discount {
  padding: 5rpx 11rpx;
  border-radius: 7rpx;
  background: #f22821;
  color: #fff;
  font-size: 19rpx;
}
.sale-progress {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10rpx;
}
.progress-text {
  color: #777;
  font-size: 19rpx;
  white-space: nowrap;
}
.progress-bar {
  height: 10rpx;
  border-radius: 10rpx;
  background: #ffdcd5;
  overflow: hidden;
}
.progress-bar view {
  height: 100%;
  border-radius: 10rpx;
  background: linear-gradient(90deg, #ff6b68, #f43329);
}
.sale-bottom {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: auto;
  padding-top: 12rpx;
}
.sale-bottom-spacer {
  flex: 1;
}
.sale-action {
  flex: none;
  min-width: 140rpx;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  border-radius: 32rpx;
  background: linear-gradient(90deg, #ff542d, #ef1f20);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
.soldout {
  filter: grayscale(0.65);
  opacity: 0.82;
}
.soldout .sale-action {
  background: #bbb;
}
.upcoming .sale-action {
  background: #ff7b15;
}
.start-time {
  display: block;
  margin-top: auto;
  padding-bottom: 4rpx;
  color: #ef5129;
  font-size: 26rpx;
}

/* 空态 */
.slot-empty,
.sale-empty {
  padding: 40rpx 0;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}
/* 场次卡片为 4 列网格，空态需跨满整行并居中，避免文案被挤成两行 */
.slot-card .slot-empty {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  white-space: nowrap;
}
</style>
