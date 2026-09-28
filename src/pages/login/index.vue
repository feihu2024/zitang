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
  </view>
</template>

<script>
import { wxLogin, h5Login } from '@/utils/auth.js'

export default {
  data() {
    return {
      agreed: false,
      shaking: false,
      loading: false
    }
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
        let res
        // #ifdef MP-WEIXIN
        // 小程序端：wx.login code 换登录态（后端 mock 模式下用 device_id 建模拟账号）
        res = await wxLogin()
        // #endif
        // #ifdef H5
        // H5 端：用 device_id 建立模拟账号（邀请码已在 auth 模块自动携带）
        res = await h5Login({})
        // #endif
        uni.showToast({ title: res.isNew ? '注册成功' : '登录成功', icon: 'success' })
        setTimeout(() => {
          const pages = getCurrentPages()
          if (pages.length > 1) {
            uni.navigateBack({ delta: 1 })
          } else {
            // 直接打开登录页无来源页时，落到首页
            uni.redirectTo({ url: '/pages/home/index' })
          }
        }, 800)
      } catch (e) {
        uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
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
</style>
