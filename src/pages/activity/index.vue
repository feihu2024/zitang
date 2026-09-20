<template>
  <view class="page activity-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">活动中心</text>
    </view>

    <!-- 未配置活动时的空白占位：当前暂无活动 -->
    <view class="empty-wrap">
      <text class="empty-icon">🎪</text>
      <text class="empty-title">当前暂无活动</text>
      <text class="empty-desc">活动敬请期待</text>
      <view class="empty-btn" @tap="goHome">去首页逛逛</view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar current="activity" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'
import { getActiveActivity, resolveActivityPage, ACTIVITY_PLACEHOLDER_PAGE } from '@/utils/api.js'

export default {
  components: { TabBar },
  onLoad() {
    // 后台配了活动（拼团/秒杀/抽奖）就不停留在空白页，直接跳对应活动页；未配置则显示「当前暂无活动」
    getActiveActivity().then((activity) => {
      const target = resolveActivityPage(activity)
      if (target !== ACTIVITY_PLACEHOLDER_PAGE) {
        uni.redirectTo({ url: target })
      }
    })
  },
  methods: {
    goHome() {
      uni.redirectTo({ url: '/pages/home/index' })
    }
  }
}
</script>

<style scoped>
.activity-page {
  background: #f7f8f6;
}

.safe-top {
  height: env(safe-area-inset-top);
}

.safe-top.white {
  background: #fff;
}

.nav-bar {
  background: #fff;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.empty-wrap {
  padding-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}

.empty-icon {
  font-size: 120rpx;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.empty-desc {
  font-size: 26rpx;
  color: #8a8f8c;
}

.empty-btn {
  margin-top: 40rpx;
  padding: 18rpx 64rpx;
  border-radius: 40rpx;
  background: linear-gradient(90deg, #20b768, #34d07e);
  color: #fff;
  font-size: 28rpx;
}
</style>
