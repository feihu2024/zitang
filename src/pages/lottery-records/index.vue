<template>
  <view class="page records-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">中奖记录</text>
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

    <!-- 未登录提示 -->
    <view v-if="!loggedIn" class="record-empty-wrap">
      <text>登录后查看抽奖记录</text>
      <view class="record-login-btn" @tap="goLogin">去登录</view>
    </view>

    <!-- 记录列表 -->
    <view v-else class="record-list">
      <view v-if="loading" class="record-empty">正在加载…</view>
      <view v-else-if="filteredRecords.length === 0" class="record-empty">暂无抽奖记录～</view>

      <view
        v-for="item in filteredRecords"
        :key="item.recordNo"
        class="record card"
        :class="recordClass(item)"
      >
        <view class="record-icon">
          <image v-if="item.prizeImage" class="icon-img" :src="resolveAssetUrl(item.prizeImage)" mode="aspectFill" />
          <text v-else class="icon-emoji">{{ item.prizeIcon || '🍀' }}</text>
          <text class="icon-type">{{ typeText(item) }}</text>
        </view>
        <view class="record-main">
          <text class="record-title ellipsis">{{ item.prizeName }}</text>
          <text class="record-code">记录编号：{{ item.recordNo }}</text>
          <text class="record-date">中奖时间：{{ item.createdAt }}</text>
          <text class="record-activity">活动：{{ item.activityName }}</text>
        </view>
        <view class="record-side">
          <text class="status" :class="statusClass(item)">{{ statusText(item) }}</text>
          <view
            v-if="recordAction(item)"
            class="record-btn"
            :class="{ primary: item.state === 'pending_address' }"
            @tap.stop="onAction(item)"
          >{{ recordAction(item) }}</view>
        </view>
        <view v-if="recordNote(item)" class="record-note">{{ recordNote(item) }}</view>
      </view>

      <view v-if="!loading && filteredRecords.length > 0" class="no-more">没有更多了</view>
    </view>

    <!-- 实物奖品收货地址弹层 -->
    <view v-if="addressSheet.show" class="address-overlay" @tap="addressSheet.show = false">
      <view class="address-sheet" @tap.stop>
        <view class="sheet-head">
          <text>填写收货地址</text>
          <text class="sheet-close" @tap="addressSheet.show = false">×</text>
        </view>
        <view class="sheet-field">
          <text class="sheet-label">收货人</text>
          <input v-model="addressSheet.name" placeholder="请输入收货人姓名" />
        </view>
        <view class="sheet-field">
          <text class="sheet-label">手机号</text>
          <input v-model="addressSheet.phone" type="number" maxlength="11" placeholder="请输入手机号" />
        </view>
        <view class="sheet-field">
          <text class="sheet-label">详细地址</text>
          <textarea v-model="addressSheet.address" placeholder="省市区 + 详细地址" />
        </view>
        <button class="sheet-submit" @tap="submitAddress">提交并创建发货订单</button>
      </view>
    </view>
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

