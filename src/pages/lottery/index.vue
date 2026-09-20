<template>
  <view class="page lottery-page">
    <view class="safe-top lottery-red"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar lottery-red">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">{{ pageTitle }}</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 无生效活动 -->
    <view v-if="loaded && !hasActivity" class="empty-wrap">
      <text class="empty-icon">🎁</text>
      <text class="empty-text">暂无进行中的抽奖活动</text>
      <text class="empty-sub">敬请期待更多精彩活动～</text>
    </view>

    <block v-else-if="activity">
      <!-- Hero 区 -->
      <view class="lottery-hero">
        <text class="hero-sub">好运加倍 · 惊喜不断</text>
        <text class="hero-big">{{ heroTitle }}</text>
        <text class="hero-tag">每日好礼　幸运由你开启</text>
        <text class="hero-gift">礼</text>
      </view>

      <!-- 统计卡 -->
      <view class="stats-card card">
        <view class="stat-item">
          <text class="stat-icon">▣</text>
          <view class="stat-copy">
            <text class="stat-label">今日剩余</text>
            <text class="stat-value">{{ remaining === null ? dailyLimit : remaining }}次</text>
          </view>
        </view>
        <view class="stat-item">
          <text class="stat-icon">♟</text>
          <view class="stat-copy">
            <text class="stat-label">累计参与</text>
            <text class="stat-value">{{ activity.drawCount }}次</text>
          </view>
        </view>
        <view class="stat-item last">
          <text class="stat-icon">◷</text>
          <view class="stat-copy">
            <text class="stat-label">活动时间</text>
            <text class="stat-value">{{ periodText }}</text>
          </view>
        </view>
      </view>

      <!-- 抽奖游戏区（按生效样式渲染） -->
      <view class="game-area">
        <!-- 大转盘 -->
        <view v-if="activity.style === 'wheel'" class="wheel-wrap">
          <text class="wheel-pointer">▼</text>
          <view class="lottery-wheel" :style="{ transform: 'rotate(' + wheelDeg + 'deg)' }">
            <view
              v-for="(p, i) in prizeSlots"
              :key="i"
              class="wheel-seg"
              :style="{ transform: 'rotate(' + i * 45 + 'deg)' }"
            >
              <image v-if="p.image" class="seg-img" :src="p.image" mode="aspectFit" />
              <text v-else class="seg-icon">{{ p.icon }}</text>
              <text class="seg-name">{{ p.name }}</text>
            </view>
          </view>
          <button class="wheel-button" @tap="draw">{{ drawing ? '好运\n旋转中' : '立即\n抽奖' }}</button>
        </view>

        <!-- 九宫格 -->
        <view v-else-if="activity.style === 'grid'" class="lottery-grid">
          <template v-for="(index, pos) in gridOrder">
            <button v-if="index < 0" :key="'draw'" class="grid-draw" @tap="draw">{{ drawing ? '抽奖中' : '立即\n抽奖' }}</button>
            <view v-else :key="'cell' + pos" class="grid-cell" :class="{ active: activePos === pos }">
              <image v-if="prizeSlots[index].image" class="cell-img" :src="prizeSlots[index].image" mode="aspectFit" />
              <text v-else class="cell-icon">{{ prizeSlots[index].icon }}</text>
              <text class="cell-name">{{ prizeSlots[index].name }}</text>
            </view>
          </template>
        </view>

        <!-- 刮刮卡 -->
        <view v-else class="scratch-card" :class="{ revealed: scratchRevealed }">
          <view class="scratch-head">刮开涂层　惊喜立现</view>
          <view class="scratch-reward">
            <text class="reward-sub">{{ scratchResult.won ? '恭喜获得' : '很遗憾' }}</text>
            <text class="reward-main">{{ scratchResult.won ? scratchResult.prize.name : '未中奖' }}</text>
            <text class="reward-tag">{{ scratchResult.won ? prizeDesc(scratchResult.prize) : '再接再厉 好运常在' }}</text>
          </view>
          <view class="scratch-cover" @tap="draw">
            <text class="cover-big">{{ drawing ? '开奖中…' : '轻轻刮开' }}</text>
            <text class="cover-sub">点击查看奖励</text>
          </view>
        </view>
      </view>

      <!-- 中奖播报条 -->
      <view class="winner-ticker" @tap="goRecords">
        <text class="ticker-icon">◖</text>
        <text class="ticker-tip">我的奖品</text>
        <text class="ticker-text">积分/余额自动到账 · 实物奖品记得填地址</text>
        <text class="ticker-more">›</text>
      </view>

      <!-- 抽奖任务（占位） -->
      <view class="lottery-card card">
        <view class="card-head">
          <text class="head-title">🎁 抽奖任务</text>
          <text class="head-sub">完成任务增加机会</text>
        </view>
        <view v-for="task in tasks" :key="task.name" class="task-row">
          <text class="task-icon">{{ task.icon }}</text>
          <view class="task-copy">
            <text class="task-name">{{ task.name }}</text>
            <text class="task-desc">{{ task.desc }}</text>
          </view>
          <text class="task-reward">{{ task.reward }}</text>
          <view class="task-btn" @tap="taskComing(task.name)">去完成</view>
        </view>
      </view>

      <!-- 奖品展示 -->
      <view class="lottery-card card">
        <view class="card-head">
          <text class="head-title">🔥 奖品展示</text>
          <text class="head-link" @tap="goRecords">更多奖品 ›</text>
        </view>
        <view class="prize-show">
          <view v-for="(p, i) in realPrizes" :key="i" class="prize-cell">
            <image v-if="p.image" class="prize-img" :src="p.image" mode="aspectFill" />
            <text v-else class="prize-icon">{{ p.icon }}</text>
            <text class="prize-name">{{ p.name }}</text>
          </view>
        </view>
      </view>

      <!-- 活动规则 -->
      <view class="lottery-card card">
        <view class="card-head"><text class="head-title">▤ 活动规则</text></view>
        <view v-for="(line, i) in ruleLines" :key="i" class="rule-line">{{ line }}</view>
      </view>

      <view class="bottom-holder"></view>

      <!-- 底部悬浮操作栏（漂浮在 TabBar 之上） -->
      <view class="action-bar">
        <button class="action-main" @tap="draw">
          <text class="action-main-text">{{ drawing ? '抽奖进行中…' : '立即抽奖' }}</text>
          <text class="action-main-sub">今日剩余 {{ remaining === null ? dailyLimit : remaining }} 次</text>
        </button>
        <button class="action-sub" @tap="goRecords">
          <text class="action-sub-icon">🎁</text>
          <text>我的奖品</text>
        </button>
      </view>
    </block>

    <!-- 开奖结果弹窗 -->
    <view v-if="result.show" class="result-overlay" @tap="closeResult">
      <view class="result-card" @tap.stop>
        <text class="result-badge">{{ result.won ? '🎉 恭喜中奖' : '🍀 差一点点' }}</text>
        <image v-if="result.won && result.prize.image" class="result-img" :src="result.prize.image" mode="aspectFit" />
        <text v-else class="result-icon">{{ result.won ? result.prize.icon : '🍀' }}</text>
        <text class="result-name">{{ result.won ? result.prize.name : '谢谢参与' }}</text>
        <text class="result-desc">{{ result.won ? prizeDesc(result.prize) : '明天再来，好运加倍' }}</text>
        <view v-if="result.won && result.prize.prizeType === 'physical'" class="result-btns">
          <button class="result-btn primary" @tap="openAddressSheet">填写收货地址</button>
          <button class="result-btn ghost" @tap="closeResult">稍后再填</button>
        </view>
        <view v-else class="result-btns">
          <button class="result-btn primary" @tap="closeResult">开心收下</button>
        </view>
      </view>
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
          <textarea v-model="addressSheet.address" placeholder="省市区 + 详细地址" :auto-height="false" />
        </view>
        <button class="sheet-submit" @tap="submitAddress">提交并创建发货订单</button>
      </view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar current="activity" />
  </view>
