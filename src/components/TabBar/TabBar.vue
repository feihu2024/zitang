<template>
  <view class="tab-bar">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="tab-item"
      :class="{ active: current === item.key }"
      @tap="switchTab(item)"
    >
      <text class="tab-symbol">{{ item.symbol }}</text>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>

<script>
import { getActiveActivity, resolveActivityPage } from '@/utils/api.js'

export default {
  name: 'TabBar',
  props: {
    current: {
      type: String,
      default: 'home'
    }
  },
  data() {
    return {
      tabs: [
        { key: 'home', label: '首页', symbol: '⌂', path: '/pages/home/index' },
        { key: 'activity', label: '活动', symbol: '✦', path: '/pages/activity/index' },
        { key: 'promo', label: '推广', symbol: '♣', path: '/pages/promo/index' },
        { key: 'profile', label: '我的', symbol: '♙', path: '/pages/profile/index' }
      ]
    }
  },
  created() {
    // 「活动」tab 目标页由后台灵活参数决定（配了哪个活动就显示哪个，未配置则留在空白页）
    getActiveActivity().then((activity) => {
      const tab = this.tabs.find((t) => t.key === 'activity')
      if (tab) tab.path = resolveActivityPage(activity)
    })
  },
  methods: {
    switchTab(item) {
      if (item.key === this.current) return
      uni.redirectTo({ url: item.path })
    }
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  left: 50%;
  right: auto;
  bottom: 0;
  z-index: 30;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  height: calc(112rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #ededed;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.tab-item {
  min-width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7rpx;
  color: #5e625f;
  font-size: 24rpx;
}

.tab-symbol {
  width: 43rpx;
  height: 43rpx;
  line-height: 43rpx;
  text-align: center;
  border-radius: 15rpx;
  font-size: 38rpx;
}

.tab-item.active {
  color: #20b768;
  font-weight: 600;
}

.tab-item.active .tab-symbol {
  background: #eaf8ef;
}

/* 桌面端 H5 手机框架预览：底部圆角与手机外壳对齐 */
@media (min-width: 768px) {
  .tab-bar {
    border-radius: 0 0 44px 44px;
    overflow: hidden;
  }
}
</style>
