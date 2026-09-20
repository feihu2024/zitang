<template>
  <view class="page pay-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">订单支付</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载/异常状态 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!order" class="page-tip">订单不存在</view>

    <template v-else>
      <!-- 状态卡（按订单状态动态展示） -->
      <view class="status-card">
        <view class="status-icon" :class="{ 'icon-warn': order.status === 'closed' }">
          {{ order.status === 'closed' ? '✕' : '✓' }}
        </view>
        <text class="status-title">{{ statusTitle }}</text>
        <text class="status-sub">{{ statusSub }}</text>
      </view>

      <!-- 金额卡 -->
      <view class="amount-card card">
        <view class="amount-line">
          <text class="amount-label">应付金额</text>
          <view class="amount-value">
            <text class="amount-symbol">¥</text>
            <text class="amount-big">{{ fmtPrice(order.totalAmount) }}</text>
          </view>
        </view>
        <view class="order-no">
          <text>订单编号</text>
          <text class="order-no-value">{{ order.orderNo }}</text>
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
        <view class="addr-line">
          <text class="addr-label">配送至</text>
          <text class="addr-value">{{ order.receiverName }}　{{ order.receiverPhone }}</text>
          <text class="addr-detail">{{ order.receiverAddress }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>

      <!-- 底部操作栏 -->
      <view class="pay-bar">
        <view class="bar-btn ghost" @tap="goHome">返回首页</view>
        <view v-if="order.status === 'pending_pay'" class="bar-btn primary" @tap="doPay">{{ payBtnText }}</view>
        <view v-else class="bar-btn primary" @tap="goDetail">查看订单</view>
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
    statusTitle() {
      const s = this.order ? this.order.status : ''
      if (s === 'pending_pay') return '订单提交成功'
      if (s === 'paid') return '支付成功'
      if (s === 'shipped') return '已发货'
      if (s === 'completed') return '交易完成'
      if (s === 'closed') return '订单已关闭'
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
      return ''
    }
  },
  onLoad(options) {
    this.orderNo = options.orderNo
    if (this.orderNo) {
      this.loadOrder()
      this.initPayMode()
    }
  },
  methods: {
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
    goDetail() {
      uni.navigateTo({ url: '/pages/order-detail/index?orderNo=' + this.orderNo })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.pay-page {
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
  font-size: 52rpx;
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
.addr-line {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2ef;
  display: flex;
  flex-wrap: wrap;
  font-size: 24rpx;
  color: #3a3f3b;
}
.addr-label {
  color: #9aa09b;
  margin-right: 16rpx;
}
.addr-detail {
  width: 100%;
  margin-top: 6rpx;
  color: #747a75;
}

.bottom-space {
  height: 160rpx;
}

/* 底部操作栏（居中限宽，适配桌面 H5 手机壳预览） */
.pay-bar {
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
