<template>
  <view class="page service-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">{{ pageTitle }}</text>
      <view class="nav-holder"></view>
    </view>

    <!-- 内容区 -->
    <view v-if="loading" class="page-tip">加载中...</view>
    <view v-else-if="!content" class="page-tip">暂无内容</view>
    <view v-else class="content-card card">
      <rich-text class="rich-body" :nodes="content"></rich-text>
    </view>
  </view>
</template>

<script>
import { get } from '@/utils/api.js'

export default {
  data() {
    return {
      pageTitle: '联系客服',
      content: '',
      loading: false
    }
  },
  onLoad() {
    this.loadService()
  },
  methods: {
    async loadService() {
      this.loading = true
      try {
        const resp = await get('/api/wxapp/config/customer-service')
        if (resp && resp.title) this.pageTitle = resp.title
        const html = (resp && (resp.content || resp.detailHtml || resp.html)) || ''
        this.content = this.adaptRichHtml(html)
      } catch (e) {
        console.error('加载客服信息失败:', e)
        this.content = ''
      } finally {
        this.loading = false
      }
    },
    // 富文本图片自适应：给 img 注入最大宽度约束（rich-text 无法用页面样式穿透）
    adaptRichHtml(html) {
      if (!html) return ''
      return html.replace(/<img[^>]*>/gi, (tag) => {
        if (/style\s*=/i.test(tag)) {
          return tag.replace(/style\s*=\s*(["'])/i, (m, q) => 'style=' + q + 'max-width:100%;height:auto;')
        }
        return tag.replace(/<img/i, '<img style="max-width:100%;height:auto;display:block;"')
      })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.service-page {
  background: #f7f8f6;
  min-height: 100vh;
}

.safe-top {
  height: env(safe-area-inset-top);
}

.safe-top.white {
  background: #fff;
}

/* 顶部导航 */
.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-back {
  width: 60rpx;
  font-size: 44rpx;
  color: #1f2320;
  font-weight: 700;
}

.nav-title {
  font-size: 30rpx;
  font-weight: 700;
}

.nav-holder {
  width: 60rpx;
}

.page-tip {
  padding: 200rpx 0;
  text-align: center;
  color: #9aa09b;
  font-size: 26rpx;
}

/* 内容卡片 */
.content-card {
  margin: 20rpx 24rpx;
  padding: 28rpx;
}

.rich-body {
  font-size: 26rpx;
  color: #3a3f3b;
  line-height: 1.7;
}
</style>
