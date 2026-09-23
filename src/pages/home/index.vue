<template>
  <view class="page home-page">
    <view class="safe-top white"></view>
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-title">植萃生活</text>
    </view>
    <view class="home-shell">
      <!-- 顶部 Banner 轮播 -->
      <swiper v-if="banners.length > 0" class="hero-swiper" :indicator-dots="banners.length > 1"
        :autoplay="banners.length > 1" :circular="banners.length > 1" interval="4000" duration="500"
        indicator-active-color="#20b768" indicator-color="rgba(255,255,255,0.5)">
        <swiper-item v-for="(banner, idx) in banners" :key="banner.id" @tap="onBannerTap(banner)">
          <image class="hero-image" :src="banner.imageUrl" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <!-- 无 Banner 时显示默认图 -->
      <view v-else class="hero" @tap="showComing">
        <image src="/static/home-hero.jpg" mode="aspectFill" />
      </view>

      <!-- 快捷入口宫格（金刚区） -->
      <view class="quick-grid card">
        <view class="quick-item" @tap="goSharePoster">
          <image class="quick-icon" src="/static/quick-gift.png" mode="aspectFit" />
          <text class="quick-title">邀请有礼</text>
          <text class="quick-desc">邀好友 得奖励</text>
        </view>
        <view class="quick-item" @tap="showComing">
          <image class="quick-icon" src="/static/quick-play.png" mode="aspectFit" />
          <text class="quick-title">新手教程</text>
          <text class="quick-desc">快速上手指南</text>
        </view>
        <view class="quick-item" @tap="showComing">
          <image class="quick-icon" src="/static/quick-bottle.png" mode="aspectFit" />
          <text class="quick-title">产品介绍</text>
          <text class="quick-desc">了解产品卖点</text>
        </view>
        <view class="quick-item" @tap="goPromo">
          <image class="quick-icon" src="/static/quick-image.png" mode="aspectFit" />
          <text class="quick-title">推广素材</text>
          <text class="quick-desc">海量图文下载</text>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="search-row card">
        <view class="search-box">
          <view class="search-icon"></view>
          <input class="search-input" placeholder="搜索商品名称 / 品牌 / 功效" confirm-type="search" :value="searchValue"
            @confirm="onSearch" />
          <view class="search-submit" @tap="onSearch">搜索</view>
        </view>
      </view>

      <!-- 商城页 Banner 轮播（后台「商城页Banner」配置，展示在商品区上方） -->
      <!-- <swiper
        v-if="mallBanners.length > 0"
        class="mall-swiper"
        :indicator-dots="mallBanners.length > 1"
        :autoplay="mallBanners.length > 1"
        :circular="mallBanners.length > 1"
        interval="4500"
        duration="500"
        indicator-active-color="#20b768"
        indicator-color="rgba(255,255,255,0.5)"
      >
        <swiper-item v-for="(banner, idx) in mallBanners" :key="banner.id" @tap="onBannerTap(banner)">
          <image class="mall-swiper-image" :src="banner.imageUrl" mode="aspectFill" />
        </swiper-item>
      </swiper> -->

      <!-- 分类横向滚动 -->
      <scroll-view class="category-scroll card" scroll-x show-scrollbar="false">
        <view class="category-list">
          <view v-for="(cat, idx) in categories" :key="idx" class="category-item"
            :class="{ active: currentCategory === idx }" @tap="chooseCategory(idx)">
            <view class="category-art">
              <text>{{ cat.icon }}</text>
            </view>
            <text class="category-name">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 当季好物 -->
      <view class="section-heading">
        <text class="heading-title">当季好物</text>
        <text class="heading-sub">{{ productsTotal > 0 ? '共 ' + productsTotal + ' 款好物' : '自然配方 · 温和日用' }}</text>
      </view>

      <view class="product-grid">
        <view v-for="item in products" :key="item.id" class="product-card card" @tap="goDetail(item)">
          <view class="product-image-wrap">
            <image class="product-image" :src="item.image || placeholderImg" mode="aspectFill" />
          </view>
          <view class="product-content">
            <text class="product-title ellipsis">{{ item.title }}</text>
            <text class="product-desc ellipsis">{{ item.desc }}</text>
            <view class="tag-row" v-if="item.tags && item.tags.length > 0">
              <text v-for="(tag, ti) in item.tags" :key="ti">{{ tag }}</text>
            </view>
            <view class="price-row">
              <view class="price-info">
                <text class="currency">¥</text>
                <text class="price">{{ item.price }}</text>
                <text class="price-suffix" v-if="item.priceSuffix">{{ item.priceSuffix }}</text>
              </view>
              <view class="buy-btn" @tap.stop="openBuySheet(item)">购买</view>
            </view>
            <view class="sold-row" v-if="item.totalStock === 0">
              <text class="stock-text">已售罄</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="load-status" v-if="products.length > 0">
        <text v-if="loading">加载中...</text>
        <text v-else-if="!hasMore">没有更多商品了</text>
      </view>
      <view class="load-status" v-else-if="!loading">
        <text>暂无商品，请稍后再来</text>
      </view>
    </view>

    <!-- 购买弹窗（底部面板，参考原型 purchase-sheet） -->
    <view v-if="buying" class="buy-mask" @tap="closeBuySheet">
      <view class="buy-panel" @tap.stop>
        <!-- 头部：商品图 + 标题 + 价格 -->
        <view class="buy-head">
          <image class="buy-thumb" :src="buying.image" mode="aspectFill" />
          <view class="buy-info">
            <text class="buy-title ellipsis">{{ buying.title }}</text>
            <view class="buy-price-line">
              <text class="currency">¥</text>
              <text class="buy-price">{{ buySku ? fmtPrice(buySku.price) : buying.price }}</text>
              <text class="buy-stock" v-if="buySku">库存 {{ buySku.stock }}</text>
            </view>
          </view>
          <text class="buy-close" @tap="closeBuySheet">×</text>
        </view>

        <scroll-view class="buy-body" scroll-y>
          <!-- 规格选择：有规格组时展示 -->
          <view v-if="buySpecs.length > 0">
            <view v-for="(spec, si) in buySpecs" :key="si" class="buy-spec-group">
              <text class="buy-spec-name">{{ spec.name }}</text>
              <view class="buy-spec-options">
                <text v-for="(val, vi) in spec.values" :key="vi" class="buy-spec-option"
                  :class="{ active: buySelected[spec.name] === val, disabled: specStockEmpty(spec.name, val) }"
                  @tap="selectBuySpec(spec.name, val)">{{ val }}</text>
              </view>
            </view>
          </view>
          <view v-else class="buy-spec-name">默认规格</view>

          <!-- 数量 -->
          <view class="buy-qty-row">
            <text class="buy-spec-name">数量</text>
            <view class="buy-stepper">
              <text class="buy-step-btn" :class="{ disabled: buyQuantity <= 1 }" @tap="changeBuyQty(-1)">−</text>
              <text class="buy-step-num">{{ buyQuantity }}</text>
              <text class="buy-step-btn" :class="{ disabled: buyQuantity >= buyStock }" @tap="changeBuyQty(1)">＋</text>
            </view>
          </view>
        </scroll-view>

        <!-- 底部购买按钮（实时合计） -->
        <view class="buy-submit" :class="{ disabled: !buySku || buyStock <= 0 }" @tap="confirmBuy">
          {{ buySku && buyStock <= 0 ? '已售罄' : '购买 · ¥' + fmtPrice(buyTotal) }} </view>
        </view>
      </view>

      <!-- 底部 TabBar -->
      <TabBar current="home" />
    </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'
