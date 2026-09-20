<template>
  <view class="page confirm-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">确认订单</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载/异常状态 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!sku" class="page-tip">商品不存在或已下架</view>

    <template v-else>
      <!-- 收货地址卡片（参考原型 address-card：点击选择/新增地址） -->
      <view class="addr-card card">
        <view class="addr-head">
          <text class="addr-title">收货地址</text>
          <text class="addr-add" @tap="goAddressAdd">＋ 新增地址</text>
        </view>
        <view v-if="address" class="addr-body" @tap="goAddressList">
          <text class="addr-pin">⌖</text>
          <view class="addr-main">
            <view class="addr-line1">
              <text class="addr-name">{{ address.name }}</text>
              <text class="addr-tag" v-if="address.isDefault">默认</text>
              <text class="addr-phone">{{ address.phone }}</text>
            </view>
            <text class="addr-detail">{{ fullAddressText }}</text>
          </view>
          <text class="addr-arrow">›</text>
        </view>
        <view v-else class="addr-empty" @tap="goAddressAdd">
          <text class="addr-empty-text">请添加收货地址</text>
          <text class="addr-arrow">›</text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="goods-card card">
        <view class="goods-row">
          <image class="goods-img" :src="goodsImage" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ product.name }}</text>
            <text class="goods-spec">{{ specText }}</text>
            <view class="goods-bottom">
              <text class="goods-price">¥{{ fmtPrice(sku.price) }}</text>
              <view class="qty-stepper">
                <text class="qty-btn" :class="{ disabled: quantity <= 1 }" @tap="changeQty(-1)">−</text>
                <text class="qty-num">{{ quantity }}</text>
                <text class="qty-btn" :class="{ disabled: quantity >= sku.stock }" @tap="changeQty(1)">＋</text>
              </view>
            </view>
          </view>
        </view>
        <view class="remark-row">
          <text class="form-label">备注</text>
          <input class="form-input" v-model="form.remark" placeholder="选填，给商家留言" maxlength="50" />
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="amount-card card">
        <view class="amount-row">
          <text>商品金额</text>
          <text>¥{{ fmtPrice(totalAmount) }}</text>
        </view>
        <view class="amount-row">
          <text>运费</text>
          <text v-if="freightQuote && freightQuote.shippable === false" class="noship">该地区暂不支持配送</text>
          <text v-else-if="freightQuote && freightQuote.freight > 0" class="freight-fee">¥{{ fmtPrice(freightQuote.freight) }}</text>
          <text v-else class="free">免运费</text>
        </view>
        <view v-if="freightQuote && freightQuote.freeAmount > 0 && freightQuote.shippable !== false" class="freight-hint">
          满 ¥{{ fmtPrice(freightQuote.freeAmount) }} 包邮
        </view>
        <!-- 糖豆抵扣（商品支持且有糖豆时展示，点击开关切换） -->
        <view v-if="candySupported" class="amount-row candy-row" @tap="toggleCandy">
          <view class="candy-left">
            <text class="candy-label">🍬 糖豆抵扣</text>
            <text class="candy-sub">持有 {{ memberCandy }} 糖豆·最多可抵 ¥{{ fmtPrice(candyMaxDiscount) }}</text>
          </view>
          <view class="candy-right">
            <text v-if="useCandy" class="candy-minus">-¥{{ fmtPrice(candyDiscount) }}</text>
            <view class="candy-switch" :class="{ on: useCandy }"></view>
          </view>
        </view>
        <view class="amount-row total">
          <text>合计</text>
          <text class="total-price">¥{{ fmtPrice(payableTotal) }}</text>
        </view>
      </view>

      <view class="bottom-space"></view>

      <!-- 底部提交栏 -->
      <view class="submit-bar">
        <view class="submit-total">
          <text class="total-label">合计：</text>
          <text class="total-symbol">¥</text>
          <text class="total-big">{{ fmtPrice(payableTotal) }}</text>
        </view>
        <view class="submit-btn" :class="{ disabled: submitting || !canSubmit }" @tap="submitOrder">
          {{ submitting ? '提交中...' : '提交订单' }}
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'
import { getSelectedAddress, loadAddresses, fullAddress } from '@/utils/address.js'

