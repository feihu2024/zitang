<template>
  <view class="page add-address-page">
    <view class="safe-top white"></view>

    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @tap="goBack">‹</text>
      <text class="nav-title">{{ editId ? '编辑地址' : '新增地址' }}</text>
      <view class="capsule">••· ◎</view>
    </view>

    <!-- 粘贴智能识别 -->
    <view class="paste-card card">
      <view class="paste-glow"></view>
      <view class="paste-head">
        <view class="paste-left">
          <text class="paste-icon">✦</text>
          <text class="paste-title">粘贴地址智能识别</text>
        </view>
        <text class="paste-auto" :class="{ done: recognized }">{{ recognized ? '已识别 ✓' : '自动填写' }}</text>
      </view>
      <textarea
        class="paste-input"
        :class="{ focused: pasteFocus }"
        v-model="pasteText"
        placeholder="粘贴包含姓名、电话和地址的文字，例如：&#10;张三 13800138000&#10;广东省深圳市南山区科技园路1号"
        @input="onPaste"
        @focus="pasteFocus = true"
        @blur="pasteFocus = false"
      />
      <view class="paste-foot">
        <text class="paste-hint">姓名、手机号、省市区可一键识别</text>
        <!-- #ifdef MP-WEIXIN -->
        <text class="wx-import" @tap="importFromWeChat">⌖ 从微信地址导入</text>
        <!-- #endif -->
      </view>
      <!-- 识别结果反馈：识别到几级填几级，缺的级别提示手选 -->
      <view v-if="recognizeTip" class="recognize-tip" :class="{ bad: recognizeBad }">{{ recognizeTip }}</view>
    </view>

    <!-- 地址表单 -->
    <view class="form-card card">
      <view class="form-row">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="收货人姓名" maxlength="30" />
      </view>
      <view class="form-row">
        <text class="form-label">电话</text>
        <input class="form-input" v-model="form.phone" type="number" placeholder="手机号码" maxlength="11" />
      </view>

      <!-- 省市区：一行入口 + 底部三列滚轮（multiSelector，H5 与小程序表现一致） -->
      <view class="form-row">
        <text class="form-label">省市区</text>
        <picker
          class="region-cell"
          mode="multiSelector"
          :range="regionRange"
          :value="regionIndex"
          @columnchange="onRegionColumnChange"
          @change="onRegionConfirm"
        >
          <view class="region-entry" :class="{ empty: !regionText, warn: regionWarn }">
            <text class="region-text">{{ regionText || '请选择省 / 市 / 区' }}</text>
            <text class="region-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-row detail-row">
        <text class="form-label">具体地址</text>
        <textarea class="form-textarea" v-model="form.detail" placeholder="街道、楼栋、门牌号等" maxlength="100" auto-height />
      </view>

      <view class="form-row">
        <text class="form-label">设为默认</text>
        <view class="switch-wrap">
          <switch :checked="form.isDefault" color="#27b969" @change="onDefaultChange" />
        </view>
      </view>
    </view>

    <view class="bottom-space"></view>

    <!-- 底部保存栏 -->
    <view class="save-bar">
      <view class="save-btn" :class="{ disabled: saving }" @tap="save">{{ saving ? '保存中...' : '保存地址' }}</view>
    </view>
  </view>
</template>

<script>
import { PROVINCES, citiesOf, districtsOf, resolveRegion } from '@/utils/regions.js'
import { loadAddresses, getAddresses, createAddress, updateAddress, recognizeAddress } from '@/utils/address.js'
import { isLoggedIn } from '@/utils/auth.js'

