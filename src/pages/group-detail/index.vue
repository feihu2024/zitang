<template>
  <view class="page detail-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">拼团详情</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 加载/异常状态 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!activity" class="page-tip">活动不存在或已下架</view>

    <template v-else>
      <!-- 主图轮播 -->
      <view class="hero-wrap">
        <swiper class="hero-swiper" :current="heroIndex" circular @change="onHeroChange">
          <swiper-item v-for="(img, i) in gallery" :key="i">
            <image :src="img" mode="aspectFill" @tap="previewHero" />
          </swiper-item>
        </swiper>
        <text class="pager">{{ heroIndex + 1 }}/{{ gallery.length }}</text>
      </view>

      <!-- 价格 + 倒计时 -->
      <view class="price-card card">
        <view class="price-left">
          <view class="price-main">
            <text class="currency">¥</text>
            <text class="big-price">{{ groupPriceText }}</text>
            <text class="group-price-label">拼团价</text>
            <text class="group-num">{{ activity.people }}人团</text>
          </view>
          <view class="old" v-if="Number(activity.originalPrice) > 0">¥{{ activity.originalPrice }}　原价</view>
          <text class="detail-title">{{ activity.productName }}</text>
          <view class="detail-tags" v-if="activity.subtitle">
            <text>{{ activity.subtitle }}</text>
          </view>
        </view>
        <view class="price-right">
          <view class="count-title" v-if="activity.status === 'running'">
            <text>距结束</text>
            <text class="time">{{ time[0] }}</text>
            <text>:</text>
            <text class="time">{{ time[1] }}</text>
            <text>:</text>
            <text class="time">{{ time[2] }}</text>
          </view>
          <view class="count-title" v-else-if="activity.status === 'pending'">
            <text>距开始</text>
            <text class="time">{{ time[0] }}</text>
            <text>:</text>
            <text class="time">{{ time[1] }}</text>
            <text>:</text>
            <text class="time">{{ time[2] }}</text>
          </view>
          <view class="count-title ended" v-else>已结束</view>
          <view class="detail-progress">
            <view :style="{ width: progress + '%' }"></view>
          </view>
          <view class="count-note">
            <text>还差 <text class="accent">{{ needJoin }}</text> 人成团</text>
            <text>剩余 <text class="accent">{{ activity.stockLeft }}</text> 份</text>
          </view>
        </view>
      </view>

      <!-- 拼团邀请区 -->
      <view class="join-card card" v-if="recentGroup">
        <view class="join-heading">
          <text>正在拼团中 · <text class="accent">{{ recentGroup.people }}人团</text></text>
          <text class="join-count">已拼 {{ recentGroup.joined }}/{{ recentGroup.people }}</text>
        </view>
        <view class="join-content">
          <view class="member">
            <image :src="leaderAvatar" mode="aspectFill" />
            <text class="leader">团长</text>
            <text>{{ recentGroup.leaderNickname }}</text>
          </view>
          <text class="join-line">······➜</text>
          <view v-for="n in emptySlots" :key="n" class="member empty">
            <view class="empty-slot">?</view>
            <text>待加入</text>
          </view>
          <view class="join-actions">
            <view class="primary-btn invite-btn" @tap="invite">邀请好友参团</view>
            <view class="alone-btn" @tap="buyAlone">单独购买 ¥{{ activity.originalPrice }}</view>
          </view>
        </view>
      </view>
      <view class="join-card card" v-else>
        <view class="join-heading">
          <text>暂无进行中的团，快来开团吧</text>
        </view>
        <view class="join-content">
          <view class="member empty">
            <view class="empty-slot">?</view>
            <text>等你开团</text>
          </view>
          <view class="join-actions">
            <view class="primary-btn invite-btn" @tap="startGroup">立即开团</view>
            <view class="alone-btn" @tap="buyAlone">单独购买 ¥{{ activity.originalPrice }}</view>
          </view>
        </view>
      </view>

      <!-- 已选规格 -->
      <view class="spec card" @tap="openSpecPanel">
        <text class="spec-label muted">已选</text>
        <text class="spec-value">{{ currentSku ? currentSku.skuName : '请选择规格' }}</text>
        <text class="spec-arrow">›</text>
      </view>

      <!-- 活动规则 -->
      <view class="rules card">
        <text class="block-title">活动规则</text>
        <view class="rule-grid">
          <view class="rule-item">
            <text class="rule-value">{{ activity.people }}人团</text>
            <text class="rule-desc">拼团人数</text>
          </view>
          <view class="rule-item">
            <text class="rule-value">{{ activity.duration }}小时</text>
            <text class="rule-desc">拼团有效期</text>
          </view>
          <view class="rule-item">
            <text class="rule-value">{{ activity.autoRefund ? '未成团自动退款' : '未成团不退款' }}</text>
            <text class="rule-desc">货款退至账户余额</text>
          </view>
          <view class="rule-item">
            <text class="rule-value">剩余{{ activity.stockLeft }}份</text>
            <text class="rule-desc">先到先得</text>
          </view>
          <view class="rule-item">
            <text class="rule-value">限购{{ limitText }}</text>
            <text class="rule-desc">活动期间</text>
          </view>
        </view>
      </view>

      <!-- 图文详情 -->
      <view class="story card">
        <view class="story-tabs">
          <text class="story-tab active">商品详情</text>
          <text class="story-tab">图文详情</text>
        </view>
        <rich-text v-if="activity.detailHtml" class="story-html" :nodes="activity.detailHtml"></rich-text>
        <view v-else class="story-empty">暂无图文详情</view>
        <view class="promise-row">
          <view class="promise-item">
            <text class="promise-icon">▣</text>
            <text class="promise-title">极速发货</text>
            <text class="promise-desc">48小时内发货</text>
          </view>
          <view class="promise-item">
            <text class="promise-icon">◇</text>
            <text class="promise-title">正品保障</text>
            <text class="promise-desc">放心购买</text>
          </view>
          <view class="promise-item">
            <text class="promise-icon">盾</text>
            <text class="promise-title">售后无忧</text>
            <text class="promise-desc">未成团自动退款</text>
          </view>
        </view>
      </view>

      <!-- 底部购买栏 -->
      <view class="buy-bar">
        <view class="mini-action" @tap="share">
          <text class="mini-icon">↗</text>
          <text class="mini-label">分享</text>
        </view>
        <view class="mini-action" @tap="service">
          <text class="mini-icon">♧</text>
          <text class="mini-label">客服</text>
        </view>
        <view class="primary-btn buy-btn" :class="{ disabled: !canGroup }" @tap="startGroup">{{ buyBtnText }}</view>
      </view>

      <!-- SKU 选择弹层 -->
      <view class="spec-mask" v-if="showSpec" @tap="closeSpecPanel">
        <view class="spec-panel" @tap.stop>
          <view class="spec-head">
            <image class="spec-thumb" :src="currentSkuImage" mode="aspectFill" />
            <view class="spec-info">
              <view class="spec-price-line">
                <text class="price-symbol">¥</text>
                <text class="price-big">{{ currentSku ? fmtPrice(currentSku.groupPrice) : groupPriceText }}</text>
                <text class="spec-origin" v-if="currentSku && currentSku.originalPrice > 0">¥{{ fmtPrice(currentSku.originalPrice) }}</text>
              </view>
              <text class="spec-stock">{{ currentSku ? (currentSku.stock > 0 ? '库存 ' + currentSku.stock + ' 件 · 限购 ' + currentSku.limit + ' 份/人' : '该规格已售罄') : '请选择规格' }}</text>
            </view>
            <text class="spec-close" @tap="closeSpecPanel">×</text>
          </view>
          <scroll-view class="spec-body" scroll-y>
            <text class="spec-group-name">选择规格</text>
            <view class="spec-options">
              <view
                v-for="sku in activity.skus"
                :key="sku.id"
                class="spec-option"
                :class="{ active: currentSku && currentSku.id === sku.id, disabled: sku.stock <= 0 }"
                @tap="selectSku(sku)"
              >
                <text class="spec-option-name">{{ sku.skuName }}</text>
                <text class="spec-option-price">拼团价 ¥{{ fmtPrice(sku.groupPrice) }}</text>
              </view>
            </view>
          </scroll-view>
          <view class="spec-confirm" @tap="confirmSku">确定</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'