export default {
  data() {
    return {
      productId: null,
      skuId: null,
      product: null,
      sku: null,
      loading: false,
      submitting: false,
      quantity: 1,
      address: null,
      // 运费预览（后端 /freight/quote 返回：freight/shippable/freeAmount）
      freightQuote: null,
      // 糖豆抵扣：会员持有量 / 兑换比例 / 是否使用
      memberCandy: 0,
      candyRate: 100,
      useCandy: false,
      form: {
        remark: ''
      }
    }
  },
  computed: {
    specText() {
      const spec = this.sku && this.sku.spec_values
      if (!spec) return '默认规格'
      const vals = Object.values(spec)
      return vals.length > 0 ? vals.join(' / ') : '默认规格'
    },
    fullAddressText() {
      return fullAddress(this.address)
    },
    goodsImage() {
      const img = this.sku && this.sku.image
      if (img) return resolveAssetUrl(img)
      if (this.product && this.product.coverUrl) return resolveAssetUrl(this.product.coverUrl)
      return '/static/product-bath.jpg'
    },
    totalAmount() {
      return (this.sku ? Number(this.sku.price) : 0) * this.quantity
    },
    // 糖豆抵扣：商品支持且有持有量时可用
    candySupported() {
      return !!(this.product && this.product.candyRatio > 0 && this.memberCandy > 0)
    },
    // 最大可抵金额 = 商品金额 × 商品抵扣比例%（不含运费）
    candyMaxDiscount() {
      if (!this.candySupported) return 0
      return Math.round(this.totalAmount * this.product.candyRatio) / 100
    },
    // 实际抵扣额 = min(最大可抵, 糖豆余额/兑换比例)，按整数糖豆折算
    candyDiscount() {
      if (!this.candySupported) return 0
      const usable = Math.floor(Math.min(this.memberCandy, this.candyMaxDiscount * this.candyRate))
      return Math.round((usable / this.candyRate) * 100) / 100
    },
    // 合计 = 商品金额 − 糖豆抵扣 + 运费（不发地区保持商品金额，提交会被拦截）
    payableTotal() {
      const freight = (this.freightQuote && this.freightQuote.shippable !== false) ? Number(this.freightQuote.freight) || 0 : 0
      const discount = (this.candySupported && this.useCandy) ? this.candyDiscount : 0
      return Math.max(0, this.totalAmount - discount) + freight
    },
    canSubmit() {
      return !this.freightQuote || this.freightQuote.shippable !== false
    }
  },
  onLoad(options) {
    this.productId = options.productId
    this.skuId = options.skuId
    if (options.quantity) this.quantity = Number(options.quantity) || 1
    if (!isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => this.goBack(), 800)
      return
    }
    this.loadProduct()
    this.loadCandyInfo()
  },
  // 从地址列表/新增页返回时刷新当前选中地址，并重算运费
  onShow() {
    loadAddresses(true).then(() => {
      this.address = getSelectedAddress()
      this.loadFreightQuote()
    })
  },
  methods: {
    async loadProduct() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/products/' + this.productId)
        this.product = resp
        this.sku = (resp.skus || []).find(s => String(s.id) === String(this.skuId)) || null
        this.loadFreightQuote()
      } catch (e) {
        console.error('加载商品失败:', e)
        this.sku = null
      } finally {
        this.loading = false
      }
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    // 糖豆信息：会员持有量 + 全局兑换比例
    async loadCandyInfo() {
      try {
        const [profile, cfg] = await Promise.all([
          get('/api/wxapp/member/profile'),
          get('/api/wxapp/candy-config')
        ])
        this.memberCandy = (profile.member && profile.member.candy) || 0
        this.candyRate = cfg.exchangeRate || 100
      } catch (e) { /* 未登录/加载失败时不展示糖豆抵扣 */ }
    },
    toggleCandy() {
      if (!this.candySupported) return
      this.useCandy = !this.useCandy
    },
    changeQty(delta) {
      const next = this.quantity + delta
      if (next < 1 || next > this.sku.stock) return
      this.quantity = next
      this.loadFreightQuote()
    },
    // 运费预览：商品 + 数量 + 收货省份 → 后端实时计算（含不发地区拦截）
    async loadFreightQuote() {
      if (!this.product) return
      const province = (this.address && this.address.province) || ''
      try {
        const q = new URLSearchParams({
          product_id: this.productId,
          sku_id: this.skuId,
          quantity: this.quantity,
          province
        })
        this.freightQuote = await get('/api/wxapp/freight/quote?' + q.toString())
      } catch (e) {
        // 预览失败不阻断下单，后端提交时仍会重算运费
        this.freightQuote = { freight: 0, shippable: true, freeAmount: 0 }
      }
    },
    submitOrder() {
      if (this.submitting) return
      if (!this.address) {
        return uni.showToast({ title: '请先添加收货地址', icon: 'none' })
      }
      if (!this.canSubmit) {
        return uni.showToast({ title: '该地区暂不支持配送', icon: 'none' })
      }
      if (!/^\d{6,11}$/.test((this.address.phone || '').trim())) {
        return uni.showToast({ title: '手机号格式不正确', icon: 'none' })
      }
      this.submitting = true
      // 请求体按后端约定使用 snake_case 字段
      post('/api/wxapp/orders', {
        product_id: Number(this.productId),
        sku_id: Number(this.skuId),
        quantity: this.quantity,
        receiver_name: this.address.name.trim(),
        receiver_phone: this.address.phone.trim(),
        receiver_address: this.fullAddressText,
        // 三级地址显式上传：后端直接按省份匹配运费模板地区规则，不再从地址串反推
        receiver_province: this.address.province || '',
        receiver_city: this.address.city || '',
        receiver_district: this.address.district || '',
        remark: this.form.remark.trim(),
        use_candy: !!(this.candySupported && this.useCandy)
      })
        .then(order => {
          // 下单成功 → 直接调起支付（mock 模拟支付 / real 微信支付）
          this.doPayAfterOrder(order)
        })
        .catch(err => {
          uni.showToast({ title: err.message || '下单失败', icon: 'none' })
        })
        .finally(() => {
          this.submitting = false
        })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    // 下单成功后直接调起支付：mock 环境直接模拟支付成功，real 环境调起微信支付
    async doPayAfterOrder(order) {
      let mode = 'mock'
      try {
        const r = await get('/api/wxapp/config/pay-mode')
        mode = r.mode === 'real' ? 'real' : 'mock'
      } catch (e) {
        mode = 'mock'
      }
      if (mode === 'mock') {
        try {
          await post('/api/wxapp/orders/' + order.orderNo + '/mock-pay')
          uni.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/order-detail/index?orderNo=' + order.orderNo })
          }, 800)
        } catch (e) {
          console.error('模拟支付失败:', e)
          uni.showToast({ title: e.message || '支付失败', icon: 'none' })
          // 支付失败 → 进入支付页继续处理
          setTimeout(() => {
            uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
          }, 800)
        }
        return
      }
      // 真实微信支付：后端下单拿参数 → wx.requestPayment
      try {
        const params = await post('/api/wxapp/orders/' + order.orderNo + '/pay')
        uni.requestPayment({
          provider: 'wxpay',
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
          success: () => {
            uni.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => {
              uni.redirectTo({ url: '/pages/order-detail/index?orderNo=' + order.orderNo })
            }, 800)
          },
          fail: (err) => {
            console.error('调起支付失败:', err)
            uni.showToast({ title: '支付未完成', icon: 'none' })
            setTimeout(() => {
              uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
            }, 800)
          }
        })
      } catch (e) {
        console.error('微信下单失败:', e)
        uni.showToast({ title: e.message || '微信下单失败', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
        }, 800)
      }
    },
    // 进入地址列表选择（参考原型 addressList）
    goAddressList() {
      uni.navigateTo({ url: '/pages/address-list/index?from=confirm' })
    },
    // 进入新增地址页（参考原型 addressAdd）
    goAddressAdd() {
      uni.navigateTo({ url: '/pages/address-add/index' })
    }
  }
}
</script>