export default {
  data() {
    return {
      editId: null,
      pasteText: '',
      pasteFocus: false,
      recognized: false,
      recognizeTip: '',
      recognizeBad: false,
      saving: false,
      // 三列滚轮的数据与游标（未选择时停在第一列首项，表单值仍为空）
      regionRange: [PROVINCES, citiesOf(PROVINCES[0]), districtsOf(PROVINCES[0], citiesOf(PROVINCES[0])[0])],
      regionIndex: [0, 0, 0],
      regionWarn: false,
      form: {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        isDefault: false
      }
    }
  },
  computed: {
    regionText() {
      return [this.form.province, this.form.city, this.form.district].filter(Boolean).join(' ')
    }
  },
  onLoad(options) {
    if (!options.id) return
    this.editId = options.id
    // 编辑模式：等地址列表回来再回填（后端已按默认地址置顶排序）
    loadAddresses(true).then((list) => {
      const addr = list.find((a) => String(a.id) === String(options.id))
      if (addr) this.fillForm(addr)
    })
  },
  methods: {
    // 回填表单（编辑模式）
    fillForm(addr) {
      this.form.name = addr.name || ''
      this.form.phone = addr.phone || ''
      this.form.detail = addr.detail || ''
      this.form.isDefault = !!addr.isDefault
      this.applyRegion(addr.province, addr.city, addr.district)
    },
    /**
     * 把省市区写入表单并同步滚轮游标
     * @returns {boolean} 三级是否全部命中国标数据
     */
    applyRegion(province, city, district) {
      const checked = resolveRegion(province, city, district)
      const pIdx = PROVINCES.indexOf(checked.province)
      if (pIdx < 0) return false
      const cities = citiesOf(checked.province)
      const cIdx = cities.indexOf(checked.city)
      const districts = cIdx >= 0 ? districtsOf(checked.province, cities[cIdx]) : []
      const dIdx = cIdx >= 0 ? districts.indexOf(checked.district) : -1
      this.regionRange = [PROVINCES, cities, districts]
      this.regionIndex = [pIdx, cIdx >= 0 ? cIdx : 0, dIdx >= 0 ? dIdx : 0]
      this.form.province = checked.province
      this.form.city = cIdx >= 0 ? checked.city : ''
      this.form.district = dIdx >= 0 ? checked.district : ''
      return dIdx >= 0
    },
    // 粘贴文本智能识别：识别到几级填几级，缺的级别高亮提示手选
    onPaste() {
      const text = this.pasteText.trim()
      if (!text) {
        this.recognized = false
        this.recognizeTip = ''
        this.recognizeBad = false
        return
      }
      const result = recognizeAddress(text)
      this.recognized = result.ok
      if (result.name) this.form.name = result.name
      if (result.phone) this.form.phone = result.phone
      if (result.detail) this.form.detail = result.detail
      if (result.level > 0) this.applyRegion(result.province, result.city, result.district)
      const labels = { province: '省', city: '市', district: '区/县' }
      const missing = result.missing.map((key) => labels[key]).join('、')
      if (result.level === 3) {
        this.recognizeBad = false
        this.regionWarn = false
        this.recognizeTip = `已识别 ${result.province} ${result.city} ${result.district}，请核对详细地址`
      } else if (result.level > 0) {
        this.recognizeBad = true
        this.regionWarn = true
        this.recognizeTip = `已识别到${this.regionText}，请手动补全${missing}`
      } else {
        this.recognizeBad = true
        this.regionWarn = !this.form.province
        this.recognizeTip = result.detail || result.name ? '未能识别省市区，请手动选择' : '未识别到有效内容，请检查粘贴文本'
      }
    },
    // 微信地址一键导入（仅微信小程序端编译）
    importFromWeChat() {
      // #ifdef MP-WEIXIN
      uni.chooseAddress({
        success: (res) => {
          this.form.name = res.userName || this.form.name
          this.form.phone = res.telNumber || this.form.phone
          this.form.detail = res.detailInfo || this.form.detail
          const matched = this.applyRegion(res.provinceName, res.cityName, res.countyName)
          if (matched) {
            this.regionWarn = false
            this.recognizeTip = '已从微信地址导入'
            this.recognizeBad = false
            uni.showToast({ title: '已导入微信地址', icon: 'success' })
          } else {
            // 三级对不上国标数据时，把原文放进具体地址，避免信息丢失
            this.form.detail = [res.provinceName, res.cityName, res.countyName, res.detailInfo].filter(Boolean).join('')
            this.regionWarn = true
            this.recognizeBad = true
            this.recognizeTip = '微信地址与系统区划不完全匹配，请手动选择省市区'
            uni.showToast({ title: '已导入，请确认省市区', icon: 'none' })
          }
        },
        fail: () => {}
      })
      // #endif
    },
    // 滚轮列滚动联动：换省 → 重置市/区列；换市 → 重置区列
    onRegionColumnChange(e) {
      const column = Number(e.detail.column)
      const value = Number(e.detail.value)
      if (column === 0) {
        const province = PROVINCES[value]
        const cities = citiesOf(province)
        this.regionRange = [PROVINCES, cities, districtsOf(province, cities[0])]
        this.regionIndex = [value, 0, 0]
      } else if (column === 1) {
        const province = PROVINCES[this.regionIndex[0]]
        const cities = this.regionRange[1]
        this.regionRange = [PROVINCES, cities, districtsOf(province, cities[value])]
        this.regionIndex = [this.regionIndex[0], value, 0]
      } else {
        this.regionIndex = [this.regionIndex[0], this.regionIndex[1], value]
      }
    },
    // 点「确定」才落到表单
    onRegionConfirm(e) {
      const idx = (e.detail.value || []).map(Number)
      this.regionIndex = [idx[0] || 0, idx[1] || 0, idx[2] || 0]
      this.form.province = this.regionRange[0][this.regionIndex[0]] || ''
      this.form.city = this.regionRange[1][this.regionIndex[1]] || ''
      this.form.district = this.regionRange[2][this.regionIndex[2]] || ''
      if (this.form.province && this.form.city && this.form.district) {
        this.regionWarn = false
        this.recognizeBad = false
        this.recognizeTip = ''
      }
    },
    onDefaultChange(e) {
      this.form.isDefault = !!(e.detail && e.detail.value)
    },
    save() {
      if (this.saving) return
      const { name, phone, province, city, district, detail } = this.form
      if (!isLoggedIn()) return uni.showToast({ title: '请先登录后保存地址', icon: 'none' })
      if (!name.trim()) return uni.showToast({ title: '请填写收货人姓名', icon: 'none' })
      if (!/^1[3-9]\d{9}$/.test(phone.trim())) return uni.showToast({ title: '手机号格式不正确', icon: 'none' })
      if (!province || !city || !district) {
        this.regionWarn = true
        return uni.showToast({ title: '请选择完整的省市区', icon: 'none' })
      }
      if (!detail.trim()) return uni.showToast({ title: '请填写具体地址', icon: 'none' })

      this.saving = true
      const payload = { ...this.form }
      const task = this.editId ? updateAddress(this.editId, payload) : createAddress(payload)
      task
        .then(() => {
          uni.showToast({ title: '地址已保存', icon: 'none' })
          setTimeout(() => {
            uni.navigateBack({ delta: 1 })
          }, 600)
        })
        .catch((err) => {
          uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
        })
        .then(() => {
          this.saving = false
        })
    },
    goBack() {
      uni.navigateBack({ delta: 1 })
    }
  }
}
</script>

