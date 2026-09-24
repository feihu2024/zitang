<template>
  <view class="page profile-page">
    <view class="safe-top"></view>
    <view class="profile-shell">

      <!-- ===== 未登录：登录入口卡片（点击弹出底部登录弹窗） ===== -->
      <view v-if="!member" class="member-card card login-card" @tap="openLoginPop">
        <view class="leaf leaf-a"></view>
        <view class="leaf leaf-b"></view>
        <view class="login-entry">
          <view class="css-avatar login-avatar">
            <text class="avatar-text">植</text>
          </view>
          <view class="login-entry-copy">
            <view class="login-title">植萃生活</view>
            <view class="login-sub">登录后解锁拼团 / 秒杀 / 会员权益</view>
            <view v-if="inviteCode" class="invite-tip">
              🎁 检测到好友邀请码 {{ inviteCode }}，注册后自动绑定推荐关系
            </view>
          </view>
          <view class="login-entry-btn">登录 ›</view>
        </view>
      </view>

      <!-- ===== 已登录：会员卡片区 ===== -->
      <view v-else class="member-card card">
        <view class="leaf leaf-a"></view>
        <view class="leaf leaf-b"></view>
        <view class="member-edit" @tap="openEdit">✎</view>

        <view class="member-profile">
          <image v-if="member.avatarUrl" class="wx-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="css-avatar">
            <text class="avatar-text">{{ avatarText }}</text>
            <text class="avatar-badge">VIP</text>
          </view>
          <view class="member-copy">
            <view class="member-name">{{ member.nickname || '微信用户' }} <text>❧</text></view>
            <text class="vip-pill">VIP{{ member.level }}　{{ levelName }}</text>
            <text v-if="member.phone" class="member-phone">☎　{{ maskPhone(member.phone) }}</text>
            <view v-else class="phone-bind-row">
              <!-- #ifdef MP-WEIXIN -->
              <button v-if="phoneMode === 'real'" class="mini-btn" open-type="getPhoneNumber"
                @getphonenumber="onGetPhone">
                授权微信手机号
              </button>
              <button v-else class="mini-btn" @tap="openPhonePop">绑定手机号</button>
              <!-- #endif -->
              <!-- #ifdef H5 -->
              <button class="mini-btn" @tap="openPhonePop">绑定手机号</button>
              <!-- #endif -->
            </view>
            <text class="member-id">ID：{{ member.id }}　　推荐人：{{ referrerText }}</text>
          </view>
        </view>

        <view class="member-benefit">
          <text class="crown">♛</text>
          <text class="benefit-title">当前权益 · {{ levelName }}</text>
        </view>
      </view>

      <!-- 资产卡片区 -->
      <view class="asset-card card">
        <view class="asset-item" @tap="goBalanceRecords">
          <view class="asset-icon">¥</view>
          <view class="asset-body">
            <text class="asset-label">余额</text>
            <text class="asset-value">¥{{ member ? formatMoney(member.balance) : '0.00' }}</text>
            <text v-if="member && member.frozenBalance > 0" class="asset-frozen">冻结 {{ formatMoney(member.frozenBalance)
            }}</text>
            <text v-else class="asset-frozen-holder">暂无冻结</text>
          </view>
          <text class="asset-arrow">›</text>
        </view>
        <view class="asset-item" @tap="goPointRecords">
          <view class="asset-icon points">●</view>
          <view class="asset-body">
            <text class="asset-label">积分</text>
            <text class="asset-value">{{ member ? formatPoints(member.points) : '0' }}</text>
            <text v-if="member && member.frozenPoints > 0" class="asset-frozen">冻结 {{ member.frozenPoints }}</text>
            <text v-else class="asset-frozen-holder">暂无冻结</text>
          </view>
          <text class="asset-arrow">›</text>
        </view>
        <view class="asset-item" @tap="goCandyRecords">
          <view class="asset-icon candy">🍬</view>
          <view class="asset-body">
            <text class="asset-label">糖豆</text>
            <text class="asset-value candy-val">{{ member ? (member.candy || 0) : '0' }}</text>
            <text class="asset-frozen-holder">可抵现金</text>
          </view>
          <text class="asset-arrow">›</text>
        </view>
      </view>

      <!-- 订单卡片区 -->
      <view class="order-card card">
        <view class="card-heading">
          <text class="heading-title">我的订单</text>
          <text class="heading-more" @tap="goOrders('')">全部订单 ›</text>
        </view>
        <view class="order-grid">
          <view class="order-item" @tap="goOrders('')">
            <view class="order-icon">📦</view>
            <text class="order-label">全部</text>
          </view>
          <view class="order-item" @tap="goOrders('paid')">
            <view class="order-icon">⏳</view>
            <text class="order-label">待发货</text>
          </view>
          <view class="order-item" @tap="goOrders('shipped')">
            <view class="order-icon">🚚</view>
            <text class="order-label">待收货</text>
          </view>
          <view class="order-item" @tap="goOrders('completed')">
            <view class="order-icon">✅</view>
            <text class="order-label">已完成</text>
          </view>
        </view>
      </view>

      <!-- 活动记录快捷入口 -->
      <view class="record-shortcuts card">
        <view class="shortcut-item" @tap="goFlashRecords">
          <text class="shortcut-icon green-bg">⚡</text>
          <view class="shortcut-body">
            <text class="shortcut-title">秒杀记录</text>
            <text class="shortcut-desc">秒杀订单</text>
          </view>
        </view>
        <view class="shortcut-item" @tap="goGroupRecords">
          <text class="shortcut-icon orange-bg">♟</text>
          <view class="shortcut-body">
            <text class="shortcut-title">拼团记录</text>
            <text class="shortcut-desc">拼团订单</text>
          </view>
        </view>
        <view class="shortcut-item" @tap="goLotteryRecords">
          <text class="shortcut-icon purple-bg">🎁</text>
          <view class="shortcut-body">
            <text class="shortcut-title">抽奖记录</text>
            <text class="shortcut-desc">中奖记录</text>
          </view>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-card card">
        <view class="menu-item" @tap="goReferrals">
          <text class="menu-icon">♧</text>
          <text class="menu-label">我的推荐</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goMyPerformance">
          <text class="menu-icon">📈</text>
          <text class="menu-label">我的业绩</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goPointsTransfer">
          <text class="menu-icon">⇄</text>
          <text class="menu-label">积分互转</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goSharePoster">
          <text class="menu-icon">⌯</text>
          <text class="menu-label">分享好友</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goCustomerService">
          <text class="menu-icon">♬</text>
          <text class="menu-label">联系客服</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goAddressList">
          <text class="menu-icon">◎</text>
          <text class="menu-label">地址管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goPrivacy">
          <text class="menu-icon">◇</text>
          <text class="menu-label">隐私协议</text>
          <text class="menu-arrow">›</text>
        </view>
        <view v-if="member" class="menu-item" @tap="onLogout">
          <text class="menu-icon">🚪</text>
          <text class="menu-label" style="color:#c0392b">退出登录</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- ===== 登录弹窗（底部弹出） ===== -->
    <view v-if="loginPop.show" class="pop-mask sheet-mask" @tap="closeLoginPop">
      <view class="login-sheet" @tap.stop>
        <view class="sheet-handle"></view>
        <view class="login-box">
          <view class="css-avatar login-avatar">
            <text class="avatar-text">植</text>
          </view>
          <view class="login-title">植萃生活</view>
          <view class="login-sub">登录后解锁拼团 / 秒杀 / 会员权益</view>

          <view v-if="inviteCode" class="invite-tip">
            🎁 检测到好友邀请码 {{ inviteCode }}，注册后自动绑定推荐关系
          </view>

          <!-- #ifdef MP-WEIXIN -->
          <button class="primary-btn login-btn" :disabled="loading" @tap="onWxLogin">
            {{ loading ? '登录中...' : '微信一键登录' }}
          </button>
          <view class="login-note">登录即代表同意将微信昵称、头像用于会员资料展示</view>
          <!-- #endif -->

          <!-- #ifdef H5 -->
          <view class="h5-form">
            <input class="form-input" v-model="form.nickname" placeholder="请输入昵称" maxlength="20" />
            <input class="form-input" v-model="form.phone" placeholder="手机号（选填）" type="number" maxlength="11" />
            <button class="primary-btn login-btn" :disabled="loading" @tap="onH5Login">
              {{ loading ? '登录中...' : '登录 / 注册' }}
            </button>
            <view class="login-note">H5 环境为模拟登录，微信小程序内打开可使用微信授权登录</view>
          </view>
          <!-- #endif -->
        </view>
      </view>
    </view>

    <!-- ===== 绑定手机号弹窗（模拟模式 / H5）===== -->
    <view v-if="phonePop.show" class="pop-mask" @tap="phonePop.show = false">
      <view class="pop-card" @tap.stop>
        <view class="pop-title">绑定手机号</view>
        <input class="form-input" v-model="phonePop.phone" placeholder="请输入手机号" type="number" maxlength="11" />
        <view class="pop-actions">
          <view class="pop-cancel" @tap="phonePop.show = false">取消</view>
          <view class="pop-ok" @tap="submitPhone">确认绑定</view>
        </view>
      </view>
    </view>

    <!-- ===== 编辑资料弹窗 ===== -->
    <view v-if="editPop.show" class="pop-mask" @tap="editPop.show = false">
      <view class="pop-card" @tap.stop>
        <view class="pop-title">编辑个人资料</view>
        <!-- #ifdef MP-WEIXIN -->
        <view class="edit-row">
          <text class="edit-label">头像</text>
          <button class="avatar-pick-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image v-if="editPop.avatarUrl" class="pick-avatar" :src="editPop.avatarUrl" mode="aspectFill" />
            <text v-else>点击选择</text>
          </button>
        </view>
        <!-- #endif -->
        <view class="edit-row">
          <text class="edit-label">昵称</text>
          <input class="form-input edit-input" :type="isMP ? 'nickname' : 'text'" v-model="editPop.nickname"
            placeholder="微信授权昵称或自定义" maxlength="20" />
        </view>
        <view class="edit-row">
          <text class="edit-label">姓名</text>
          <input class="form-input edit-input" v-model="editPop.realname" placeholder="真实姓名（选填）" maxlength="12" />
        </view>
        <view class="pop-actions">
          <view class="pop-cancel" @tap="editPop.show = false">取消</view>
          <view class="pop-ok" @tap="saveEdit">保存</view>
        </view>
      </view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar current="profile" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'