<style scoped>
.confirm-page {
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

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

/* 收货地址卡片（参考原型 address-card） */
.addr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.addr-title {
  font-size: 28rpx;
  font-weight: 800;
}
.addr-add {
  font-size: 24rpx;
  color: #15995a;
  font-weight: 600;
}
.addr-body {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-radius: 14rpx;
  background: #f8faf8;
}
.addr-pin {
  font-size: 36rpx;
  color: #15995a;
  flex: none;
}
.addr-main {
  flex: 1;
  min-width: 0;
}
.addr-line1 {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.addr-name {
  font-size: 28rpx;
  font-weight: 700;
}
.addr-tag {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #eaf8ef;
  color: #15995a;
  font-size: 18rpx;
}
.addr-phone {
  font-size: 24rpx;
  color: #7d837f;
}
.addr-detail {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #5d635e;
  line-height: 1.5;
}
.addr-arrow {
  color: #c0c4c0;
  font-size: 34rpx;
  flex: none;
}
.addr-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 24rpx;
  border-radius: 14rpx;
  background: #f8faf8;
}
.addr-empty-text {
  font-size: 26rpx;
  color: #9aa09b;
}
.form-label {
  width: 150rpx;
  flex: none;
  font-size: 26rpx;
  color: #3a3f3b;
}
.form-input {
  flex: 1;
  font-size: 26rpx;
  color: #1f2320;
}

/* 商品信息 */
.goods-row {
  display: flex;
  gap: 20rpx;
}
.goods-img {
  width: 160rpx;
  height: 160rpx;
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
  font-size: 28rpx;
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
.goods-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goods-price {
  color: #ff3b42;
  font-size: 30rpx;
  font-weight: 800;
}
.qty-stepper {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.qty-btn {
  width: 48rpx;
  height: 48rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 8rpx;
  background: #f5f7f4;
  color: #3a3f3b;
  font-size: 30rpx;
}
.qty-btn.disabled {
  opacity: 0.35;
}
.qty-num {
  min-width: 40rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
}
.remark-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f2ef;
}

/* 金额明细 */
.amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #3a3f3b;
}
.amount-row .free {
  color: #15995a;
}
.amount-row .freight-fee {
  color: #1f2320;
  font-weight: 700;
}
.amount-row .noship {
  color: #ff3b42;
  font-weight: 700;
  font-size: 24rpx;
}
.freight-hint {
  font-size: 22rpx;
  color: #15995a;
  padding-bottom: 4rpx;
}
/* 糖豆抵扣行 */
.candy-row {
  border-radius: 12rpx;
  background: #fdf4f7;
  padding: 16rpx 18rpx !important;
  margin: 6rpx 0;
}
.candy-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.candy-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #c2366c;
}
.candy-sub {
  font-size: 20rpx;
  color: #b98a9d;
}
.candy-right {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex: none;
}
.candy-minus {
  color: #e0447f;
  font-size: 26rpx;
  font-weight: 800;
}
.candy-switch {
  width: 76rpx;
  height: 42rpx;
  border-radius: 21rpx;
  background: #d9d9de;
  position: relative;
  transition: background 0.2s;
}
.candy-switch::after {
  content: '';
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
}
.candy-switch.on {
  background: linear-gradient(90deg, #ff8fb2, #e0447f);
}
.candy-switch.on::after {
  left: 38rpx;
}
.amount-row.total {
  margin-top: 8rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f2ef;
  font-weight: 800;
  color: #1f2320;
}
.total-price {
  color: #ff3b42;
  font-size: 30rpx;
  font-weight: 800;
}

.bottom-space {
  height: 160rpx;
}

/* 底部提交栏（居中限宽，适配桌面 H5 手机壳预览） */
.submit-bar {
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
  justify-content: flex-end;
  padding: 0 24rpx;
  gap: 24rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 10;
}
.submit-total {
  display: flex;
  align-items: baseline;
}
.total-label {
  font-size: 24rpx;
  color: #3a3f3b;
}
.total-symbol {
  color: #ff3b42;
  font-size: 26rpx;
  font-weight: 700;
}
.total-big {
  color: #ff3b42;
  font-size: 40rpx;
  font-weight: 800;
}
.submit-btn {
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 56rpx;
  border-radius: 38rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
}
.submit-btn.disabled {
  opacity: 0.6;
}
</style>
