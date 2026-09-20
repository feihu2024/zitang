<template>
  <view class="page orders-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">我的订单</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 状态筛选 Tab（全部/已支付/已发货/已完成） -->
    <scroll-view class="order-tabs" scroll-x>
      <view class="order-tabs-inner">
        <view
          v-for="(tab, idx) in tabs"
          :key="idx"
          class="order-tab"
          :class="{ active: currentTab === idx }"
          @tap="setTab(idx)"
        >{{ tab.label }}</view>
      </view>
    </scroll-view>

    <!-- 未登录提示 -->
    <view v-if="!loggedIn" class="login-tip">
      <text class="login-tip-icon">🔒</text>
      <text class="login-tip-text">登录后查看您的订单</text>
      <view class="login-tip-btn" @tap="goLogin">去登录</view>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading && orders.length === 0" class="page-tip">加载中...</view>

    <!-- 空状态 -->
    <view v-else-if="orders.length === 0" class="empty-box">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无相关订单</text>
      <view class="empty-btn" @tap="goShopping">去逛逛</view>
    </view>

    <!-- 订单列表 -->
    <view v-else class="order-list">
      <view v-for="o in orders" :key="o.orderNo" class="order-card card" @tap="goDetail(o)">
        <!-- 卡片头：来源标签 + 订单号 + 拼团状态 + 状态 -->
        <view class="order-head">
          <view class="order-head-left">
            <text
              v-if="o.orderSource && o.orderSource !== 'normal'"
              class="src-tag"
              :class="'src-' + o.orderSource"
            >{{ sourceText(o.orderSource) }}</text>
            <text class="order-no">{{ o.orderNo }}</text>
          </view>
          <view class="order-head-right">
            <text
              v-if="o.status === 'paid' && o.groupNo && groupStatusText(o.groupStatus)"
              class="group-tag"
              :class="'gt-' + o.groupStatus"
            >{{ groupStatusText(o.groupStatus) }}</text>
            <text class="order-status" :class="statusCls(o.status)">{{ statusText(o.status) }}</text>
          </view>
        </view>

        <!-- 商品摘要 -->
        <view class="order-goods">
          <image class="goods-img" :src="itemImage(o.items[0])" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ (o.items[0] || {}).productName || '' }}</text>
            <text class="goods-spec">{{ specText(o.items[0]) }}</text>
            <text v-if="o.items.length > 1" class="goods-more">等 {{ o.items.length }} 件商品</text>
          </view>
          <view class="goods-right">
            <text class="goods-price">¥{{ fmtPrice((o.items[0] || {}).price) }}</text>
            <text class="goods-qty">×{{ (o.items[0] || {}).quantity }}</text>
          </view>
        </view>

        <!-- 卡片底：合计 + 操作 -->
        <view class="order-foot">
          <view class="order-amount">
            共 {{ itemCount(o) }} 件　合计
            <text class="amount-symbol">¥</text>
            <text class="amount-value">{{ fmtPrice(o.totalAmount) }}</text>
            <text v-if="o.candyDiscount > 0" class="candy-badge">🍬抵¥{{ fmtPrice(o.candyDiscount) }}</text>
          </view>
          <view class="order-actions">
            <view
              v-if="o.status === 'shipped' || o.status === 'completed'"
              class="mini-btn ghost"
              @tap.stop="goLogistics(o)"
            >查看物流</view>
            <view
              v-if="o.status === 'shipped'"
              class="mini-btn primary"
              @tap.stop="confirmReceive(o)"
            >确认收货</view>
            <view
              v-else-if="o.status !== 'shipped' && o.status !== 'completed'"
              class="mini-btn ghost"
              @tap.stop="goDetail(o)"
            >查看详情</view>
          </view>
        </view>
      </view>

      <view class="load-more">{{ noMore ? '没有更多了' : (loading ? '加载中...' : '上拉加载更多') }}</view>
    </view>

    <view class="bottom-space"></view>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '已支付', value: 'paid' },
  { label: '已发货', value: 'shipped' },
  { label: '已完成', value: 'completed' }
]

