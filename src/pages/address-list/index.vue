<template>
  <view class="page address-list-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">{{ isManage ? '地址管理' : '地址列表' }}</text>
      <view class="capsule">••· ◎</view>
    </view>

    <view class="page-tip-text">{{ isManage ? '管理常用收货地址，下单时可直接选择' : '请选择本次订单的收货地址' }}</view>

    <!-- 地址列表 -->
    <view v-if="addresses.length > 0" class="addr-list">
      <view
        v-for="item in addresses"
        :key="item.id"
        class="addr-card card"
        :class="{ active: String(currentId) === String(item.id) }"
      >
        <view class="addr-select" @tap="selectAddress(item)">
          <view class="addr-radio">
            <text v-if="String(currentId) === String(item.id)">✓</text>
          </view>
          <view class="addr-main">
            <view class="addr-line1">
              <text class="addr-name">{{ item.name }}</text>
              <text class="addr-tag" v-if="item.isDefault">默认</text>
              <text class="addr-phone">{{ item.phone }}</text>
            </view>
            <text class="addr-detail">{{ fullAddress(item) }}</text>
          </view>
        </view>
        <view class="addr-actions">
          <text
            class="addr-action"
            :class="{ checked: String(currentId) === String(item.id) }"
            @tap="makeDefault(item)"
          >{{ item.isDefault ? '默认地址' : '设为默认' }}</text>
          <text class="addr-action edit" @tap="editAddress(item)">编辑</text>
          <text class="addr-action del" @tap="removeItem(item)">删除</text>
        </view>
      </view>
    </view>
    <view v-else class="addr-empty">
      <text class="addr-empty-icon">⌖</text>
      <text class="addr-empty-text">还没有收货地址</text>
      <text class="addr-empty-sub">添加地址后下单更方便</text>
    </view>

    <view class="bottom-space"></view>

    <!-- 底部操作栏：管理模式只保留新增，下单选地址时才有确认按钮 -->
    <view class="addr-footer">
      <view class="footer-add" :class="{ primary: isManage }" @tap="goAdd">＋ 新增地址</view>
      <view v-if="!isManage" class="footer-confirm" :class="{ disabled: !currentId }" @tap="confirmSelect">确认选择</view>
    </view>
  </view>
</template>

<script>
import {
  loadAddresses,
  getSelectedAddress,
  setDefaultAddress,
  removeAddress,
  setSelectedAddressId,
  fullAddress
} from '@/utils/address.js'

export default {
  data() {
    return {
      addresses: [],
      currentId: null,
      // select=下单选地址（默认） manage=个人中心地址管理
      mode: 'select'
    }
  },
  computed: {
    isManage() {
      return this.mode === 'manage'
    }
  },
  onLoad(options) {
    this.mode = options && options.from === 'manage' ? 'manage' : 'select'
    // 地址改从后端拉取（默认地址已置顶）
    this.refresh()
  },
  onShow() {
    // 从新增/编辑页返回时刷新
    this.refresh()
  },
  methods: {
    fullAddress,
    refresh() {
      loadAddresses(true).then((list) => {
        this.addresses = list
        const keep = list.find((a) => String(a.id) === String(this.currentId))
        if (keep) return
        const selected = getSelectedAddress()
        this.currentId = selected ? selected.id : (list[0] ? list[0].id : null)
      })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    },
    selectAddress(item) {
      this.currentId = item.id
    },
    makeDefault(item) {
      if (item.isDefault) return
      setDefaultAddress(item.id)
        .then(() => loadAddresses(true))
        .then((list) => {
          this.addresses = list
          this.currentId = item.id
          uni.showToast({ title: '已设为默认地址', icon: 'none' })
        })
        .catch((err) => {
          uni.showToast({ title: (err && err.message) || '操作失败', icon: 'none' })
        })
    },
    removeItem(item) {
      uni.showModal({
        title: '删除地址',
        content: `确定删除「${item.name} ${fullAddress(item)}」？`,
        confirmColor: '#e64340',
        success: (res) => {
          if (!res.confirm) return
          removeAddress(item.id)
            .then(() => loadAddresses(true))
            .then((list) => {
              this.addresses = list
              if (String(this.currentId) === String(item.id)) {
                this.currentId = list.length ? list[0].id : null
              }
              uni.showToast({ title: '已删除', icon: 'none' })
            })
            .catch((err) => {
              uni.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
            })
        }
      })
    },
    editAddress(item) {
      uni.navigateTo({ url: '/pages/address-add/index?id=' + item.id })
    },
    goAdd() {
      uni.navigateTo({ url: '/pages/address-add/index' })
    },
    confirmSelect() {
      if (!this.currentId) {
        uni.showToast({ title: '请选择收货地址', icon: 'none' })
        return
      }
      setSelectedAddressId(this.currentId)
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.address-list-page {
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

.page-tip-text {
  padding: 24rpx 32rpx 4rpx;
  font-size: 24rpx;
  color: #9aa09b;
}

/* 地址卡片 */
.addr-list {
  padding: 0 24rpx;
}
.addr-card {
  padding: 24rpx 28rpx;
  border: 2rpx solid transparent;
}
.addr-card.active {
  border-color: #27b969;
}
.addr-select {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.addr-radio {
  width: 40rpx;
  height: 40rpx;
  flex: none;
  border-radius: 50%;
  border: 2rpx solid #d5dad6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
}
.addr-card.active .addr-radio {
  background: #27b969;
  border-color: #27b969;
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
.addr-actions {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2ef;
  display: flex;
  justify-content: flex-end;
  gap: 40rpx;
}
.addr-action {
  font-size: 24rpx;
  color: #5d635e;
}
.addr-action.checked {
  color: #15995a;
}
.addr-action.edit {
  color: #15995a;
}
.addr-action.del {
  color: #e64340;
}

/* 空状态 */
.addr-empty {
  padding: 140rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.addr-empty-icon {
  font-size: 80rpx;
  color: #d5dad6;
}
.addr-empty-text {
  font-size: 28rpx;
  color: #5d635e;
  font-weight: 600;
}
.addr-empty-sub {
  font-size: 22rpx;
  color: #9aa09b;
}

.bottom-space {
  height: 160rpx;
}

/* 底部操作栏（居中限宽，适配桌面 H5 手机壳预览） */
.addr-footer {
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
.footer-add {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  background: #f5f7f4;
  color: #3a3f3b;
  font-size: 26rpx;
  font-weight: 600;
}
/* 管理模式下新增是唯一主操作，用主色按钮 */
.footer-add.primary {
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
}
.footer-confirm {
  flex: 1.4;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
.footer-confirm.disabled {
  opacity: 0.5;
}
</style>