import {
  isLoggedIn, getCachedMember, fetchProfile, fetchLoginMode,
  wxLogin, h5Login, bindPhone, updateProfile,
  getInviteCode
} from '@/utils/auth.js'
import { clearToken } from '@/utils/api.js'
import { buildSharePath } from '@/utils/share.js'

const LEVEL_NAMES = ['体验会员', '白银会员', '黄金会员', '钻石会员']

export default {
  components: { TabBar },
  data() {
    return {
      isMP: false,
      member: null,
      inviteCode: '',
      loading: false,
      phoneMode: 'mock',
      form: { nickname: '', phone: '' },
      loginPop: { show: false },
      phonePop: { show: false, phone: '' },
      editPop: { show: false, nickname: '', realname: '', avatarUrl: '' }
    }
  },
  computed: {
    levelName() {
      return LEVEL_NAMES[(this.member && this.member.level || 1) - 1] || '体验会员'
    },
    avatarText() {
      const name = (this.member && this.member.nickname) || '会员'
      return name.charAt(0)
    },
    referrerText() {
      const r = this.member && this.member.referrer
      return r ? (r.nickname || '会员') + '（ID:' + r.id + '）' : '—'
    }
  },
  created() {
    // #ifdef MP-WEIXIN
    this.isMP = true
    // #endif
  },
  onShow() {
    this.refresh()
  },
  onPullDownRefresh() {
    this.refresh().finally(() => uni.stopPullDownRefresh())
  },
  onShareAppMessage() {
    return {
      title: '植萃生活 · 我在用，推荐给你',
      path: buildSharePath('/pages/home/index')
    }
  },
  methods: {
    async refresh() {
      this.inviteCode = getInviteCode()
      if (!isLoggedIn()) {
        this.member = null
        this.phoneMode = await fetchLoginMode()
        return
      }
      try {
        this.member = await fetchProfile()
      } catch (e) {
        this.member = null
      }
      this.phoneMode = await fetchLoginMode()
    },

    // ---- 登录弹窗 ----
    openLoginPop() {
      this.loginPop.show = true
    },
    closeLoginPop() {
      this.loginPop.show = false
    },

    // ---- 登录 ----
    async onWxLogin() {
      this.loading = true
      try {
        const res = await wxLogin()
        this.member = res.member
        this.loginPop.show = false
        uni.showToast({ title: res.isNew ? '注册成功' : '登录成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async onH5Login() {
      if (!this.form.nickname.trim()) {
        return uni.showToast({ title: '请输入昵称', icon: 'none' })
      }
      if (this.form.phone && !/^\d{6,11}$/.test(this.form.phone)) {
        return uni.showToast({ title: '手机号格式不正确', icon: 'none' })
      }
      this.loading = true
      try {
        const res = await h5Login({
          nickname: this.form.nickname.trim(),
          phone: this.form.phone.trim()
        })
        this.member = res.member
        this.loginPop.show = false
        uni.showToast({ title: res.isNew ? '注册成功' : '登录成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    // ---- 手机号绑定 ----
    async onGetPhone(e) {
      // 微信 getPhoneNumber 授权回调（真实模式）
      if (!e.detail.code) {
        return uni.showToast({ title: '已取消授权', icon: 'none' })
      }
      try {
        this.member = await bindPhone({ code: e.detail.code })
        uni.showToast({ title: '手机号绑定成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
      }
    },
    openPhonePop() {
      this.phonePop.phone = ''
      this.phonePop.show = true
    },
    async submitPhone() {
      const phone = (this.phonePop.phone || '').trim()
      if (!/^\d{6,11}$/.test(phone)) {
        return uni.showToast({ title: '手机号格式不正确', icon: 'none' })
      }
      try {
        this.member = await bindPhone({ phone })
        this.phonePop.show = false
        uni.showToast({ title: '手机号绑定成功', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '绑定失败', icon: 'none' })
      }
    },

    // ---- 编辑资料 ----
    openEdit() {
      this.editPop.nickname = this.member.nickname || ''
      this.editPop.realname = this.member.realname || ''
      this.editPop.avatarUrl = this.member.avatarUrl || ''
      this.editPop.show = true
    },
    onChooseAvatar(e) {
      this.editPop.avatarUrl = e.detail.avatarUrl
    },
    async saveEdit() {
      const data = {}
      if (this.editPop.nickname.trim()) data.nickname = this.editPop.nickname.trim()
      if (this.editPop.realname.trim()) data.realname = this.editPop.realname.trim()
      if (this.editPop.avatarUrl) data.avatar_url = this.editPop.avatarUrl
      if (!Object.keys(data).length) {
        return uni.showToast({ title: '没有需要保存的内容', icon: 'none' })
      }
      try {
        this.member = await updateProfile(data)
        this.editPop.show = false
        uni.showToast({ title: '已保存', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    },

    // ---- 其他 ----
    maskPhone(phone) {
      if (!phone || phone.length < 7) return phone
      return phone.slice(0, 3) + '****' + phone.slice(-4)
    },
    onLogout() {
      uni.showModal({
        title: '提示',
        content: '确定退出登录吗？',
        success: (r) => {
          if (r.confirm) {
            clearToken()
            this.member = null
            uni.showToast({ title: '已退出登录', icon: 'none' })
          }
        }
      })
    },
    coming(title) {
      uni.showToast({ title: title || '功能即将开放', icon: 'none' })
    },
    goSharePoster() {
      uni.navigateTo({ url: '/pages/share-poster/index' })
    },
    // 隐私协议（无需登录即可查看）
    goPrivacy() {
      uni.navigateTo({ url: '/pages/privacy/index' })
    },
    // 联系客服（无需登录即可查看）
    goCustomerService() {
      uni.navigateTo({ url: '/pages/customer-service/index' })
    },
    // 地址管理（from=manage：只维护地址，不带下单选地址语义）
    goAddressList() {
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => this.openLoginPop(), 600)
        return
      }
      uni.navigateTo({ url: '/pages/address-list/index?from=manage' })
    },
    goReferrals() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/referrals/index' })
    },
    // 我的订单入口（全部 / 待发货=paid / 待收货=shipped / 已完成=completed）
    goOrders(status) {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      const query = status ? '?status=' + status : ''
      uni.navigateTo({ url: '/pages/orders/index' + query })
    },
    goGroupRecords() {
      uni.navigateTo({ url: '/pages/group-records/index' })
    },
    goFlashRecords() {
      uni.navigateTo({ url: '/pages/flash-records/index' })
    },
    goLotteryRecords() {
      uni.navigateTo({ url: '/pages/lottery-records/index' })
    },
    // 资产明细入口（余额/积分，未登录提示）
    goBalanceRecords() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/balance-records/index' })
    },
    goPointRecords() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/point-records/index' })
    },
    // 积分互转入口（仅可转给直推下线）
    goPointsTransfer() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/points-transfer/index' })
    },
    // 糖豆明细入口
    goCandyRecords() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/candy-records/index' })
    },
    // 我的业绩入口（当前级别 + 当日/本月/累计业绩 + 级差收益，未登录提示）
    goMyPerformance() {
      if (!this.member) return uni.showToast({ title: '请先登录', icon: 'none' })
      uni.navigateTo({ url: '/pages/team-incentive/index' })
    },
    formatMoney(v) {
      return Number(v || 0).toFixed(2)
    },
    formatPoints(v) {
      return String(Math.round(Number(v || 0)))
    }
  }
}
</script>

<style scoped>
.profile-page {
  background: linear-gradient(#f5f9f3, #fafafa);
  overflow-x: hidden;
}

.profile-shell {
  padding: 0 28rpx 44rpx;
}

/* ===== 会员卡片 ===== */
.member-card {
  min-height: 372rpx;
  padding: 36rpx 32rpx 28rpx;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #f4fbf2 0%, #e7f5e6 55%, #fafdf9 100%);
  border: 1rpx solid rgba(61, 143, 76, 0.15);
}

.member-card::before {
  content: '';
  position: absolute;
  right: -80rpx;
  top: -110rpx;
  width: 330rpx;
  height: 330rpx;
  border-radius: 50%;
  background: rgba(91, 180, 103, 0.1);
}

.leaf {
  position: absolute;
  width: 82rpx;
  height: 38rpx;
  border-radius: 100% 0 100% 0;
  background: rgba(48, 152, 72, 0.16);
  transform: rotate(-28deg);
}

.leaf-a {
  right: 50rpx;
  top: 55rpx;
}

.leaf-b {
  right: 132rpx;
  top: 27rpx;
  transform: rotate(22deg) scale(0.72);
}

.member-edit {
  position: absolute;
  z-index: 3;
  right: 24rpx;
  top: 24rpx;
  width: 52rpx;
  height: 52rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 50%;
  background: #26974f;
  color: #fff;
  font-size: 26rpx;
}

.member-profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  z-index: 2;
}

.css-avatar {
  width: 132rpx;
  height: 132rpx;
  flex: none;
  border: 8rpx solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(145deg, #d8f0d8, #78bf7c);
  box-shadow: 0 10rpx 28rpx rgba(52, 129, 68, 0.18);
}

.wx-avatar {
  width: 132rpx;
  height: 132rpx;
  flex: none;
  border: 8rpx solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  box-shadow: 0 10rpx 28rpx rgba(52, 129, 68, 0.18);
}

.avatar-text {
  width: 94rpx;
  height: 94rpx;
  line-height: 94rpx;
  text-align: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff, #e5f4e6);
  color: #2b7d3a;
  font-size: 48rpx;
  font-weight: 700;
}

.avatar-badge {
  position: absolute;
  right: -10rpx;
  bottom: 2rpx;
  padding: 5rpx 8rpx;
  border: 4rpx solid #fff;
  border-radius: 18rpx;
  background: #248d46;
  color: #fff;
  font-size: 13rpx;
  font-weight: 800;
}

.member-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.member-name {
  font-size: 36rpx;
  font-weight: 700;
}

.member-name text {
  color: #2f9852;
}

.vip-pill {
  margin-top: 14rpx;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #4ba85d, #237b39);
  color: #fff;
  font-size: 20rpx;
}

.member-phone {
  margin-top: 16rpx;
  font-size: 24rpx;
}

.phone-bind-row {
  margin-top: 14rpx;
}

.mini-btn {
  padding: 8rpx 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #ff8f3c, #ff6b25);
  color: #fff;
  font-size: 21rpx;
  line-height: 1.4;
}

.member-id {
  margin-top: 10rpx;
  color: #5e6f62;
  font-size: 20rpx;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-benefit {
  margin-top: 30rpx;
  padding: 24rpx 26rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: rgba(255, 255, 255, 0.84);
  border: 1rpx solid rgba(76, 143, 78, 0.14);
  position: relative;
  z-index: 2;
}

.crown {
  width: 66rpx;
  height: 66rpx;
  line-height: 66rpx;
  text-align: center;
  flex: none;
  border-radius: 20rpx;
  background: #e9f6e8;
  color: #2c8a43;
  font-size: 44rpx;
}

.benefit-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #2c7a43;
  letter-spacing: 1rpx;
}

/* ===== 登录入口卡片 ===== */
.login-card {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.login-entry {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 14rpx 0 18rpx;
}

.login-entry-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.login-entry-copy .login-title {
  margin-top: 0;
  font-size: 36rpx;
}

.login-entry-copy .login-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
}

.login-entry-copy .invite-tip {
  margin-top: 14rpx;
  padding: 10rpx 16rpx;
  font-size: 20rpx;
}

.login-entry-btn {
  flex: none;
  padding: 16rpx 34rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #3fae57, #237b39);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

.login-box {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 0 16rpx;
}

/* ===== 底部弹窗（登录） ===== */
.sheet-mask {
  align-items: flex-end;
}

.login-sheet {
  width: 100%;
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  padding: 16rpx 36rpx calc(36rpx + env(safe-area-inset-bottom));
  animation: sheet-up 0.3s ease-out;
  max-height: 84vh;
  overflow-y: auto;
}

.sheet-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: #e0e4e0;
  margin: 0 auto 10rpx;
}

.login-sheet .login-box {
  padding: 10rpx 0 16rpx;
}

.login-sheet .login-btn {
  width: 100%;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}

.login-avatar {
  width: 120rpx;
  height: 120rpx;
}

.login-title {
  margin-top: 22rpx;
  font-size: 38rpx;
  font-weight: 800;
  color: #2c7a43;
}

.login-sub {
  margin-top: 12rpx;
  font-size: 23rpx;
  color: #7d837f;
}

.invite-tip {
  margin-top: 24rpx;
  padding: 14rpx 24rpx;
  border-radius: 20rpx;
  background: #fff7ec;
  border: 1rpx solid #ffd9a8;
  color: #b26a12;
  font-size: 22rpx;
}

.login-btn {
  margin-top: 34rpx;
  width: 78%;
  height: 84rpx;
  line-height: 84rpx;
  font-size: 30rpx;
  background: linear-gradient(90deg, #3fae57, #237b39);
}

.login-note {
  margin-top: 20rpx;
  font-size: 20rpx;
  color: #9aa39c;
  text-align: center;
  padding: 0 40rpx;
}

.h5-form {
  width: 82%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.h5-form .login-btn {
  width: 100%;
}

.form-input {
  margin-top: 22rpx;
  height: 82rpx;
  padding: 0 26rpx;
  border-radius: 20rpx;
  background: #fff;
  border: 1rpx solid #dbe7dc;
  font-size: 26rpx;
}

/* ===== 弹窗（居中限宽，适配桌面 H5 手机壳预览） ===== */
.pop-mask {
  position: fixed;
  left: 50%;
  right: auto;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.45);
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pop-card {
  width: 620rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 36rpx 32rpx;
}

.pop-title {
  font-size: 32rpx;
  font-weight: 700;
  text-align: center;
  margin-bottom: 10rpx;
}

.pop-actions {
  margin-top: 36rpx;
  display: flex;
  gap: 24rpx;
}

.pop-cancel,
.pop-ok {
  flex: 1;
  height: 78rpx;
  line-height: 78rpx;
  text-align: center;
  border-radius: 40rpx;
  font-size: 27rpx;
}

.pop-cancel {
  background: #f2f4f2;
  color: #666;
}

.pop-ok {
  background: linear-gradient(90deg, #3fae57, #237b39);
  color: #fff;
  font-weight: 700;
}

.edit-row {
  display: flex;
  align-items: center;
  margin-top: 26rpx;
  gap: 20rpx;
}

.edit-label {
  width: 90rpx;
  font-size: 26rpx;
  color: #555;
  flex: none;
}

.edit-input {
  flex: 1;
  margin-top: 0;
}

.avatar-pick-btn {
  width: 110rpx;
  height: 110rpx;
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #f2f4f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #888;
}

.pick-avatar {
  width: 110rpx;
  height: 110rpx;
}

/* ===== 资产卡片 ===== */
.asset-card {
  margin-top: 32rpx;
  padding: 34rpx 24rpx;
  display: flex;
}

.asset-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 8rpx 6rpx;
  min-width: 0;
}

.asset-item:not(:last-child) {
  border-right: 1rpx solid #e5e8e5;
}

.asset-icon {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 16rpx;
  background: #eff7ef;
  color: #3a9447;
  font-size: 28rpx;
  font-weight: 700;
  flex: none;
}

.asset-icon.candy {
  background: #fdeef3;
  font-size: 26rpx;
}

.asset-body {
  display: flex;
  flex-direction: column;
  gap: 7rpx;
  font-size: 22rpx;
  min-width: 0;
}

.asset-label {
  color: #8a908b;
  font-size: 20rpx;
  white-space: nowrap;
}

.asset-frozen {
  align-self: flex-start;
  padding: 2rpx 14rpx;
  border-radius: 16rpx;
  background: #e8f0ff;
  color: #007aff;
  font-size: 18rpx;
  font-weight: 600;
  line-height: 1.6;
}

.asset-frozen-holder {
  color: transparent;
  font-size: 18rpx;
  line-height: 1.6;
  padding: 2rpx 14rpx;
}

.asset-arrow {
  color: #c2c7c3;
  font-size: 28rpx;
  flex: none;
}

.asset-value {
  color: #3b984b;
  font-size: 30rpx;
  font-weight: 700;
  white-space: nowrap;
}

.asset-value.candy-val {
  color: #e0447f;
}

/* ===== 订单卡片 ===== */
.order-card {
  margin-top: 32rpx;
  padding: 28rpx 28rpx 32rpx;
}

.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.heading-title {
  font-size: 30rpx;
  font-weight: 700;
}

.heading-more {
  font-size: 21rpx;
  color: #7d837f;
}

.order-grid {
  display: flex;
  margin-top: 32rpx;
}

.order-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  font-size: 22rpx;
}

.order-icon {
  line-height: 1.2;
  position: relative;
  color: #267a36;
  font-size: 36rpx;
}

.order-count {
  position: absolute;
  right: -18rpx;
  top: -10rpx;
  width: 27rpx;
  height: 27rpx;
  line-height: 27rpx;
  text-align: center;
  border-radius: 50%;
  background: #3b9b4b;
  color: #fff;
  font-size: 15rpx;
}

/* ===== 活动记录快捷入口 ===== */
.record-shortcuts {
  margin-top: 32rpx;
  padding: 30rpx 16rpx;
  display: flex;
}

.shortcut-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 6rpx 4rpx;
  min-width: 0;
  border-right: 1rpx solid #eee;
}

.shortcut-item:last-child {
  border-right: 0;
}

.shortcut-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 5rpx;
  font-size: 22rpx;
}

.shortcut-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #1d1d1f;
  white-space: nowrap;
}

.shortcut-desc {
  font-size: 18rpx;
  color: #7d837f;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-icon {
  width: 66rpx;
  height: 66rpx;
  line-height: 66rpx;
  text-align: center;
  border-radius: 20rpx;
  color: #fff;
  font-size: 33rpx;
  flex: none;
}

.green-bg {
  background: linear-gradient(145deg, #88d79b, #24a64b);
}

.orange-bg {
  background: linear-gradient(145deg, #ffc07c, #f19043);
}

.purple-bg {
  background: linear-gradient(145deg, #c29cff, #8053dc);
}

.blue-bg {
  background: linear-gradient(145deg, #7cc4ff, #2f88d6);
}

/* ===== 功能菜单 ===== */
.menu-card {
  margin-top: 32rpx;
  padding: 10rpx 30rpx;
}

.menu-item {
  height: 96rpx;
  display: flex;
  align-items: center;
  border-bottom: 1rpx solid #eee;
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-icon {
  width: 52rpx;
  color: #277d37;
  font-size: 33rpx;
  text-align: center;
  flex: none;
}

.menu-label {
  flex: 1;
  font-size: 27rpx;
}

.menu-arrow {
  width: 30rpx;
  color: #999;
  font-size: 36rpx;
  text-align: right;
}
</style>