import { getSelectedAddress, loadAddresses, fullAddress } from '@/utils/address.js'

function pad2(n) {
  return n < 10 ? '0' + n : String(n)
}

export default {
  data() {
    return {
      activityId: null,
      groupNo: '', // 分享参团：团号
      activity: null,
      loading: false,
      submitting: false,
      heroIndex: 0,
      time: ['00', '00', '00'],
      countdownTimer: null,
      showSpec: false,
      selectedSkuId: null,
      pendingSpec: false // 底部按钮打开弹层，确定后继续下单
    }
  },
  computed: {
    gallery() {
      if (!this.activity) return []
      const imgs = (this.activity.carousel && this.activity.carousel.length > 0)
        ? this.activity.carousel
        : (this.activity.productCover ? [this.activity.productCover] : [])
      return imgs.map(i => resolveAssetUrl(i))
    },
    groupPriceText() {
      const sku = this.currentSku
      if (sku) return this.fmtPrice(sku.groupPrice)
      return this.fmtPrice(this.activity ? this.activity.groupPrice : 0)
    },
    currentSku() {
      if (!this.activity || !this.activity.skus || this.activity.skus.length === 0) return null
      return this.activity.skus.find(s => String(s.id) === String(this.selectedSkuId)) || this.activity.skus[0] || null
    },
    currentSkuImage() {
      const sku = this.currentSku
      if (sku && sku.image) return resolveAssetUrl(sku.image)
      if (this.gallery.length > 0) return this.gallery[0]
      return '/static/product-bath.jpg'
    },
    recentGroup() {
      return this.activity && this.activity.recentGroup ? this.activity.recentGroup : null
    },
    leaderAvatar() {
      const a = this.recentGroup && this.recentGroup.leaderAvatar
      return a ? resolveAssetUrl(a) : '/static/avatar-leader.jpg'
    },
    // 还差几人成团：有进行中的团按团内已拼人数，无团按活动成团人数
    needJoin() {
      if (!this.activity) return 0
      if (this.recentGroup) return Math.max(this.recentGroup.people - this.recentGroup.joined, 0)
      return this.activity.people
    },
    progress() {
      if (!this.recentGroup) return 0
      return Math.min(Math.round(this.recentGroup.joined / this.recentGroup.people * 100), 100)
    },
    emptySlots() {
      if (!this.recentGroup) return [1]
      const n = Math.max(this.recentGroup.people - this.recentGroup.joined, 0)
      return Array.from({ length: Math.min(n, 3) }, (_, i) => i + 1)
    },
    limitText() {
      const sku = this.currentSku
      const limit = sku ? sku.limit : (this.activity && this.activity.skus && this.activity.skus[0] ? this.activity.skus[0].limit : 1)
      return limit + '份/人'
    },
    buyBtnText() {
      if (!this.activity) return ''
      if (this.activity.status === 'pending') return '即将开始'
      if (this.activity.status === 'ended') return '已结束'
      return '¥' + this.groupPriceText + (this.recentGroup ? ' 去参团' : ' 开团')
    },
    canGroup() {
      return !!this.activity && this.activity.status === 'running' && !this.submitting
    }
  },
  onLoad(options) {
    this.activityId = options.id
    this.groupNo = options.groupNo || ''
    if (this.activityId) this.loadActivity()
    loadAddresses() // 预热地址缓存（开团前需要收货地址）
  },
  onShow() {
    loadAddresses(true) // 从地址页返回时刷新
  },
  onUnload() {
    this.stopCountdown()
  },
  methods: {
    async loadActivity() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/group-buy/' + this.activityId)
        this.activity = resp
        this.selectedSkuId = resp.skus && resp.skus.length > 0 ? resp.skus[0].id : null
        this.startCountdown()
      } catch (e) {
        console.error('加载拼团详情失败:', e)
        this.activity = null
      } finally {
        this.loading = false
      }
    },
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    // 倒计时：running 距结束 / pending 距开始
    startCountdown() {
      this.stopCountdown()
      if (!this.activity) return
      const target = this.activity.status === 'pending' ? this.activity.startTime : this.activity.endTime
      if (!target) return
      const tick = () => {
        const diff = new Date(target.replace(/-/g, '/')).getTime() - Date.now()
        if (diff <= 0) {
          this.time = ['00', '00', '00']
          this.stopCountdown()
          if (this.activity.status === 'running') this.activity.status = 'ended'
          return
        }
        const total = Math.floor(diff / 1000)
        const h = Math.floor(total / 3600)
        const m = Math.floor((total % 3600) / 60)
        const s = total % 60
        this.time = [h > 99 ? String(h) : pad2(h), pad2(m), pad2(s)]
      }
      tick()
      this.countdownTimer = setInterval(tick, 1000)
    },
    stopCountdown() {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer)
        this.countdownTimer = null
      }
    },
    onHeroChange(e) {
      this.heroIndex = e.detail.current
    },
    previewHero() {
      uni.previewImage({ urls: this.gallery, current: this.heroIndex })
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.redirectTo({ url: '/pages/group/index' })
      }
    },
    // ---- 规格选择 ----
    openSpecPanel() {
      this.pendingSpec = false
      this.showSpec = true
    },
    closeSpecPanel() {
      this.showSpec = false
      this.pendingSpec = false
    },
    selectSku(sku) {
      if (sku.stock <= 0) return
      this.selectedSkuId = sku.id
    },
    confirmSku() {
      this.showSpec = false
      // 从底部按钮进入且已选规格 → 继续开团/参团
      if (this.pendingSpec && this.currentSku) {
        this.pendingSpec = false
        this.startGroup()
      }
    },
    // ---- 开团 / 参团 ----
    async startGroup() {
      if (!this.canGroup) return
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/profile/index' })
        }, 800)
        return
      }
      const sku = this.currentSku
      if (!sku) {
        this.pendingSpec = true
        this.showSpec = true
        return
      }
      if (sku.stock <= 0) {
        return uni.showToast({ title: '该规格已售罄', icon: 'none' })
      }
      const address = await this.ensureAddress()
      if (!address) {
        uni.showModal({
          title: '提示',
          content: '请先添加收货地址',
          confirmText: '去添加',
          success: (res) => {
            if (res.confirm) uni.navigateTo({ url: '/pages/address-add/index' })
          }
        })
        return
      }
      const isJoin = !!this.groupNo
      uni.showModal({
        title: isJoin ? '确认参团' : '确认开团',
        content: `将以拼团价 ¥${this.fmtPrice(sku.groupPrice)} ${isJoin ? '参与' : '发起'} ${this.activity.people} 人团，${this.activity.duration} 小时内未成团${this.activity.autoRefund ? '货款自动退至余额' : ''}。`,
        confirmText: '确认',
        success: (res) => {
          if (res.confirm) this.submitGroupOrder()
        }
      })
    },
    // 确保地址缓存已就绪：本地无选中地址时向后端拉一次再判断
    async ensureAddress() {
      let address = getSelectedAddress()
      if (!address) {
        await loadAddresses(true)
        address = getSelectedAddress()
      }
      return address
    },
    submitGroupOrder() {
      if (this.submitting) return
      const sku = this.currentSku
      const address = getSelectedAddress()
      if (!sku || !address) return
      this.submitting = true
      // 请求体按后端约定：开团 group_no 为空，参团传团号
      post('/api/wxapp/group-buy/orders', {
        activity_id: Number(this.activity.id),
        sku_id: Number(sku.id),
        quantity: 1,
        group_no: this.groupNo || '',
        receiver_name: address.name.trim(),
        receiver_phone: address.phone.trim(),
        receiver_address: fullAddress(address),
        receiver_province: address.province || '',
        receiver_city: address.city || '',
        receiver_district: address.district || '',
        remark: ''
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
            console.error('微信支付失败:', err)
            setTimeout(() => {
              uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
            }, 800)
          }
        })
      } catch (e) {
        console.error('发起支付失败:', e)
        uni.showToast({ title: e.message || '支付失败', icon: 'none' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/order-pay/index?orderNo=' + order.orderNo })
        }, 800)
      }
    },
    // ---- 邀请 / 单独购买 / 分享 / 客服 ----
    invite() {
      uni.showToast({ title: '邀请卡已生成，分享给好友吧', icon: 'none' })
      if (typeof uni.showShareMenu === 'function') {
        uni.showShareMenu({ withShareTicket: true })
      }
    },
    buyAlone() {
      if (!this.activity || !this.activity.productId) {
        return uni.showToast({ title: '商品信息缺失', icon: 'none' })
      }
      uni.navigateTo({ url: '/pages/product-detail/index?id=' + this.activity.productId })
    },
    share() {
      uni.showToast({ title: '请点击右上角分享', icon: 'none' })
    },
    service() {
      uni.showModal({
        title: '在线客服',
        content: '客服在线时间：9:00–21:00',
        showCancel: false
      })
    }
  },
  // 分享带团号：好友通过分享进入直接参团
  onShareAppMessage() {
    if (!this.activity) return {}
    let path = '/pages/group-detail/index?id=' + this.activity.id
    if (this.recentGroup && this.recentGroup.groupNo) {
      path += '&groupNo=' + this.recentGroup.groupNo
    }
    return {
      title: this.activity.shareTitle || `${this.activity.people}人团拼团价¥${this.groupPriceText}，${this.activity.productName}`,
      path,
      // 分享图：活动配置封面优先，回退商品轮播首图；微信仅接受网络图
      imageUrl: resolveAssetUrl(this.activity.shareImage) || this.gallery[0] || ''
    }
  }
}
</script>