export default {
  data() {
    return {
      loggedIn: false,
      loading: false,
      currentTab: 0,
      tabs: ['全部', '待领取', '已发放', '未中奖'],
      records: [],
      addressSheet: { show: false, recordId: null, name: '', phone: '', address: '' }
    }
  },
  computed: {
    filteredRecords() {
      if (this.currentTab === 1) return this.records.filter(r => r.state === 'pending_address')
      if (this.currentTab === 2) return this.records.filter(r => r.state === 'granted')
      if (this.currentTab === 3) return this.records.filter(r => r.state === 'missed')
      return this.records
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
      if (pages.length > 1) uni.navigateBack()
      else uni.redirectTo({ url: '/pages/profile/index' })
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/profile/index' })
    },
    setTab(idx) {
      this.currentTab = idx
    },
    async loadRecords() {
      this.loading = true
      try {
        const res = await get('/api/wxapp/lottery/records', { tab: 'all' })
        this.records = res.items || []
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    typeText(item) {
      return { points: '积分', balance: '余额', physical: '实物', empty: '未中奖' }[item.prizeType] || ''
    },
    statusText(item) {
      if (item.state === 'pending_address') return '待填地址'
      if (item.state === 'missed') return '未中奖'
      if (item.prizeType === 'physical') return item.shipStatus || '待发货'
      return '已发放'
    },
    statusClass(item) {
      if (item.state === 'pending_address') return 'claim'
      if (item.state === 'missed') return 'missed'
      return 'granted'
    },
    recordClass(item) {
      return item.state === 'pending_address' ? 'claim' : ''
    },
    recordAction(item) {
      if (item.state === 'pending_address') return '填写地址'
      if (item.state === 'granted' && item.prizeType === 'physical' && item.orderNo) return '查看订单'
      return ''
    },
    recordNote(item) {
      if (item.state === 'pending_address') return '请尽快填写收货地址，便于我们安排发货'
      if (item.prizeType === 'points') return '积分已自动到账，可在积分明细中查看'
      if (item.prizeType === 'balance') return '余额已自动到账，可在资金明细中查看'
      if (item.state === 'granted' && item.prizeType === 'physical') return '实物奖品已创建订单，商家将尽快发货'
      return ''
    },
    onAction(item) {
      if (item.state === 'pending_address') {
        this.addressSheet = { show: true, recordId: item.id, name: '', phone: '', address: '' }
      } else if (item.orderNo) {
        uni.navigateTo({ url: '/pages/order-detail/index?orderNo=' + item.orderNo })
      }
    },
    async submitAddress() {
      const { recordId, name, phone, address } = this.addressSheet
      if (!recordId) return uni.showToast({ title: '记录异常，请刷新重试', icon: 'none' })
      if (!name.trim()) return uni.showToast({ title: '请填写收货人', icon: 'none' })
      if (!/^1\d{10}$/.test(phone.trim())) return uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
      if (address.trim().length < 5) return uni.showToast({ title: '请填写详细地址', icon: 'none' })
      try {
        await post('/api/wxapp/lottery/records/' + recordId + '/address', {
          receiver_name: name.trim(),
          receiver_phone: phone.trim(),
          receiver_address: address.trim()
        })
        this.addressSheet.show = false
        uni.showToast({ title: '地址已提交，奖品将尽快发货', icon: 'success' })
        this.loadRecords()
      } catch (e) {
        uni.showToast({ title: e.message || '提交失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #fff9f5;
  padding-bottom: 60rpx;
}
.white { background: #fff; }

/* 导航栏 */
.nav-bar {
  height: 88rpx;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  position: relative;
  background: #fff;
}
.nav-back { font-size: 52rpx; font-weight: 300; color: #1c1c1e; line-height: 1; }
.nav-title {
  position: absolute; left: 50%; transform: translateX(-50%);
  font-size: 34rpx; font-weight: 700; color: #1c1c1e;
}
.capsule { margin-left: auto; font-size: 28rpx; color: rgba(0,0,0,.4); }

/* Tab */
.record-tabs {
  display: flex;
  padding: 20rpx 30rpx 12rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0e8e2;
}
.record-tab {
  margin-right: 44rpx;
  padding-bottom: 12rpx;
  font-size: 27rpx;
  color: #8e8e93;
  position: relative;
}
.record-tab.active {
  color: #f23326;
  font-weight: 700;
}
.record-tab.active::after {
  content: '';
  position: absolute;
  left: 50%; bottom: 0;
  width: 36rpx; height: 6rpx;
  transform: translateX(-50%);
  border-radius: 4rpx;
  background: #f23326;
}

/* 列表 */
.record-list { padding: 2rpx 20rpx; }
.record-empty { padding: 120rpx 0; text-align: center; color: #999; font-size: 26rpx; }
.record-empty-wrap { padding: 120rpx 0; text-align: center; color: #999; font-size: 26rpx; }
.record-login-btn {
  width: 200rpx; height: 72rpx;
  margin: 30rpx auto 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 36rpx;
  background: linear-gradient(90deg, #ff5c32, #ef1f20);
  color: #fff; font-size: 26rpx; font-weight: 700;
}

.record {
  margin-top: 16rpx;
  padding: 20rpx;
  /* 兼容性：flex-wrap 替代 grid，低版本 WebView 支持更稳 */
  display: flex; flex-wrap: wrap; align-items: flex-start;
  border: 1rpx solid #fae6d8;
}

/* 奖品图标块 */
.record-icon {
  width: 150rpx; height: 150rpx;
  margin-right: 16rpx;
  border-radius: 24rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(145deg, #fff8ea, #ffe7bd);
  box-sizing: border-box;
}
.icon-emoji { font-size: 52rpx; }
.icon-img { width: 88rpx; height: 88rpx; border-radius: 16rpx; }
.icon-type {
  margin-top: 8rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  background: #fff; color: #c83d23;
  font-size: 16rpx; font-weight: 700;
}

/* 中部文案 */
.record-main { flex: 1; min-width: 0; padding-top: 6rpx; }
.record-title { display: block; font-size: 28rpx; font-weight: 700; color: #1c1c1e; margin-bottom: 16rpx; }
.record-code, .record-date, .record-activity {
  display: block;
  margin-bottom: 10rpx;
  color: #78706c; font-size: 19rpx;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 右侧状态 */
.record-side {
  width: 150rpx;
  margin-left: 16rpx;
  padding-top: 6rpx;
  display: flex; flex-direction: column; align-items: flex-end;
}
.status { font-size: 24rpx; font-weight: 700; }
.status.granted { color: #21a13d; }
.status.claim { color: #ff5c20; }
.status.missed { color: #888; }
.record-btn {
  margin-top: auto;
  min-width: 140rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
  border: 1rpx solid #f34b2e; border-radius: 30rpx;
  color: #f34b2e; font-size: 20rpx;
}
.record-btn.primary {
  border: 0;
  background: linear-gradient(90deg, #ff7731, #f23921);
  color: #fff;
}

/* 底部提示条 */
.record-note {
  width: 100%;
  margin-top: 16rpx;
  padding: 12rpx 18rpx;
  border-radius: 16rpx;
  background: #fff6ed; color: #f06a2c;
  font-size: 18rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  box-sizing: border-box;
}

.no-more { padding: 30rpx 0; text-align: center; color: #b5aca6; font-size: 22rpx; }

/* 地址弹层 */
.address-overlay {
  position: fixed; z-index: 60;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.5);
  display: flex; align-items: flex-end; justify-content: center;
}
.address-sheet {
  width: 100%; max-width: 750rpx;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  background: #fff; border-radius: 32rpx 32rpx 0 0;
  box-sizing: border-box;
}
.sheet-head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 32rpx; font-weight: 700; color: #1c1c1e;
}
.sheet-close { font-size: 44rpx; color: #8e8e93; line-height: 1; }
.sheet-field { margin-top: 24rpx; }
.sheet-label { display: block; font-size: 24rpx; color: #8e8e93; margin-bottom: 10rpx; }
.sheet-field input, .sheet-field textarea {
  width: 100%; min-height: 76rpx;
  padding: 16rpx 20rpx;
  background: #f6f6f8; border-radius: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.sheet-field textarea { height: 140rpx; }
.sheet-submit {
  margin-top: 32rpx;
  border-radius: 44rpx;
  background: linear-gradient(90deg, #ff5c32, #ef1f20);
  color: #fff; font-size: 28rpx; font-weight: 700;
}
</style>