import { get, resolveAssetUrl } from '@/utils/api.js'
import { isLoggedIn } from '@/utils/auth.js'

export default {
  components: { TabBar },
  data() {
    return {
      banners: [],
      mallBanners: [],
      searchValue: '',
      currentCategory: 0,
      categories: [],
      products: [],
      productsTotal: 0,
      page: 1,
      pageSize: 10,
      hasMore: true,
      loading: false,
      placeholderImg: '/static/product-bath.jpg',
      // 购买弹窗状态
      buying: null,
      buySpecs: [],
      buySelected: {},
      buySkuList: [],
      buyQuantity: 1
    }
  },
  computed: {
    // 当前选中规格对应的 SKU（无规格组时取第一个）
    buySku() {
      if (!this.buying) return null
      const names = this.buySpecs.map(s => s.name)
      if (names.length === 0) return this.buySkuList[0] || null
      return this.buySkuList.find(sku => {
        return names.every(n => sku.spec_values[n] === this.buySelected[n])
      }) || null
    },
    buyStock() {
      return this.buySku ? (this.buySku.stock || 0) : 0
    },
    buyTotal() {
      const price = this.buySku ? Number(this.buySku.price) : (Number(this.buying ? this.buying.price : 0) || 0)
      return price * this.buyQuantity
    }
  },
  onLoad() {
    this.loadBanners()
    this.loadMallBanners()
    this.loadCategories()
    this.loadProducts(true)
  },
  onShow() {
    // 主菜单间切换回来时重新拉取数据（首次进入由 onLoad 负责，避免重复请求）
    if (this._loadedOnce) {
      this.loadBanners()
      this.loadMallBanners()
      this.loadCategories()
      this.loadProducts(true)
    }
    this._loadedOnce = true
  },
  onPullDownRefresh() {
    Promise.all([this.loadBanners(), this.loadMallBanners(), this.loadCategories(), this.loadProducts(true)]).finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  // 上拉触底加载更多
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadProducts(false)
    }
  },
  methods: {
    // 金额格式化：整数不带小数位，非整数保留两位
    fmtPrice(v) {
      const n = Number(v) || 0
      return n % 1 === 0 ? String(n) : n.toFixed(2)
    },
    // 加载首页 Banner（从后端拉取已启用的轮播图）
    async loadBanners() {
      try {
        const resp = await get('/api/wxapp/banners', { type: 'home' })
        this.banners = (resp.items || [])
          .map(b => ({ ...b, imageUrl: resolveAssetUrl(b.imageUrl) }))
          .filter(b => !!b.imageUrl)
      } catch (e) {
        console.error('加载 Banner 失败:', e)
      }
    },
    // 加载商城页 Banner（商品区上方轮播，后台「商城页Banner」配置）
    async loadMallBanners() {
      try {
        const resp = await get('/api/wxapp/banners', { type: 'mall' })
        this.mallBanners = (resp.items || [])
          .map(b => ({ ...b, imageUrl: resolveAssetUrl(b.imageUrl) }))
          .filter(b => !!b.imageUrl)
      } catch (e) {
        console.error('加载商城 Banner 失败:', e)
      }
    },
    // 加载商品分类（真实分类 + 前置“全部”项）
    async loadCategories() {
      try {
        const resp = await get('/api/wxapp/categories')
        const cats = resp.items || []
        this.categories = [{ id: null, name: '全部', icon: '▦' }].concat(
          cats.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📦' }))
        )
        if (this.currentCategory >= this.categories.length) this.currentCategory = 0
      } catch (e) {
        console.error('加载分类失败:', e)
      }
    },
    // 加载商品列表（reset=true 重新从第一页加载）
    async loadProducts(reset) {
      if (this.loading) return
      this.loading = true
      try {
        const page = reset ? 1 : this.page
        const cat = this.categories[this.currentCategory]
        const params = {
          page: page,
          size: this.pageSize
        }
        const keyword = this.searchValue ? this.searchValue.trim() : ''
        if (keyword) params.keyword = keyword
        if (cat && cat.id) params.category_id = cat.id
        const resp = await get('/api/wxapp/products', params)
        const items = (resp.items || []).map(p => ({
          id: p.id,
          image: resolveAssetUrl(p.coverUrl) || this.placeholderImg,
          title: p.name,
          desc: p.subtitle || '',
          tags: [],
          price: p.priceMin > 0 ? (p.priceMin % 1 === 0 ? String(p.priceMin) : p.priceMin.toFixed(2)) : '0.00',
          priceSuffix: p.priceMax > p.priceMin ? '起' : '',
          totalStock: p.totalStock
        }))
        this.products = reset ? items : this.products.concat(items)
        this.productsTotal = resp.total || 0
        this.page = page + 1
        this.hasMore = this.products.length < (resp.total || 0)
      } catch (e) {
        console.error('加载商品失败:', e)
        if (reset) this.products = []
      } finally {
        this.loading = false
      }
    },
    // 点击 Banner 跳转
    onBannerTap(banner) {
      if (banner.linkType === 'url' && banner.linkUrl) {
        uni.navigateTo({ url: banner.linkUrl })
      } else if (banner.linkType === 'product' && banner.linkProductId) {
        uni.navigateTo({ url: '/pages/product-detail/index?id=' + banner.linkProductId })
      }
    },
    chooseCategory(idx) {
      if (idx === this.currentCategory) return
      this.currentCategory = idx
      this.loadProducts(true)
    },
    onSearch() {
      this.loadProducts(true)
    },
    // 进入商品详情页
    goDetail(item) {
      uni.navigateTo({ url: '/pages/product-detail/index?id=' + item.id })
    },
    // ===== 购买弹窗（参考原型 purchase-sheet） =====
    // 打开弹窗：拉取详情获取规格/SKU 真实数据
    openBuySheet(item) {
      if (item.totalStock === 0) {
        uni.showToast({ title: '该商品已售罄', icon: 'none' })
        return
      }
      this.buying = item
      this.buySpecs = []
      this.buySelected = {}
      this.buySkuList = []
      this.buyQuantity = 1
      this.loadBuyDetail(item.id)
    },
    closeBuySheet() {
      this.buying = null
    },
    // 拉取商品详情：规格组 + SKU
    async loadBuyDetail(id) {
      try {
        const resp = await get('/api/wxapp/products/' + id)
        this.buySpecs = resp.specs || []
        this.buySkuList = resp.skus || []
        // 默认选中每个规格组第一项（保证有可匹配 SKU）
        const selected = {}
          ; (this.buySpecs).forEach(s => {
            if (s.values && s.values.length > 0) selected[s.name] = s.values[0]
          })
        this.buySelected = selected
      } catch (e) {
        console.error('加载购买规格失败:', e)
        uni.showToast({ title: '商品信息加载失败', icon: 'none' })
        this.closeBuySheet()
      }
    },
    selectBuySpec(name, val) {
      this.buySelected = { ...this.buySelected, [name]: val }
    },
    // 某规格值在所有 SKU 中均无库存时置灰
    specStockEmpty(name, val) {
      return this.buySkuList.length > 0 && !this.buySkuList.some(sku => {
        return sku.spec_values[name] === val && (sku.stock || 0) > 0
      })
    },
    changeBuyQty(delta) {
      const next = this.buyQuantity + delta
      if (next < 1 || (this.buySku && next > this.buySku.stock)) return
      this.buyQuantity = next
    },
    // 弹窗内确认购买 → 校验登录 → 跳确认订单
    confirmBuy() {
      if (!this.buySku) {
        uni.showToast({ title: '请选择规格', icon: 'none' })
        return
      }
      if (this.buySku.stock <= 0) {
        uni.showToast({ title: '该规格已售罄', icon: 'none' })
        return
      }
      if (!isLoggedIn()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          // 项目未配置原生 tabBar（自定义 TabBar），统一用 redirectTo 跳转
          uni.redirectTo({ url: '/pages/profile/index' })
        }, 800)
        return
      }
      const item = this.buying
      const skuId = this.buySku.id
      const qty = this.buyQuantity
      // 先缓存跳转参数再关闭弹窗（closeBuySheet 会清空 buying，buySku 随之置空）
      this.closeBuySheet()
      uni.navigateTo({
        url: '/pages/order-confirm/index?productId=' + item.id + '&skuId=' + skuId + '&quantity=' + qty
      })
    },
    showComing() {
      uni.showToast({ title: '功能即将开放', icon: 'none' })
    },
    goSharePoster() {
      uni.navigateTo({ url: '/pages/share-poster/index' })
    },
    // 进入「推广」tab 页（项目使用自定义 TabBar，tab 间跳转统一用 redirectTo）
    goPromo() {
      uni.redirectTo({ url: '/pages/promo/index' })
    }
  }
}
</script>

