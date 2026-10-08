<template>
  <view class="login-page">
    <view class="login-shell">
      <!-- 顶部波浪装饰 -->
      <image class="hero-art" src="/static/login-hero.svg" mode="aspectFit" />

      <!-- 品牌区 -->
      <view class="brand">
        <image class="brand-logo" src="/static/login-logo.svg" mode="aspectFit" />
        <text class="brand-name">子唐优美丽</text>
        <text class="brand-slogan">让创造更简单</text>
      </view>

      <!-- 欢迎语 -->
      <view class="welcome">
        <text class="welcome-title">欢迎使用</text>
        <text class="welcome-desc">登录后即可体验更多功能与服务</text>
      </view>

      <!-- 微信一键登录 -->
      <button class="login-btn" hover-class="login-btn-hover" :disabled="loading" @tap="onLogin">
        <image class="wechat-icon" src="/static/login-wechat.svg" mode="aspectFit" />
        <text class="login-text">{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </button>

      <!-- 协议勾选（未勾选时抖动提示） -->
      <view class="agreement" :class="{ shake: shaking }">
        <view class="checkbox" :class="{ checked: agreed }" @tap="agreed = !agreed"></view>
        <text class="agreement-copy">
          我已阅读并同意
          <text class="text-link" @tap.stop="goAgreement">《用户协议》</text>
          与
          <text class="text-link" @tap.stop="goPrivacy">《隐私政策》</text>
        </text>
      </view>

      <!-- 底部 -->
      <view class="footer">子唐优美丽 · 让创造更简单</view>
    </view>

    <!-- ===== 登录成功：完善头像和昵称（保存后才进入首页） ===== -->
    <view v-if="profilePop.show" class="pop-mask">
      <view class="pop-card">
        <view class="pop-title">完善个人资料</view>
        <view class="pop-tip">请设置头像和昵称，方便好友认识你</view>
        <!-- #ifdef MP-WEIXIN -->
        <view class="edit-row">
          <text class="edit-label">头像</text>
          <button class="avatar-pick-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image v-if="profilePop.avatarUrl" class="pick-avatar" :src="profilePop.avatarUrl" mode="aspectFill" />
            <text v-else>点击选择</text>
          </button>
        </view>
        <!-- #endif -->
        <view class="edit-row">
          <text class="edit-label">昵称</text>
          <input class="form-input edit-input" :type="isMP ? 'nickname' : 'text'" v-model="profilePop.nickname"
            placeholder="微信授权昵称或自定义" maxlength="20" />
        </view>
        <view class="pop-save" :class="{ disabled: saving }" @tap="saveProfile">
          {{ saving ? '保存中...' : '保存并进入' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { wxLogin, h5Login, updateProfile } from '@/utils/auth.js'

export default {
  data() {
    return {
      agreed: false,
      shaking: false,
      loading: false,
      isMP: false,
      saving: false,
      // 登录成功后的资料完善弹窗
      profilePop: { show: false, avatarUrl: '', nickname: '' }
    }
  },
  created() {
    // #ifdef MP-WEIXIN
    this.isMP = true
    // #endif
  },
  methods: {
    async onLogin() {
      // 未同意协议：抖动 + 提示
      if (!this.agreed) {
        this.shaking = false
        clearTimeout(this._shakeTimer)
        this.$nextTick(() => {
          this.shaking = true
          uni.showToast({ title: '请先阅读并同意用户协议与隐私政策', icon: 'none' })
          this._shakeTimer = setTimeout(() => { this.shaking = false }, 450)
        })
        return
      }
      if (this.loading) return
      this.loading = true
      try {
        // #ifdef MP-WEIXIN
        // 小程序端：wx.login code 换登录态（后端 mock 模式下用 device_id 建模拟账号）
        await wxLogin()
        // #endif
        // #ifdef H5
        // H5 端：用 device_id 建立模拟账号（邀请码已在 auth 模块自动携带）
        await h5Login({})
        // #endif
        // 登录成功先不跳转：弹出资料完善弹窗，保存后再进首页
        this.profilePop.show = true
      } catch (e) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    // 微信 chooseAvatar 回调
    onChooseAvatar(e) {
      this.profilePop.avatarUrl = e.detail.avatarUrl
    },
    // 保存头像和昵称，成功后跳转首页
    async saveProfile() {
      if (this.saving) return
      const nickname = (this.profilePop.nickname || '').trim()
      if (!nickname) {
        return uni.showToast({ title: '请输入昵称', icon: 'none' })
      }
      // #ifdef MP-WEIXIN
      if (!this.profilePop.avatarUrl) {
        return uni.showToast({ title: '请选择头像', icon: 'none' })
      }
      // #endif
      this.saving = true
      try {
        const data = { nickname }
        // 有头像才上报，避免空字符串被当成清空头像
        if (this.profilePop.avatarUrl) data.avatar_url = this.profilePop.avatarUrl
        await updateProfile(data)
        uni.showToast({ title: '已保存', icon: 'success' })
        // 清空页面栈进入首页，避免返回到登录/个人中心页
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/home/index' })
        }, 600)
      } catch (e) {
        uni.showToast({ title: e.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    },
    goPrivacy() {
      uni.navigateTo({ url: '/pages/privacy/index' })
    },
    // 用户协议接口暂未提供
    goAgreement() {
      uni.navigateTo({ url: '/pages/privacy/index' })
      // uni.showToast({ title: '功能即将开放', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f4f7fb;
}

/* 居中限宽，适配桌面 H5 手机壳预览 */
.login-shell {
  position: relative;
  width: 100%;
  max-width: 750rpx;
  min-height: 100vh;
  margin: 0 auto;
  overflow: hidden;
  color: #071e3c;
  background: radial-gradient(circle at 46% 42%, rgba(244, 254, 255, .9) 0, rgba(255, 255, 255, 0) 36%), #fff;
}

/* 顶部波浪装饰 */
.hero-art {
  position: absolute;
  top: 0;
  left: 0;
  width: 750rpx;
  height: 555rpx;
  pointer-events: none;
}

/* 品牌区 */
.brand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: calc(env(safe-area-inset-top) + 152rpx);
}

.brand-logo {
  width: 144rpx;
  height: 144rpx;
}

.brand-name {
  margin-top: 12rpx;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 1rpx;
}

.brand-slogan {
  margin-top: 14rpx;
  color: #8294b3;
  font-size: 22rpx;
  letter-spacing: 11rpx;
  text-indent: 11rpx;
}

/* 欢迎语 */
.welcome {
  margin-top: 140rpx;
  padding: 0 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-title {
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 2rpx;
}

.welcome-desc {
  margin-top: 18rpx;
  color: #8a9bb9;
  font-size: 29rpx;
  line-height: 1.4;
}

/* 登录按钮 */
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 31rpx;
  width: 588rpx;
  height: 109rpx;
  margin: 60rpx auto 0;
  padding: 0;
  border: 0;
  border-radius: 56rpx;
  color: #fff;
  background: linear-gradient(105deg, #45dc7e 0%, #12cf8c 48%, #00bd78 100%);
  box-shadow: 0 19rpx 35rpx rgba(0, 199, 125, .21), inset 0 1rpx 1rpx rgba(255, 255, 255, .35);
  transition: transform .18s ease, box-shadow .18s ease;
}

.login-btn-hover {
  transform: scale(.985);
  box-shadow: 0 10rpx 24rpx rgba(0, 199, 125, .18);
}

.login-btn[disabled] {
  opacity: .7;
}

.login-btn::after {
  border: none;
}

.wechat-icon {
  width: 64rpx;
  height: 52rpx;
  flex: none;
}

.login-text {
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

/* 协议区 */
.agreement {
  margin-top: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44rpx;
  padding: 0 36rpx;
  color: #7489ab;
  font-size: 22rpx;
  line-height: 1.45;
}

.agreement.shake {
  animation: shake .42s ease;
  color: #e65d60;
}

@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-8rpx);
  }

  50% {
    transform: translateX(7rpx);
  }

  75% {
    transform: translateX(-4rpx);
  }
}

.checkbox {
  width: 31rpx;
  height: 31rpx;
  margin-right: 21rpx;
  flex: none;
  border: 2rpx solid #91a3bd;
  border-radius: 50%;
  background: #fff;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}

.checkbox.checked {
  border-color: #08c988;
  background: #08c988;
}

.checkbox.checked::after {
  content: "";
  display: block;
  margin: 7rpx 0 0 7rpx;
  width: 13rpx;
  height: 7rpx;
  border-left: 3rpx solid #fff;
  border-bottom: 3rpx solid #fff;
  transform: rotate(-45deg);
}

.checkbox:active {
  transform: scale(.9);
}

.text-link {
  color: #087fe7;
}

/* 底部 */
.footer {
  position: absolute;
  left: 0;
  bottom: max(79rpx, calc(env(safe-area-inset-bottom) + 35rpx));
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  color: #8395b3;
  font-size: 19rpx;
  letter-spacing: 2rpx;
}

.footer::before,
.footer::after {
  content: "";
  width: 56rpx;
  height: 1rpx;
  background: #d5ddea;
}

/* ===== 资料完善弹窗（遮罩居中限宽，适配桌面 H5 手机壳预览） ===== */
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
  padding: 40rpx 36rpx 36rpx;
}

.pop-title {
  font-size: 32rpx;
  font-weight: 700;
  text-align: center;
}

.pop-tip {
  margin-top: 10rpx;
  text-align: center;
  font-size: 23rpx;
  color: #8a9bb9;
}

.edit-row {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  gap: 20rpx;
}

.edit-label {
  width: 90rpx;
  font-size: 26rpx;
  color: #555;
  flex: none;
}

/* 微信 chooseAvatar 按钮 */
.avatar-pick-btn {
  width: 110rpx;
  height: 110rpx;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #f2f4f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #888;
  line-height: normal;
}

.avatar-pick-btn::after {
  border: none;
}

.pick-avatar {
  width: 110rpx;
  height: 110rpx;
}

/* 昵称输入 */
.edit-input {
  flex: 1;
  height: 82rpx;
  padding: 0 26rpx;
  border-radius: 20rpx;
  background: #fff;
  border: 1rpx solid #dbe7dc;
  font-size: 26rpx;
}

/* 保存按钮（与登录按钮同色系） */
.pop-save {
  margin-top: 40rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  background: linear-gradient(105deg, #45dc7e 0%, #12cf8c 48%, #00bd78 100%);
  box-shadow: 0 14rpx 28rpx rgba(0, 199, 125, .2);
}

.pop-save.disabled {
  opacity: .6;
}
</style>