export default {
  data() {
    return {
      loggedIn: false,
      currentTab: 0,
      orders: [],
      page: 1,
      size: 10,
      total: 0,
      loading: false,
      noMore: false
    }
  },
  computed: {
    tabs() {
      return STATUS_TABS
    }
  },
  onLoad(options) {
    this.loggedIn = isLoggedIn()
    // 支持个人中心入口携带状态参数：paid=待发货 / shipped=待收货 / completed=已完成
    const status = options.status || ''
    const idx = STATUS_TABS.findIndex(t => t.value === status)
    if (idx > 0) this.currentTab = idx
  },
  onShow() {
    if (isLoggedIn()) {
      this.loggedIn = true
      this.refresh()
    } else {
      this.loggedIn = false
    }
  },
  onPullDownRefresh() {
    this.refresh().finally(() => uni.stopPullDownRefresh())
  },
  onReachBottom() {
    if (this.loggedIn && !this.loading && !this.noMore) this.loadOrders()
  },
  methods: {
    async refresh() {
      this.page = 1
      this.noMore = false
      this.orders = []
      await this.loadOrders()
    },
    async loadOrders() {
      this.loading = true
      try {
        const status = STATUS_TABS[this.currentTab].value
        const r = await get('/api/wxapp/orders', {
          page: this.page,
          size: this.size,
          status: status || undefined
        })
        this.total = r.total || 0
        const items = r.items || []
        this.orders = this.page === 1 ? items : this.orders.concat(items)
        this.noMore = this.orders.length >= this.total
        this.page += 1
      } catch (e) {
        console.error('加载订单列表失败:', e)
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    setTab(idx) {
      if (idx === this.currentTab) return
      this.currentTab = idx
      this.refresh()
    },
    // 确认收货（shipped → completed）
    confirmReceive(o) {
      uni.showModal({
        title: '确认收货',
        content: '请确认已收到商品，确认后订单将变为已完成。',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await post('/api/wxapp/orders/' + o.orderNo + '/confirm')
            uni.showToast({ title: '确认收货成功', icon: 'success' })
            this.refresh()
          } catch (e) {
            console.error('确认收货失败:', e)
            uni.showToast({ title: e.message || '操作失败', icon: 'none' })
          }
        }
      })
    },
    goDetail(o) {
      uni.navigateTo({ url: '/pages/order-detail/index?orderNo=' + o.orderNo })
    },
    goLogistics(o) {
      uni.navigateTo({ url: '/pages/logistics/index?orderNo=' + o.orderNo })
    },
    goShopping() {
      uni.redirectTo({ url: '/pages/home/index' })
    },
    goLogin() {
      uni.redirectTo({ url: '/pages/profile/index' })
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/profile/index' })
      }
    },
    statusText(s) {
      const map = {
        pending_pay: '待支付',
        paid: '已支付',
        shipped: '已发货',
        completed: '已完成',
        closed: '已关闭',
        group_failed: '拼团失败·已退款'
      }
      return map[s] || s
    },
    statusCls(s) {
      const cls = {
        pending_pay: 'st-pay',
        paid: 'st-paid',
        shipped: 'st-ship',
        completed: 'st-done',
        closed: 'st-close',
        group_failed: 'st-fail'
      }
      return cls[s] || ''
    },
    // 订单来源标签文案（普通下单不显示标签）
    sourceText(s) {
      const map = { seckill: '秒杀', groupbuy: '拼团', lottery: '抽奖' }
      return map[s] || ''
    },
    // 拼团团状态文案（拼团中/已成团/已失败；失败由订单状态本身表达）
    groupStatusText(s) {
      const map = { grouping: '拼团中', success: '已成团' }
      return map[s] || ''
    },
    itemCount(o) {
      return (o.items || []).reduce((n, it) => n + it.quantity, 0)
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
    }
  }
}
</script>

<style scoped>
.orders-page {
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

/* 状态筛选 Tab */
.order-tabs {
  background: #fff;
  white-space: nowrap;
}
.order-tabs-inner {
  display: inline-flex;
  padding: 0 12rpx;
}
.order-tab {
  padding: 22rpx 26rpx 20rpx;
  font-size: 26rpx;
  color: #5d635e;
  position: relative;
}
.order-tab.active {
  color: #1f8f47;
  font-weight: 700;
}
.order-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 6rpx;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  border-radius: 6rpx;
  background: #27b969;
}

/* 未登录 / 加载 / 空状态 */
.login-tip,
.empty-box {
  padding: 140rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.login-tip-icon,
.empty-icon {
  font-size: 80rpx;
}
.login-tip-text,
.empty-text {
  font-size: 26rpx;
  color: #9aa09b;
}
.login-tip-btn,
.empty-btn {
  margin-top: 16rpx;
  padding: 16rpx 56rpx;
  border-radius: 40rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
.page-tip {
  padding: 200rpx 0;
  text-align: center;
  color: #9aa09b;
  font-size: 26rpx;
}

/* 订单卡片 */
.order-list {
  padding: 20rpx 24rpx 0;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.order-card + .order-card {
  margin-top: 20rpx;
}
.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18rpx;
  border-bottom: 1rpx solid #f0f2ef;
}
.order-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.order-head-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: none;
}
.src-tag {
  flex: none;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
}
.src-groupbuy {
  background: #e6f0fd;
  color: #2f80ed;
}
.src-seckill {
  background: #fff1e5;
  color: #ff7a1a;
}
.src-lottery {
  background: #f0e8ff;
  color: #764ba2;
}
.group-tag {
  flex: none;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  font-weight: 600;
}
.gt-grouping {
  background: #fff1e5;
  color: #ff7a1a;
}
.gt-success {
  background: #e5f6ec;
  color: #27b969;
}
.order-no {
  font-size: 22rpx;
  color: #9aa09b;
  font-family: monospace;
}
.order-status {
  font-size: 24rpx;
  font-weight: 700;
}
.st-pay { color: #ff7a1a; }
.st-paid { color: #2f80ed; }
.st-ship { color: #27b969; }
.st-done { color: #9aa09b; }
.st-close { color: #b0b4b0; }
.st-fail { color: #ff3b42; }

/* 商品行 */
.order-goods {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
}
.goods-img {
  width: 130rpx;
  height: 130rpx;
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
.goods-more {
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

/* 卡片底 */
.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 18rpx;
  border-top: 1rpx solid #f0f2ef;
}
.order-amount {
  font-size: 24rpx;
  color: #3a3f3b;
}
.amount-symbol {
  color: #ff3b42;
  font-size: 26rpx;
  font-weight: 800;
}
.amount-value {
  color: #ff3b42;
  font-size: 34rpx;
  font-weight: 800;
}
.candy-badge {
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: #fdeef3;
  color: #e0447f;
  font-size: 20rpx;
  font-weight: 600;
  vertical-align: middle;
}
.order-actions {
  display: flex;
  gap: 16rpx;
}
.mini-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.mini-btn.primary {
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
}
.mini-btn.ghost {
  border: 1rpx solid #d8dcd8;
  color: #3a3f3b;
  background: #fff;
}

.load-more {
  padding: 28rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #b0b4b0;
}
.bottom-space {
  height: 40rpx;
}
</style>