<style scoped>
.home-page {
  background: linear-gradient(#f3f8f2 0, #fff 520rpx);
}

.safe-top {
  height: env(safe-area-inset-top);
}

.safe-top.white {
  background: #fff;
}

/* 顶部导航 */
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

.home-shell {
  padding: 20rpx 24rpx 48rpx;
  overflow-x: hidden;
}

/* 顶部 Banner 轮播 */
.hero-swiper {
  height: 255rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(45, 110, 57, 0.12);
}

.hero-image {
  width: 100%;
  height: 255rpx;
}

/* 商城页 Banner 轮播（商品区上方） */
.mall-swiper {
  height: 200rpx;
  margin-bottom: 20rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(45, 110, 57, 0.1);
}

.mall-swiper-image {
  width: 100%;
  height: 200rpx;
}

/* 无 Banner 时默认图 */
.hero {
  height: 255rpx;
  overflow: hidden;
  border-radius: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(45, 110, 57, 0.12);
}

.hero image {
  width: 100%;
  height: 100%;
}

/* 快捷入口（金刚区） */
.quick-grid {
  margin-top: 20rpx;
  padding: 28rpx 14rpx;
  display: flex;
  justify-content: space-between;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.quick-icon {
  width: 88rpx;
  height: 88rpx;
  flex: none;
}

.quick-title {
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.2;
}

.quick-desc {
  font-size: 18rpx;
  color: #7d837f;
  white-space: nowrap;
  line-height: 1.2;
}

/* 搜索栏 */
.search-row {
  margin-top: 20rpx;
  padding: 8rpx;
}

.search-row .search-box {
  background: #f8faf8;
}

.search-submit {
  width: 110rpx;
  height: 58rpx;
  line-height: 58rpx;
  text-align: center;
  color: #fff;
  border-radius: 32rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
}

/* 分类滚动 */
.category-scroll {
  margin-top: 20rpx;
  width: 100%;
}

.category-list {
  display: inline-flex;
  padding: 18rpx 12rpx;
  gap: 8rpx;
  white-space: nowrap;
}

.category-item {
  width: 108rpx;
  height: 120rpx;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  font-size: 21rpx;
  border-radius: 18rpx;
}

.category-item.active {
  color: #20b768;
  background: #eaf8ef;
  font-weight: 700;
}

.category-name {
  max-width: 96rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.category-art {
  height: 52rpx;
  width: 52rpx;
  line-height: 52rpx;
  border-radius: 16rpx;
  text-align: center;
  color: #176c39;
  font-size: 39rpx;
  background: linear-gradient(145deg, #edf8f0, #fff);
}

/* 区块标题 */
.section-heading {
  margin: 30rpx 4rpx 18rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.heading-title {
  font-size: 34rpx;
  font-weight: 800;
}

.heading-sub {
  font-size: 22rpx;
  color: #7d837f;
}

/* 商品网格 */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}

.product-card {
  width: calc(50% - 9rpx);
  overflow: hidden;
}

.product-image-wrap {
  width: 100%;
  padding-top: 100%;
  position: relative;
  background: #f2f5f1;
  overflow: hidden;
}

.product-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.product-content {
  padding: 18rpx 18rpx 20rpx;
}

.product-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
}

.product-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #747a75;
}

.tag-row {
  margin-top: 12rpx;
  height: 35rpx;
  display: flex;
  gap: 7rpx;
  overflow: hidden;
}

.tag-row text {
  padding: 4rpx 9rpx;
  border-radius: 7rpx;
  color: #15995a;
  background: #eaf8ef;
  border: 1rpx solid #b8ebca;
  font-size: 18rpx;
  white-space: nowrap;
}

.price-row {
  margin-top: 16rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.price-info {
  display: flex;
  align-items: baseline;
}

.currency {
  color: #ff3b42;
  font-size: 22rpx;
}

.price {
  color: #ff3b42;
  font-size: 34rpx;
  font-weight: 800;
}

.buy-btn {
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
}

.price-suffix {
  margin-left: 4rpx;
  color: #ff3b42;
  font-size: 20rpx;
}

.sold-row {
  margin-top: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sold-text {
  font-size: 20rpx;
  color: #9aa09b;
}

.stock-text {
  font-size: 20rpx;
  color: #ff3b42;
}

.load-status {
  padding: 28rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #9aa09b;
}

/* ===== 购买弹窗（底部面板，参考原型 purchase-sheet；居中限宽适配桌面手机壳） ===== */
.buy-mask {
  position: fixed;
  left: 50%;
  right: auto;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 750rpx;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}

.buy-panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  max-height: 72vh;
  display: flex;
  flex-direction: column;
}

.buy-head {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f2ef;
}

.buy-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #f2f5f1;
  flex: none;
}

.buy-info {
  flex: 1;
  min-width: 0;
}

.buy-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.4;
}

.buy-price-line {
  margin-top: 10rpx;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.buy-price {
  color: #ff3b42;
  font-size: 38rpx;
  font-weight: 800;
}

.buy-stock {
  font-size: 22rpx;
  color: #9aa09b;
}

.buy-close {
  font-size: 40rpx;
  color: #c0c4c0;
  padding: 0 8rpx;
}

.buy-body {
  flex: 1;
  overflow: hidden;
  max-height: 40vh;
  padding-top: 24rpx;
}

.buy-spec-group {
  margin-bottom: 24rpx;
}

.buy-spec-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}

.buy-spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.buy-spec-option {
  padding: 12rpx 28rpx;
  border-radius: 10rpx;
  background: #f5f7f4;
  border: 1rpx solid #f5f7f4;
  font-size: 24rpx;
  color: #3a3f3b;
}

.buy-spec-option.active {
  background: #eaf8ef;
  border-color: #27b969;
  color: #15995a;
  font-weight: 700;
}

.buy-spec-option.disabled {
  opacity: 0.4;
  color: #9aa09b;
}

.buy-qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8rpx;
}

.buy-qty-row .buy-spec-name {
  margin-bottom: 0;
}

.buy-stepper {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.buy-step-btn {
  width: 48rpx;
  height: 48rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 8rpx;
  background: #f5f7f4;
  color: #3a3f3b;
  font-size: 30rpx;
}

.buy-step-btn.disabled {
  opacity: 0.35;
}

.buy-step-num {
  min-width: 40rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
}

.buy-submit {
  margin-top: 20rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  background: linear-gradient(90deg, #52c47d, #27b969);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.buy-submit.disabled {
  opacity: 0.5;
}
</style>