<style scoped>
.add-address-page {
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

.card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

/* 粘贴智能识别卡片（渐变顶条 + 图标徽标 + 聚焦高亮） */
.paste-card {
  position: relative;
  overflow: hidden;
}
.paste-glow {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 6rpx;
  background: linear-gradient(90deg, #52c47d, #27b969, #15995a);
}
.paste-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.paste-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.paste-icon {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #52c47d, #27b969);
  color: #fff;
  font-size: 24rpx;
}
.paste-title {
  font-size: 28rpx;
  font-weight: 800;
}
.paste-auto {
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #15995a;
  background: rgba(39, 185, 105, 0.1);
  font-weight: 600;
}
.paste-auto.done {
  background: #27b969;
  color: #fff;
}
.paste-input {
  width: 100%;
  min-height: 132rpx;
  padding: 20rpx;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  border-radius: 12rpx;
  background: #f8faf8;
  font-size: 24rpx;
  line-height: 1.6;
  transition: all 0.2s;
}
.paste-input.focused {
  border-color: #27b969;
  background: #fff;
  box-shadow: 0 0 0 6rpx rgba(39, 185, 105, 0.08);
}
.paste-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
}
.paste-hint {
  font-size: 20rpx;
  color: #9aa09b;
}
.wx-import {
  font-size: 22rpx;
  color: #15995a;
  font-weight: 600;
}
/* 识别结果反馈条 */
.recognize-tip {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #15995a;
  background: rgba(39, 185, 105, 0.08);
}
.recognize-tip.bad {
  color: #d9820b;
  background: #fff7e6;
}

/* 地址表单 */
.form-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f2ef;
}
.form-row:last-child {
  border-bottom: none;
}
.form-label {
  width: 140rpx;
  flex: none;
  font-size: 26rpx;
  color: #3a3f3b;
}
.form-input {
  flex: 1;
  font-size: 26rpx;
  color: #1f2320;
}
/* 省市区：一行入口（点击弹底部三列滚轮） */
.region-cell {
  flex: 1;
  min-width: 0;
}
.region-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border: 1rpx solid #dce5de;
  border-radius: 12rpx;
  background: #f8fbf9;
}
.region-entry.warn {
  border-color: #f0c48a;
  background: #fffaf0;
}
.region-text {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #1f2320;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.region-entry.empty .region-text {
  color: #b6bcb7;
}
.region-arrow {
  flex: none;
  font-size: 30rpx;
  color: #b6bcb7;
  line-height: 1;
}
.detail-row {
  align-items: flex-start;
}
.detail-row .form-label {
  padding-top: 10rpx;
}
.form-textarea {
  flex: 1;
  min-height: 70rpx;
  font-size: 26rpx;
  line-height: 1.6;
}
.switch-wrap {
  flex: 1;
  display: flex;
  align-items: center;
}

.bottom-space {
  height: 160rpx;
}

/* 底部保存栏（居中限宽，适配桌面 H5 手机壳预览） */
.save-bar {
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
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  z-index: 10;
}
.save-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  border-radius: 38rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}
.save-btn.disabled {
  opacity: 0.6;
}
</style>