<style scoped>
.detail-page {
  padding-bottom: calc(146rpx + env(safe-area-inset-bottom));
  background: #fafafa;
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

/* 主图轮播 */
.hero-wrap {
  height: 350rpx;
  position: relative;
}
.hero-swiper {
  width: 100%;
  height: 100%;
}
.hero-wrap image {
  width: 100%;
  height: 100%;
}
.pager {
  position: absolute;
  right: 22rpx;
  bottom: 18rpx;
  padding: 7rpx 15rpx;
  border-radius: 24rpx;
  background: rgba(0, 0, 0, 0.38);
  color: #fff;
  font-size: 22rpx;
}

/* 价格卡 */
.price-card {
  margin: -6rpx 20rpx 22rpx;
  padding: 28rpx 26rpx;
  display: flex;
  position: relative;
  z-index: 2;
}
.price-left {
  width: 60%;
}
.price-main {
  display: flex;
  align-items: center;
  gap: 9rpx;
}
.currency {
  color: #f3262d;
  font-size: 32rpx;
}
.big-price {
  font-size: 60rpx;
  color: #ee2028;
  font-weight: 800;
}
.group-price-label {
  padding: 4rpx 9rpx;
  border-radius: 8rpx;
  background: #ff3b42;
  color: #fff;
  font-size: 19rpx;
}
.group-num {
  padding: 8rpx 17rpx;
  margin-left: 5rpx;
  border-radius: 24rpx;
  background: #fff0ef;
  color: #ef3035;
  font-size: 23rpx;
}
.old {
  margin-top: 7rpx;
  color: #969a97;
  font-size: 20rpx;
  text-decoration: line-through;
}
.detail-title {
  display: block;
  margin-top: 26rpx;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.4;
}
.detail-tags {
  display: flex;
  gap: 14rpx;
  margin-top: 18rpx;
}
.detail-tags text {
  padding: 7rpx 16rpx;
  border-radius: 20rpx;
  background: #f2f3f2;
  color: #6f7470;
  font-size: 20rpx;
}
.price-right {
  width: 40%;
  padding-top: 14rpx;
}
.count-title {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  font-size: 18rpx;
}
.count-title.ended {
  justify-content: flex-end;
  color: #999;
  font-size: 26rpx;
  font-weight: 700;
}
.time {
  padding: 7rpx;
  background: #ff3b42;
  color: #fff;
  border-radius: 6rpx;
  font-weight: 700;
  font-size: 22rpx;
}
.detail-progress {
  height: 8rpx;
  margin: 18rpx 0 11rpx;
  background: #ffe0e1;
  border-radius: 8rpx;
  overflow: hidden;
}
.detail-progress view {
  height: 100%;
  background: #ff3b42;
  border-radius: 8rpx;
  transition: width 0.3s;
}
.count-note {
  display: flex;
  justify-content: space-between;
  font-size: 18rpx;
  color: #555;
}
.accent {
  color: #ff4b1f;
}

/* 拼团邀请区 */
.join-card {
  margin: 0 20rpx 22rpx;
  padding: 24rpx 24rpx;
  background: linear-gradient(180deg, #fff5ef, #fff);
}
.join-heading {
  display: flex;
  align-items: center;
  font-size: 29rpx;
  font-weight: 700;
}
.join-count {
  margin-left: auto;
  font-size: 22rpx;
  font-weight: 400;
  color: #888;
}
.join-content {
  margin-top: 22rpx;
  padding: 22rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
}
.member {
  width: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  font-size: 17rpx;
  text-align: center;
}
.member image,
.empty-slot {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
}
.leader {
  position: absolute;
  top: 52rpx;
  padding: 2rpx 7rpx;
  background: #ff4a2d;
  color: #fff;
  border-radius: 8rpx;
  font-size: 15rpx;
}
.member > text:last-child {
  margin-top: 12rpx;
  white-space: nowrap;
}
.join-line {
  color: #aaa;
  font-size: 19rpx;
}
.empty-slot {
  line-height: 68rpx;
  text-align: center;
  border: 2rpx dashed #bbb;
  color: #aaa;
  font-size: 30rpx;
}
.join-actions {
  margin-left: auto;
  width: 220rpx;
}
.invite-btn {
  height: 53rpx;
  line-height: 53rpx;
  font-size: 23rpx;
}
.alone-btn {
  height: 45rpx;
  line-height: 43rpx;
  margin-top: 10rpx;
  border: 1rpx solid #777;
  border-radius: 26rpx;
  text-align: center;
  font-size: 20rpx;
  color: #555;
}

/* 已选规格 */
.spec {
  margin: 0 20rpx 22rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 25rpx;
}
.spec-label {
  color: #999;
  flex: none;
}
.spec-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spec-arrow {
  font-size: 38rpx;
  color: #ccc;
}

/* 活动规则 */
.rules {
  margin: 0 20rpx 22rpx;
  padding: 26rpx 24rpx;
}
.block-title {
  font-size: 29rpx;
  font-weight: 700;
}
.rule-grid {
  display: flex;
  margin-top: 26rpx;
}
.rule-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 8rpx;
  border-right: 1rpx solid #eee;
  text-align: center;
}
.rule-item:last-child {
  border-right: 0;
}
.rule-value {
  color: #202322;
  font-size: 22rpx;
  font-weight: 500;
  white-space: nowrap;
}
.rule-desc {
  margin-top: 12rpx;
  color: #858a86;
  font-size: 19rpx;
}

/* 图文详情 */
.story {
  margin: 0 20rpx;
  padding: 18rpx;
  overflow: hidden;
}
.story-tabs {
  display: flex;
  justify-content: center;
  gap: 115rpx;
  margin-bottom: 17rpx;
  font-size: 28rpx;
}
.story-tab {
  padding: 0 0 11rpx;
  color: #555;
}
.story-tab.active {
  color: var(--red);
  font-weight: 700;
  border-bottom: 5rpx solid var(--red);
}
.story-html {
  display: block;
  width: 100%;
}
.story-html ::v-deep img {
  max-width: 100%;
}
.story-empty {
  padding: 60rpx 0;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}
.promise-row {
  margin-top: 15rpx;
  padding: 13rpx;
  background: #fff8f2;
  border-radius: 16rpx;
  display: flex;
}
.promise-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rpx;
  border-right: 1rpx solid #eadacb;
}
.promise-item:last-child {
  border-right: 0;
}
.promise-icon {
  color: #a66d3b;
  font-size: 24rpx;
}
.promise-title {
  font-size: 20rpx;
}
.promise-desc {
  color: #7b7d7b;
  font-size: 16rpx;
}

