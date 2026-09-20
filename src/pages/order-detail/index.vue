<template>
  <view class="page detail-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">订单详情</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载/异常状态 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!order" class="page-tip">订单不存在</view>

    <template v-else>
      <!-- 状态卡（按订单状态动态展示） -->
      <view class="status-card">
        <view class="status-icon" :class="{ 'icon-warn': order.status === 'closed' }">
          {{ statusIcon }}
        </view>
        <text class="status-title">{{ statusTitle }}</text>
        <text class="status-sub">{{ statusSub }}</text>
      </view>

      <!-- 金额卡 -->
      <view class="amount-card card">
        <view class="amount-line">
          <text class="amount-label">订单金额</text>
          <view class="amount-value">
            <text class="amount-symbol">¥</text>
            <text class="amount-big">{{ fmtPrice(order.totalAmount) }}</text>
          </view>
        </view>
        <view v-if="order.candyDiscount > 0" class="candy-line">
          <text class="candy-line-label">🍬 糖豆抵扣（{{ Math.round(order.candyAmount) }} 糖豆）</text>
          <text class="candy-line-value">-¥{{ fmtPrice(order.candyDiscount) }}</text>
        </view>
        <view class="order-no">
          <text>订单编号</text>
          <text class="order-no-value">{{ order.orderNo }}</text>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="addr-card card">
        <view class="addr-head">
          <text class="addr-title">收货信息</text>
        </view>
        <view class="addr-line">
          <text class="addr-label">收货人</text>
          <text class="addr-value">{{ order.receiverName }}　{{ order.receiverPhone }}</text>
        </view>
        <view class="addr-line">
          <text class="addr-label">收货地址</text>
          <text class="addr-value">{{ order.receiverAddress }}</text>
        </view>
      </view>

      <!-- 商品摘要 -->
      <view class="goods-card card">
        <view v-for="(it, i) in order.items" :key="i" class="goods-row">
          <image class="goods-img" :src="itemImage(it)" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ it.productName }}</text>
            <text class="goods-spec">{{ specText(it) }}</text>
          </view>
          <view class="goods-right">
            <text class="goods-price">¥{{ fmtPrice(it.price) }}</text>
            <text class="goods-qty">×{{ it.quantity }}</text>
          </view>
        </view>
        <view class="goods-total">
          <text>共 {{ itemCount }} 件商品</text>
          <text>合计：<text class="total-symbol">¥</text><text class="total-value">{{ fmtPrice(order.totalAmount) }}</text></text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="info-card card">
        <view class="info-row">
          <text class="info-label">订单号</text>
          <text class="info-value">{{ order.orderNo || '—' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">订单来源</text>
          <text class="info-value">{{ sourceText(order.orderSource) }}</text>
        </view>
        <view v-if="order.groupNo" class="info-row">
          <text class="info-label">拼团信息</text>
          <text class="info-value">团号 {{ order.groupNo }}（{{ order.groupRole === 'leader' ? '团长' : '团员' }}）· {{ groupStatusText(order.groupStatus) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">下单时间</text>
          <text class="info-value">{{ order.createdAt || '—' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">支付时间</text>
          <text class="info-value">{{ order.payTime || '—' }}</text>
        </view>
        <view v-if="order.shipTime" class="info-row">
          <text class="info-label">发货时间</text>
          <text class="info-value">{{ order.shipTime }}</text>
        </view>
        <view v-if="order.completeTime" class="info-row">
          <text class="info-label">完成时间</text>
          <text class="info-value">{{ order.completeTime }}</text>
        </view>
        <view v-if="order.transactionId" class="info-row">
          <text class="info-label">微信支付单号</text>
          <text class="info-value">{{ order.transactionId }}</text>
        </view>
        <view v-if="order.shipCompany || order.shipNo" class="info-row">
          <text class="info-label">物流信息</text>
          <text class="info-value">{{ order.shipCompany || '' }} {{ order.shipNo || '' }}</text>
        </view>
        <view v-if="order.remark" class="info-row">
          <text class="info-label">订单备注</text>
          <text class="info-value">{{ order.remark }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>

      <!-- 底部操作栏（居中限宽，适配桌面 H5 手机壳预览） -->
      <view class="action-bar">
        <view class="bar-btn ghost" @tap="goHome">返回首页</view>
        <view v-if="order.status === 'pending_pay'" class="bar-btn primary" @tap="doPay">{{ payBtnText }}</view>
        <view v-else-if="order.status === 'shipped'" class="bar-btn primary" @tap="confirmReceive">确认收货</view>
      </view>
    </template>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'

export default {
  data() {
    return {
      orderNo: null,
      order: null,
      loading: false,
      paying: false,
      payMode: 'mock', // real=微信支付 mock=模拟支付（开发/演示）
      payBtnText: '立即支付'
    }
  },
  computed: {
    statusIcon() {
      const s = this.order ? this.order.status : ''
      if (s === 'closed') return '✕'
      if (s === 'group_failed') return '✕'
      if (s === 'pending_pay') return '⏱'
      if (s === 'paid') return '💰'
      if (s === 'shipped') return '🚚'
      if (s === 'completed') return '✓'
      return '✓'
    },
    statusTitle() {
      const s = this.order ? this.order.status : ''
      if (s === 'pending_pay') return '等待支付'
      if (s === 'paid') return this.order.groupNo && this.order.groupStatus === 'grouping'
        ? '拼团中，成团后发货'
        : '已支付，等待发货'
      if (s === 'shipped') return '已发货'
      if (s === 'completed') return '交易完成'
      if (s === 'closed') return '订单已关闭'
      if (s === 'group_failed') return '拼团失败，货款已退至余额'
      return '订单状态异常'
    },
    statusSub() {
      const s = this.order ? this.order.status : ''
      if (s === 'pending_pay') return '请尽快完成支付，逾期订单将自动关闭'
      if (s === 'paid') return '商家将尽快为您发货 · 支付时间 ' + (this.order.payTime || '')
      if (s === 'shipped') {
        const logistics = this.order.shipCompany || this.order.shipNo
        return logistics ? ('已发货 · ' + (this.order.shipCompany || '') + ' ' + (this.order.shipNo || '')).trim() : '商家已发货，请留意收货'
      }
      if (s === 'completed') return '订单已完成 · 感谢您的购买'
      if (s === 'closed') return '订单已关闭，如需购买请重新下单'
      if (s === 'group_failed') return '拼团超时未成团，货款已退至您的账户余额'
      return ''
    },
    itemCount() {
      return (this.order.items || []).reduce((n, it) => n + it.quantity, 0)
    }
  },
  onLoad(options) {
    this.orderNo = options.orderNo
    if (this.orderNo) {
      this.loadOrder()
      this.initPayMode()
    }
  },
  onShow() {
    // 从支付页返回/支付成功后刷新状态
    if (this.orderNo) this.loadOrder()
  },
  methods: {
    // 订单来源文案
    sourceText(s) {
      const map = { normal: '普通下单', seckill: '秒杀活动', groupbuy: '拼团活动', lottery: '抽奖活动' }
      return map[s] || '普通下单'
    },
    // 拼团团状态文案
    groupStatusText(s) {
      const map = { grouping: '拼团中', success: '已成团', failed: '拼团失败' }
      return map[s] || ''
    },
    async loadOrder() {
      this.loading = true
      try {
        this.order = await get('/api/wxapp/orders/' + this.orderNo)
        this.refreshPayBtn()
      } catch (e) {
        console.error('加载订单失败:', e)
        this.order = null
      } finally {
        this.loading = false
      }
    },
    // 探测支付模式：real=微信支付，mock=模拟支付（开发/演示）
    async initPayMode() {
      try {
        const r = await get('/api/wxapp/config/pay-mode')
        this.payMode = r.mode === 'real' ? 'real' : 'mock'
      } catch (e) {
        this.payMode = 'mock'
      }
      this.refreshPayBtn()
    },
    refreshPayBtn() {
      if (this.order && this.order.status === 'pending_pay') {
        this.payBtnText = this.payMode === 'real' ? '立即支付' : '模拟支付'
      }
    },
    doPay() {
      if (this.paying) return
      if (this.payMode === 'real') {
        this.realPay()
      } else {
        this.mockPay()
      }
    },
    // 模拟支付（开发/演示环境）：直接调后端将订单置为已支付
    async mockPay() {
      this.paying = true
      try {
        const order = await post('/api/wxapp/orders/' + this.orderNo + '/mock-pay')
        this.order = order
        uni.showToast({ title: '支付成功', icon: 'success' })
      } catch (e) {
        console.error('模拟支付失败:', e)
        uni.showToast({ title: e.message || '支付失败', icon: 'none' })
      } finally {
        this.paying = false
      }
    },
    // 真实微信支付：后端下单拿参数 → wx.requestPayment
    async realPay() {
      this.paying = true
      try {
        const params = await post('/api/wxapp/orders/' + this.orderNo + '/pay')
        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
          success: () => {
            uni.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrder()
          },
          fail: (err) => {
            console.error('调起支付失败:', err)
            uni.showToast({ title: '支付取消或未完成', icon: 'none' })
          }
        })
      } catch (e) {
        console.error('微信下单失败:', e)
        uni.showToast({ title: e.message || '微信下单失败', icon: 'none' })
      } finally {
        this.paying = false
      }
    },
    // 确认收货（shipped → completed）
    confirmReceive() {
      uni.showModal({
        title: '确认收货',
        content: '请确认已收到商品，确认后订单将变为已完成。',
        success: async (r) => {
          if (!r.confirm) return
          try {
            this.order = await post('/api/wxapp/orders/' + this.orderNo + '/confirm')
            uni.showToast({ title: '确认收货成功', icon: 'success' })
          } catch (e) {
            console.error('确认收货失败:', e)
            uni.showToast({ title: e.message || '操作失败', icon: 'none' })
          }
        }
      })
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    specText(item) {
      const spec = item.skuSpec || {}
      const vals = Object.values(spec)
      return vals.length > 0 ? vals.join(' / ') : '默认规格'
    },
    itemImage(item) {
      if (item.skuImage) return resolveAssetUrl(item.skuImage)
      return '/static/product-bath.jpg'
    },
    goHome() {
      // 项目未配置原生 tabBar（首页为自定义 TabBar），统一用 redirectTo 跳转
      uni.redirectTo({ url: '/pages/home/index' })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.detail-page {
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

.page-tip {
  padding: 200rpx 0;
  text-align: center;
  color: #9aa09b;
  font-size: 26rpx;
}

/* 状态卡 */
.status-card {
  padding: 48rpx 0 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
}
.status-icon {
  width: 96rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  border-radius: 50%;
  background: #eaf8ef;
  color: #27b969;
  font-size: 48rpx;
  font-weight: 800;
}
.status-icon.icon-warn {
  background: #fef2f2;
  color: #ff6b6b;
}
.status-title {
  margin-top: 20rpx;
  font-size: 34rpx;
  font-weight: 800;
}
.status-sub {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #9aa09b;
  padding: 0 40rpx;
  text-align: center;
}

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

/* 金额卡 */
.amount-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.amount-label {
  font-size: 28rpx;
  font-weight: 700;
}
.amount-value {
  display: flex;
  align-items: baseline;
}
.amount-symbol {
  color: #ff3b42;
  font-size: 30rpx;
  font-weight: 800;
}
.amount-big {
  color: #ff3b42;
  font-size: 52rpx;
  font-weight: 800;
}
/* 糖豆抵扣行 */
.candy-line {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 18rpx;
  border-radius: 10rpx;
  background: #fdf4f7;
}
.candy-line-label {
  font-size: 24rpx;
  color: #c2366c;
}
.candy-line-value {
  font-size: 26rpx;
  font-weight: 800;
  color: #e0447f;
}

.order-no {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f2ef;
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #9aa09b;
}
.order-no-value {
  color: #3a3f3b;
}

/* 收货信息 */
.addr-title {
  font-size: 26rpx;
  font-weight: 700;
}
.addr-line {
  margin-top: 14rpx;
  display: flex;
  font-size: 24rpx;
  color: #3a3f3b;
}
.addr-label {
  color: #9aa09b;
  margin-right: 16rpx;
  flex: none;
}
.addr-value {
  flex: 1;
  min-width: 0;
}

/* 商品摘要 */
.goods-row {
  display: flex;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f2ef;
}
.goods-row:last-of-type {
  border-bottom: none;
}
.goods-img {
  width: 120rpx;
  height: 120rpx;
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
.goods-total {
  margin-top: 10rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f0f2ef;
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #3a3f3b;
}
.total-symbol {
  color: #ff3b42;
  font-size: 26rpx;
  font-weight: 800;
}
.total-value {
  color: #ff3b42;
  font-size: 32rpx;
  font-weight: 800;
}

/* 订单信息 */
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  font-size: 24rpx;
}
.info-label {
  color: #9aa09b;
  flex: none;
  margin-right: 24rpx;
}
.info-value {
  color: #3a3f3b;
  text-align: right;
  word-break: break-all;
}

.bottom-space {
  height: 160rpx;
}

/* 底部操作栏（居中限宽，适配桌面 H5 手机壳预览） */
.action-bar {
  position: fixed;
  left: 50%;
  right: auto;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  bottom: 0;
  height: 110rpx;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  gap: 20rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 10;
}
.bar-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.bar-btn.ghost {
  border: 1rpx solid #d8dcd8;
  color: #3a3f3b;
  background: #fff;
}
.bar-btn.primary {
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
}
</style>