</template>

<script>
import { get, post, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'
import TabBar from '@/components/TabBar/TabBar.vue'

export default {
  components: { TabBar },
  data() {
    return {
      loaded: false,
      hasActivity: false,
      activity: null,
      remaining: null,
      drawing: false,
      wheelDeg: 0,
      activePos: -1,
      gridTimer: null,
      scratchRevealed: false,
      scratchResult: { won: false, prize: { name: '', icon: '🎁', prizeType: 'empty', value: 0 } },
      result: { show: false, won: false, prize: {}, recordNo: '', recordState: '' },
      addressSheet: { show: false, recordId: null, name: '', phone: '', address: '' },
      tasks: [
        { icon: '▣', name: '每日签到', desc: '每日签到可获得抽奖机会', reward: '+1次' },
        { icon: '●', name: '分享好友', desc: '分享活动给好友可获得机会', reward: '+1次' },
        { icon: '▰', name: '下单成功', desc: '完成任意订单可获得机会', reward: '+2次' }
      ]
    }
  },
  computed: {
    pageTitle() {
      const s = this.activity && this.activity.style
      return s === 'grid' ? '幸运九宫格' : s === 'scratch' ? '幸运刮刮卡' : '幸运大转盘'
    },
    heroTitle() {
      const s = this.activity && this.activity.style
      return s === 'grid' ? '九格夺宝 好运连连' : s === 'scratch' ? '轻轻一刮 惊喜立现' : '好运转不停'
    },
    dailyLimit() {
      return (this.activity && this.activity.dailyLimit) || 0
    },
    periodText() {
      if (!this.activity) return ''
      const f = d => (d || '').slice(5).replace('-', '.')
      return f(this.activity.startDate) + '–' + f(this.activity.endDate)
    },
    // 奖品补齐到 8 格（转盘/九宫格），不足补谢谢参与占位；有图优先展示图片
    prizeSlots() {
      const prizes = ((this.activity && this.activity.prizes) || []).slice(0, 8)
      const slots = prizes.map(p => ({ ...p, image: p.iconImage ? resolveAssetUrl(p.iconImage) : '', placeholder: false }))
      while (slots.length < 8) {
        slots.push({ name: '谢谢参与', icon: '🍀', image: '', prizeType: 'empty', value: 0, placeholder: true })
      }
      return slots
    },
    realPrizes() {
      return ((this.activity && this.activity.prizes) || [])
        .filter(p => p.prizeType !== 'empty')
        .map(p => ({ ...p, image: p.iconImage ? resolveAssetUrl(p.iconImage) : '' }))
    },
    ruleLines() {
      const rules = (this.activity && this.activity.rules) || ''
      return rules.split('\n').filter(l => l.trim())
    },
    // 九宫格位置 → 奖品索引（中心为抽奖按钮）
    gridOrder() {
      return [0, 1, 2, 7, -1, 3, 6, 5, 4]
    }
  },
  onLoad() {
    this.loadActivity()
  },
  onShow() {
    if (this.loaded) this.loadActivity()
  },
  onUnload() {
    if (this.gridTimer) clearInterval(this.gridTimer)
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.redirectTo({ url: '/pages/home/index' })
    },
    goRecords() {
      uni.navigateTo({ url: '/pages/lottery-records/index' })
    },
    taskComing(name) {
      uni.showToast({ title: name + '任务即将开放', icon: 'none' })
    },
    prizeDesc(prize) {
      if (!prize) return ''
      if (prize.prizeType === 'points') return (prize.value || 0) + ' 积分已到账'
      if (prize.prizeType === 'balance') return '¥' + (prize.value || 0) + ' 余额已到账'
      if (prize.prizeType === 'candy') return Math.round(prize.value || 0) + ' 糖豆已到账，下单可抵现金'
      if (prize.prizeType === 'physical') return '请填写收货地址，我们将尽快发货'
      return '再接再厉'
    },
    // ---- 活动加载 ----
    async loadActivity() {
      try {
        const res = await get('/api/wxapp/lottery/activity')
        this.hasActivity = !!res.hasActivity
        this.activity = res.activity || null
        if (res.activity) {
          this.remaining = res.activity.remaining
          // 刮刮卡换场/换活动时重置涂层
          if (this.activity.style !== 'scratch') this.scratchRevealed = false
        }
      } catch (e) {
        uni.showToast({ title: e.message || '加载失败', icon: 'none' })
      } finally {
        this.loaded = true
      }
    },
    // ---- 抽奖 ----
    async draw() {
      if (this.drawing) return
      if (!this.hasActivity) {
        return uni.showToast({ title: '当前没有进行中的抽奖活动', icon: 'none' })
      }
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录后再抽奖', icon: 'none' })
        setTimeout(() => uni.navigateTo({ url: '/pages/profile/index' }), 800)
        return
      }
      if (this.remaining !== null && this.remaining <= 0) {
        return uni.showToast({ title: '今天的抽奖次数已用完', icon: 'none' })
      }
      this.drawing = true
      try {
        const res = await post('/api/wxapp/lottery/draw')
        this.remaining = res.remaining
        const targetIndex = this.targetSlotIndex(res)
        const style = this.activity.style
        if (style === 'wheel') this.animateWheel(targetIndex, res)
        else if (style === 'grid') this.animateGrid(targetIndex, res)
        else this.revealScratch(res)
      } catch (e) {
        this.drawing = false
        uni.showToast({ title: e.message || '抽奖失败', icon: 'none' })
      }
    },
    // 中奖奖品在 8 格中的位置（未中奖指向第一个谢谢参与格）
    targetSlotIndex(res) {
      if (res.won && res.prize && res.prize.id) {
        const idx = this.prizeSlots.findIndex(p => p.id === res.prize.id)
        if (idx >= 0) return idx
      }
      const emptyIdx = this.prizeSlots.findIndex(p => p.prizeType === 'empty')
      return emptyIdx >= 0 ? emptyIdx : 0
    },
    // ---- 大转盘动画 ----
    animateWheel(targetIndex, res) {
      const normalized = ((this.wheelDeg % 360) + 360) % 360
      const target = (360 - targetIndex * 45) % 360
      const delta = (target - normalized + 360) % 360
      this.wheelDeg = this.wheelDeg + 5 * 360 + delta
      setTimeout(() => this.finishDraw(res), 3400)
    },
    // ---- 九宫格动画 ----
    animateGrid(targetIndex, res) {
      const order = this.gridOrder
      const targetPos = order.indexOf(targetIndex)
      const totalSteps = 8 * 3 + ((targetPos % 8) + 8) % 8
      let step = 0
      this.gridTimer = setInterval(() => {
        this.activePos = step % 8
        step += 1
        if (step > totalSteps) {
          clearInterval(this.gridTimer)
          this.gridTimer = null
          this.activePos = targetPos
          setTimeout(() => this.finishDraw(res), 400)
        }
      }, 85)
    },
    // ---- 刮刮卡动画 ----
    revealScratch(res) {
      this.scratchResult = { won: res.won, prize: res.prize || { name: '谢谢参与', icon: '🍀', prizeType: 'empty', value: 0 } }
      setTimeout(() => {
        this.scratchRevealed = true
        setTimeout(() => this.finishDraw(res), 700)
      }, 300)
    },
    finishDraw(res) {
      this.drawing = false
      // 累计参与数实时更新（服务端 drawCount 下次加载时同步）
      if (this.activity) this.activity.drawCount = (this.activity.drawCount || 0) + 1
      this.result = {
        show: true,
        won: res.won,
        prize: res.prize || {},
        recordNo: res.recordNo,
        recordState: res.recordState
      }
    },
    closeResult() {
      const wasPhysical = this.result.won && this.result.prize.prizeType === 'physical'
      this.result.show = false
      // 刮刮卡关闭后重置涂层，便于下次抽奖
      if (this.activity && this.activity.style === 'scratch') {
        this.scratchRevealed = false
      }
      if (wasPhysical) {
        uni.showToast({ title: '可在中奖记录中补填地址', icon: 'none' })
      }
    },
    // ---- 实物奖品填地址 ----
    openAddressSheet() {
      this.addressSheet = {
        show: true,
        recordId: this.result.recordId || null,
        name: '',
        phone: '',
        address: ''
      }
      // recordId 通过记录接口补查（draw 返回 recordNo，这里按编号定位）
      this.resolveRecordId(this.result.recordNo)
    },
    async resolveRecordId(recordNo) {
      try {
        const res = await get('/api/wxapp/lottery/records', { tab: 'claim' })
        const item = (res.items || []).find(r => r.recordNo === recordNo)
        if (item) this.addressSheet.recordId = item.id
      } catch (e) { /* 忽略，提交时会提示 */ }
    },
    async submitAddress() {
      const { recordId, name, phone, address } = this.addressSheet
      if (!recordId) return uni.showToast({ title: '记录加载中，请稍候重试', icon: 'none' })
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
        this.result.show = false
        if (this.activity && this.activity.style === 'scratch') this.scratchRevealed = false
        uni.showToast({ title: '地址已提交，奖品将尽快发货', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '提交失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.lottery-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: linear-gradient(#ef2317 0 420rpx, #fff3ec 700rpx, #fff9f5 100%);
  overflow-x: hidden;
}
.lottery-red { background: #ef2317; color: #fff; }

/* 导航栏 */
.nav-bar {
  height: 88rpx;
  padding: 0 26rpx;
  display: flex;
  align-items: center;
  position: relative;
}
.nav-back { font-size: 52rpx; font-weight: 300; color: #fff; line-height: 1; }
.nav-title {
  position: absolute; left: 50%; transform: translateX(-50%);
  font-size: 34rpx; font-weight: 700; color: #fff;
}
.capsule { margin-left: auto; font-size: 28rpx; color: rgba(255,255,255,.75); }

/* 空态 */
.empty-wrap { padding: 160rpx 0; display: flex; flex-direction: column; align-items: center; }
.empty-icon { font-size: 100rpx; }
.empty-text { margin-top: 24rpx; font-size: 30rpx; font-weight: 700; color: #5b4a44; }
.empty-sub { margin-top: 12rpx; font-size: 24rpx; color: #8e8e93; }

/* Hero */
.lottery-hero {
  height: 230rpx;
  padding: 28rpx 44rpx;
  display: flex; flex-direction: column; justify-content: center;
  position: relative; overflow: hidden;
  background: radial-gradient(circle at 78% 22%, #ffaf43 0, #ff6427 31%, #ef2317 76%);
}
.hero-sub { font-size: 20rpx; color: #ffe9c9; letter-spacing: 4rpx; }
.hero-big {
  margin: 10rpx 0 8rpx;
  color: #fff9bf; font-size: 56rpx; font-weight: 900; line-height: 1;
  text-shadow: 0 6rpx 0 rgba(170,32,15,.36);
}
.hero-tag { font-size: 22rpx; color: #ffeecf; }
.hero-gift {
  position: absolute; right: 48rpx; bottom: -32rpx;
  width: 166rpx; height: 166rpx; border-radius: 44rpx;
  display: flex; align-items: center; justify-content: center;
  transform: rotate(-9deg);
  background: linear-gradient(145deg, #ffec80, #ff9e27);
  color: #e8381d; font-size: 82rpx; font-weight: 900;
  box-shadow: 0 18rpx 0 rgba(158,29,12,.18);
}

/* 统计卡 */
.stats-card {
  height: 128rpx;
  margin: -14rpx 24rpx 16rpx;
  padding: 16rpx 8rpx;
  display: flex;
  position: relative; z-index: 2;
}
.stat-item {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  border-right: 1rpx solid #f2ddd1;
}
.stat-item.last { border-right: 0; }
.stat-icon { color: #ff6a28; font-size: 36rpx; }
.stat-copy { display: flex; flex-direction: column; }
.stat-label { color: #5b4a44; font-size: 18rpx; }
.stat-value { margin-top: 4rpx; color: #e52e1f; font-size: 30rpx; font-weight: 700; white-space: nowrap; }

/* 游戏区 */
.game-area {
  min-height: 484rpx;
  display: flex; align-items: center; justify-content: center;
  padding: 20rpx 0;
}

/* 大转盘 */
.wheel-wrap { width: 480rpx; height: 480rpx; position: relative; display: flex; align-items: center; justify-content: center; }
.lottery-wheel {
  width: 464rpx; height: 464rpx;
  border: 26rpx solid #f43b24; border-radius: 50%;
  position: relative;
  /* 兼容性：老客户端不支持 repeating-conic-gradient，先给纯色兜底 */
  background: #ffe8bd;
  background: repeating-conic-gradient(from -22.5deg, #fff5d9 0 45deg, #ffe8bd 45deg 90deg);
  box-shadow: 0 0 0 10rpx #ffae39, 0 14rpx 40rpx rgba(172,50,18,.22);
  transition: transform 3.2s cubic-bezier(.12,.69,.12,1);
}
.wheel-seg {
  position: absolute; z-index: 2;
  left: calc(50% - 56rpx); top: 14rpx;
  width: 112rpx; height: 202rpx;
  display: flex; flex-direction: column; align-items: center;
  transform-origin: 56rpx 202rpx;
}
.seg-icon { color: #e84322; font-size: 34rpx; }
.seg-img { width: 64rpx; height: 64rpx; border-radius: 10rpx; }
.seg-name { margin-top: 4rpx; color: #592f22; font-size: 16rpx; font-weight: 700; text-align: center; }
.wheel-button {
  position: absolute; z-index: 4;
  width: 148rpx; height: 148rpx;
  border: 14rpx solid #ffb24b; border-radius: 50%;
  background: linear-gradient(#ff6138, #e92120);
  color: #fff; font-size: 28rpx; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  white-space: pre-line; line-height: 1.2;
  box-shadow: 0 10rpx 24rpx rgba(169,35,15,.35);
  padding: 0;
  animation: wheelGlow 2s ease-out infinite;
}
/* 中心按钮呼吸光圈 */
@keyframes wheelGlow {
  0%, 100% { box-shadow: 0 10rpx 24rpx rgba(169,35,15,.35), 0 0 0 0 rgba(255,178,75,.5); }
  60% { box-shadow: 0 10rpx 24rpx rgba(169,35,15,.35), 0 0 0 22rpx rgba(255,178,75,0); }
}
.wheel-pointer {
  position: absolute; z-index: 5; top: -12rpx;
  color: #ffc45f; font-size: 50rpx;
  filter: drop-shadow(0 4rpx 2rpx #d6391c);
}

/* 九宫格（兼容性：用 flex-wrap 替代 grid，低版本 WebView 支持更稳） */
.lottery-grid {
  width: 504rpx;
  padding: 18rpx;
  display: flex; flex-wrap: wrap;
  border: 16rpx solid #f14122; border-radius: 44rpx;
  background: #ff702b;
  box-shadow: 0 0 0 8rpx #ffba55, 0 16rpx 40rpx rgba(169,49,18,.22);
  box-sizing: border-box;
}
.grid-cell, .grid-draw {
  width: calc((100% - 24rpx) / 3);
  height: 148rpx;
  margin: 0 12rpx 12rpx 0;
  border-radius: 20rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #fff6df; border: 4rpx solid #ffd184; color: #3d281f;
  transition: all 0.08s;
  overflow: hidden;
  box-sizing: border-box;
}
.grid-cell:nth-child(3n), .grid-draw:nth-child(3n) { margin-right: 0; }
.grid-cell.active {
  background: #fff09f; border-color: #fff;
  box-shadow: 0 0 0 8rpx #ffe06b;
}
.grid-cell.active .cell-name { color: #ed341e; }
.cell-icon { color: #f14b25; font-size: 34rpx; }
.cell-img { width: 60rpx; height: 60rpx; border-radius: 12rpx; }
.cell-name { margin-top: 6rpx; font-size: 16rpx; text-align: center; }
.grid-draw {
  background: linear-gradient(#ff6740, #e82120);
  border-color: #ffb94d; color: #fff;
  font-size: 30rpx; font-weight: 900; line-height: 1.15;
  white-space: pre-line;
  box-shadow: inset 0 0 0 6rpx rgba(255,255,255,.22);
  padding: 0;
}

/* 刮刮卡 */
.scratch-card {
  width: 620rpx; height: 448rpx;
  padding: 22rpx; border-radius: 42rpx;
  position: relative; overflow: hidden;
  background: linear-gradient(145deg, #ff632f, #e9231b);
  border: 10rpx solid #ffac49;
  box-shadow: 0 16rpx 40rpx rgba(169,49,18,.22);
  box-sizing: border-box;
}
.scratch-head { text-align: center; color: #fff3a0; font-size: 32rpx; font-weight: 900; }
.scratch-reward {
  position: absolute; left: 34rpx; right: 34rpx; top: 92rpx; bottom: 36rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 8rpx solid #fff1be; border-radius: 26rpx;
  background: radial-gradient(circle, #fffbea, #ffe4a5);
  color: #e9351c;
}
.reward-sub { font-size: 24rpx; }
.reward-main { margin: 8rpx 0; font-size: 64rpx; font-weight: 900; }
.reward-tag {
  padding: 6rpx 24rpx; border-radius: 22rpx;
  background: #f13b24; color: #fff; font-size: 20rpx;
}
.scratch-cover {
  position: absolute; left: 34rpx; right: 34rpx; top: 92rpx; bottom: 36rpx;
  border: 8rpx solid #ddd; border-radius: 26rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: repeating-linear-gradient(135deg, #c6c8ca 0 16rpx, #e4e5e6 16rpx 32rpx);
  color: #67696b;
  transition: all 0.55s;
}
.cover-big { font-size: 46rpx; font-weight: 900; text-shadow: 0 2rpx #fff; }
.cover-sub { margin-top: 14rpx; font-size: 20rpx; }
.scratch-card.revealed .scratch-cover { opacity: 0; transform: translateX(105%); }

/* 中奖播报条 */
.winner-ticker {
  margin: 0 24rpx;
  height: 76rpx; padding: 0 22rpx;
  display: flex; align-items: center; gap: 14rpx;
  border-radius: 38rpx; background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(178,76,34,.1);
}
.ticker-icon { color: #f33b24; font-size: 30rpx; }
.ticker-tip {
  padding: 8rpx 14rpx; border-radius: 20rpx;
  background: #fff0e7; color: #7a574a; font-size: 18rpx;
}
.ticker-text { flex: 1; min-width: 0; font-size: 22rpx; color: #58443c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ticker-more { color: #8e8e93; font-size: 28rpx; }

/* 卡片通用 */
.lottery-card { margin: 16rpx 24rpx 0; padding: 20rpx; }
.card-head { height: 48rpx; display: flex; align-items: center; justify-content: space-between; }
.head-title { font-size: 26rpx; font-weight: 700; color: #3d281f; }
.head-sub, .head-link { color: #8a7a72; font-size: 20rpx; }

/* 任务行 */
.task-row {
  height: 92rpx;
  display: flex; align-items: center; gap: 14rpx;
  border-top: 1rpx solid #f6e7de;
}
.task-icon {
  width: 52rpx; height: 52rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  background: #fff0e7; color: #fb5029; font-size: 24rpx;
}
.task-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.task-name { font-size: 24rpx; font-weight: 600; color: #3d281f; }
.task-desc { color: #8c817b; font-size: 18rpx; }
.task-reward { color: #f13b24; font-size: 24rpx; font-weight: 700; }
.task-btn {
  height: 48rpx; padding: 0 22rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 26rpx;
  background: linear-gradient(90deg, #ff8331, #fb4d25);
  color: #fff; font-size: 20rpx;
}

/* 奖品展示（兼容性：flex-wrap 替代 grid） */
.prize-show { display: flex; flex-wrap: wrap; justify-content: space-between; margin-top: 8rpx; }
.prize-cell {
  width: calc((100% - 30rpx) / 4);
  height: 110rpx;
  margin-bottom: 10rpx;
  border: 1rpx solid #f5dfd1; border-radius: 16rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #fffaf6;
  box-sizing: border-box;
}
.prize-icon { color: #ef3b21; font-size: 32rpx; font-weight: 900; }
.prize-img { width: 56rpx; height: 56rpx; border-radius: 12rpx; }
.prize-name { margin-top: 8rpx; font-size: 16rpx; color: #592f22; white-space: nowrap; }

/* 规则 */
.rule-line { margin: 8rpx 0; color: #695c56; font-size: 20rpx; line-height: 1.55; }

/* 底部悬浮操作栏：位于 TabBar 之上，悬浮胶囊样式 */
.bottom-holder { height: calc(280rpx + env(safe-area-inset-bottom)); }
.action-bar {
  position: fixed; z-index: 20;
  /* 兼容性：居中限宽写法，桌面端 H5 预览时不超出手机壳范围 */
  left: 50%; right: auto;
  bottom: calc(112rpx + env(safe-area-inset-bottom) + 14rpx);
  width: calc(100% - 48rpx); max-width: 702rpx;
  transform: translateX(-50%);
  height: 124rpx;
  padding: 0 14rpx;
  display: flex; align-items: center; gap: 18rpx;
  background: rgba(255,255,255,.92);
  border: 1rpx solid rgba(242,51,38,.10);
  border-radius: 56rpx;
  box-shadow: 0 14rpx 40rpx rgba(114,50,27,.18);
  box-sizing: border-box;
}
.action-main {
  flex: 1; height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(90deg, #ff7a2f, #ef1f20);
  color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  line-height: 1.15;
  position: relative; overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(239,31,32,.32);
}
/* 高光扫过动画 */
.action-main::after {
  content: '';
  position: absolute; top: 0; bottom: 0;
  width: 48rpx;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent);
  animation: barShine 2.6s ease-in-out infinite;
}
@keyframes barShine {
  0% { left: -60rpx; }
  55%, 100% { left: 110%; }
}
.action-main-text { font-size: 30rpx; font-weight: 800; letter-spacing: 2rpx; }
.action-main-sub { margin-top: 3rpx; font-size: 18rpx; line-height: 1.2; color: rgba(255,255,255,.85); }
.action-sub {
  height: 96rpx; padding: 0 26rpx;
  display: flex; align-items: center; gap: 8rpx;
  border: 2rpx solid #f23326; border-radius: 48rpx;
  background: #fff; color: #f23326; font-size: 24rpx; font-weight: 700;
}
.action-sub-icon { font-size: 26rpx; }

/* 开奖结果弹窗 */
.result-overlay {
  position: fixed; z-index: 50;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
}
.result-card {
  width: 560rpx; padding: 48rpx 40rpx 40rpx;
  border-radius: 32rpx;
  background: linear-gradient(180deg, #fff6e8, #fff);
  display: flex; flex-direction: column; align-items: center;
}
.result-badge {
  padding: 8rpx 28rpx; border-radius: 30rpx;
  background: linear-gradient(90deg, #ff8331, #fb4d25);
  color: #fff; font-size: 24rpx; font-weight: 700;
}
.result-icon { margin-top: 32rpx; font-size: 96rpx; }
.result-img { width: 140rpx; height: 140rpx; margin-top: 32rpx; border-radius: 20rpx; background: #fff; }
.result-name { margin-top: 16rpx; font-size: 40rpx; font-weight: 900; color: #e52e1f; }
.result-desc { margin-top: 12rpx; font-size: 24rpx; color: #8a7a72; text-align: center; }
.result-btns { width: 100%; margin-top: 36rpx; display: flex; flex-direction: column; gap: 16rpx; }
.result-btn { border-radius: 44rpx; font-size: 28rpx; font-weight: 700; }
.result-btn.primary { background: linear-gradient(90deg, #ff5c32, #ef1f20); color: #fff; }
.result-btn.ghost { background: #fff; border: 2rpx solid #f23326; color: #f23326; }

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