/* 底部购买栏 */
.buy-bar {
  position: fixed;
  left: 50%;
  right: auto;
  bottom: 0;
  z-index: 20;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  height: calc(120rpx + env(safe-area-inset-bottom));
  padding: 15rpx 22rpx env(safe-area-inset-bottom);
  background: #fff;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}
.mini-action {
  width: 68rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 18rpx;
  color: #555;
}
.mini-icon {
  font-size: 34rpx;
}
.buy-btn {
  flex: 1;
  height: 78rpx;
  line-height: 78rpx;
  font-size: 31rpx;
}
.buy-btn.disabled {
  opacity: 0.5;
}

/* 规格选择弹层（居中限宽，适配桌面 H5 手机壳预览） */
.spec-mask {
  position: fixed;
  left: 50%;
  right: auto;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}
.spec-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.spec-head {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f2ef;
}
.spec-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f2f5f1;
  flex: none;
}
.spec-info {
  flex: 1;
  min-width: 0;
}
.spec-price-line {
  display: flex;
  align-items: baseline;
}
.price-symbol {
  color: #ee2028;
  font-size: 28rpx;
  font-weight: 700;
}
.price-big {
  color: #ee2028;
  font-size: 44rpx;
  font-weight: 800;
}
.spec-origin {
  margin-left: 12rpx;
  color: #999;
  font-size: 22rpx;
  text-decoration: line-through;
}
.spec-stock {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9aa09b;
}
.spec-close {
  font-size: 40rpx;
  color: #c0c4c0;
  padding: 0 8rpx;
}
.spec-body {
  flex: 1;
  overflow: hidden;
  max-height: 40vh;
  padding-top: 24rpx;
}
.spec-group-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}
.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.spec-option {
  width: calc(50% - 7rpx);
  box-sizing: border-box;
  padding: 14rpx 20rpx;
  border-radius: 10rpx;
  background: #f5f7f4;
  border: 1rpx solid #f5f7f4;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.spec-option.active {
  background: #fff0ef;
  border-color: #ff3b42;
}
.spec-option.disabled {
  opacity: 0.45;
}
.spec-option-name {
  font-size: 24rpx;
  color: #3a3f3b;
  font-weight: 600;
}
.spec-option.active .spec-option-name {
  color: #ef3035;
}
.spec-option-price {
  font-size: 20rpx;
  color: #9aa09b;
}
.spec-confirm {
  margin-top: 20rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  background: linear-gradient(90deg, #ff6b25, #ff3b42);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
