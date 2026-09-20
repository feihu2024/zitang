<template>
  <view class="page promo-page">
    <view class="safe-top promo-top-bg"></view>
    <view class="promo-shell">

      <!-- 顶部导航 -->
      <view class="promo-nav">
        <text class="nav-title">推广素材</text>
        <text class="nav-instructions" @tap="showInstructions">▣ 使用说明</text>
      </view>

      <!-- 搜索栏 -->
      <view class="promo-search">
        <view class="search-box">
          <view class="search-icon"></view>
          <input
            class="search-input"
            placeholder="搜索素材名称"
            confirm-type="search"
            :value="searchValue"
            @input="onSearchInput"
            @confirm="onSearch"
          />
        </view>
      </view>

      <!-- 宣传页 Banner 轮播（后台「宣传页Banner」配置） -->
      <swiper
        v-if="banners.length > 0"
        class="promo-banner"
        :indicator-dots="banners.length > 1"
        :autoplay="banners.length > 1"
        :circular="banners.length > 1"
        interval="4500"
        duration="500"
        indicator-active-color="#168444"
        indicator-color="rgba(255,255,255,0.5)"
      >
        <swiper-item v-for="(banner, idx) in banners" :key="banner.id" @tap="onBannerTap(banner)">
          <image class="promo-banner-img" :src="banner.imageUrl" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 分类标签横向滚动 -->
      <scroll-view class="promo-tabs" scroll-x show-scrollbar="false">
        <view class="promo-tab-list">
          <text
            v-for="(tab, idx) in tabs"
            :key="idx"
            class="promo-tab"
            :class="{ active: currentTab === idx }"
            @tap="setTab(idx)"
          >{{ tab }}</text>
        </view>
      </scroll-view>

      <!-- 排序筛选 -->
      <view class="promo-sort">
        <text class="sort-text" @tap="showSort">{{ sortLabel }}<text class="sort-caret">⌄</text></text>
        <text class="filter-text" :class="{ active: !!filterMode }" @tap="showFilter">▽ 筛选{{ filterLabel }}</text>
      </view>

      <!-- 加载中 -->
      <view v-if="loading && items.length === 0" class="promo-state">
        <text class="state-icon">⏳</text>
        <text class="state-text">素材加载中…</text>
      </view>
      <!-- 加载失败 -->
      <view v-else-if="loadError && items.length === 0" class="promo-state" @tap="loadData">
        <text class="state-icon">⚠️</text>
        <text class="state-text">{{ loadError }}</text>
        <text class="state-retry">点击重试</text>
      </view>
      <!-- 空态 -->
      <view v-else-if="filteredItems.length === 0" class="promo-state">
        <text class="state-icon">🗂️</text>
        <text class="state-text">{{ items.length === 0 ? '暂无推广素材' : '没有符合条件的内容' }}</text>
      </view>
      <!-- 素材列表 -->
      <view v-else class="promo-list">
        <view
          v-for="item in filteredItems"
          :key="item.id"
          class="promo-card card"
        >
          <image class="promo-image" :src="item.cover" mode="aspectFill" />
          <view class="promo-main">
            <view class="promo-title">
              <text class="ellipsis">{{ item.title }}</text>
              <text v-if="item.tag" class="promo-tag" :class="item.tagClass">{{ item.tag }}</text>
            </view>
            <text class="promo-meta">{{ item.count }}个素材　 {{ item.date }} 更新</text>
            <view class="promo-counts">
              <view class="count-item">
                <text class="count-symbol">▱ {{ item.poster }}</text>
                <text class="count-label">海报</text>
              </view>
              <view class="count-item">
                <text class="count-symbol">▯ {{ item.copy }}</text>
                <text class="count-label">文案</text>
              </view>
              <view class="count-item">
                <text class="count-symbol">▣ {{ item.video }}</text>
                <text class="count-label">视频</text>
              </view>
            </view>
          </view>
          <view class="view-btn" @tap="viewAssets(item)">查看素材</view>
        </view>
      </view>

      <!-- 推广小贴士 -->
      <view class="promo-tip" @tap="showTip">
        ☼　推广小贴士：分享优质素材，可提升转化效果哦~　›
      </view>
    </view>

    <!-- 底部 TabBar -->
    <TabBar current="promo" />
  </view>
</template>

<script>
import TabBar from '@/components/TabBar/TabBar.vue'
import { get, getPromoMaterials, getPromoCategories, resolveAssetUrl } from '@/utils/api.js'

const NEW_DAYS = 7     // 更新时间在 N 天内标记「上新」
const HOT_COUNT = 10   // 素材数达到该值标记「热门」

export default {
  components: { TabBar },
  data() {
    return {
      searchValue: '',
      currentTab: 0,
      sortLabel: '最新发布',
      sortMode: 'latest',   // latest=最新发布 count=素材最多
      filterMode: '',       // ''=不限 new=仅看上新 hot=仅看热门
      tabs: ['全部'],        // 「全部」+ 后台创建的分类（loadCategories 填充）
      categories: [],        // { id, name, materialCount }
      items: [],
      banners: [],
      loading: false,
      loadError: ''
    }
  },
  computed: {
    filterLabel() {
      if (this.filterMode === 'new') return '·上新'
      if (this.filterMode === 'hot') return '·热门'
      return ''
    },
    filteredItems() {
      let list = this.items.slice()
      // 关键词过滤（名称）
      const kw = this.searchValue.trim().toLowerCase()
      if (kw) {
        list = list.filter(item => (item.title || '').toLowerCase().indexOf(kw) !== -1)
      }
      // 分类 tab 过滤（currentTab 0=全部，之后与 this.categories 一一对应）
      if (this.currentTab > 0) {
        const cat = this.categories[this.currentTab - 1]
        if (cat) list = list.filter(item => item.categoryId === cat.id)
      }
      // 筛选
      if (this.filterMode === 'new') list = list.filter(item => item.isNew)
      if (this.filterMode === 'hot') list = list.filter(item => item.count >= HOT_COUNT)
      // 排序
      if (this.sortMode === 'count') {
        list.sort((a, b) => b.count - a.count || b.updatedTs - a.updatedTs)
      } else {
        list.sort((a, b) => b.updatedTs - a.updatedTs)
      }
      return list
    }
  },
  onLoad() {
    this.loadBanners()
    this.loadCategories()
    this.loadData()
  },
  onShow() {
    // 主菜单间切换回来时重新拉取数据（首次进入由 onLoad 负责，避免重复请求）
    if (this._loadedOnce) {
      this.loadBanners()
      this.loadCategories()
      this.loadData()
    }
    this._loadedOnce = true
  },
  onPullDownRefresh() {
    Promise.all([this.loadBanners(), this.loadCategories(), this.loadData()])
      .finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    /** 拉取宣传页 Banner（后台「宣传页Banner」配置，仅已启用） */
    async loadBanners() {
      try {
        const resp = await get('/api/wxapp/banners', { type: 'promo' })
        this.banners = (resp.items || [])
          .map(b => ({ ...b, imageUrl: resolveAssetUrl(b.imageUrl) }))
          .filter(b => !!b.imageUrl)
      } catch (e) {
        console.error('加载宣传 Banner 失败:', e)
      }
    },
    /** Banner 点击跳转：url=内部页面路径，product=商品详情 */
    onBannerTap(banner) {
      if (banner.linkType === 'url' && banner.linkUrl) {
        uni.navigateTo({ url: banner.linkUrl })
      } else if (banner.linkType === 'product' && banner.linkProductId) {
        uni.navigateTo({ url: '/pages/product-detail/index?id=' + banner.linkProductId })
      }
    },
    /** 拉取推广素材分类（后台创建的分类驱动 tab；失败时仅显示「全部」） */
    loadCategories() {
      return getPromoCategories()
        .then((res) => {
          this.categories = (res && res.items ? res.items : []).map(c => ({
            id: c.id,
            name: c.name,
            count: c.materialCount || 0
          }))
          this.tabs = ['全部'].concat(this.categories.map(c => c.name))
          // 分类收缩时收敛选中索引，避免越界
          if (this.currentTab > this.categories.length) this.currentTab = 0
        })
        .catch(() => {
          // 分类拉取失败不阻断素材列表展示
          this.categories = []
          this.tabs = ['全部']
        })
    },
    /** 拉取推广素材列表（后端仅返回上架资料） */
    loadData() {
      this.loading = true
      this.loadError = ''
      return getPromoMaterials()
        .then((res) => {
          this.items = (res && res.items ? res.items : []).map(this.mapItem)
        })
        .catch((err) => {
          this.loadError = (err && err.message) || '加载失败，请检查网络'
        })
        .finally(() => {
          this.loading = false
        })
    },
    /** 后端字段 → 卡片展示字段（含上新/热门标签与时间戳） */
    mapItem(m) {
      const poster = m.posterCount || 0
      const copy = m.copyCount || 0
      const video = m.videoCount || 0
      const updatedTs = m.updatedAt ? (new Date(String(m.updatedAt).replace(' ', 'T')).getTime() || 0) : 0
      const isNew = updatedTs > 0 && Date.now() - updatedTs < NEW_DAYS * 86400000
      const count = m.count || (poster + copy + video)
      return {
        id: m.id,
        categoryId: m.categoryId || 0,
        categoryName: m.categoryName || '',
        cover: resolveAssetUrl(m.cover),
        title: m.name || '',
        count: count,
        date: m.updatedAt ? String(m.updatedAt).slice(0, 10).replace(/-/g, '.') : '',
        poster: poster,
        copy: copy,
        video: video,
        isNew: isNew,
        updatedTs: updatedTs,
        // 标签：上新优先，其次热门
        tag: isNew ? '上新' : (count >= HOT_COUNT ? '热门' : ''),
        tagClass: isNew ? 'new' : 'hot'
      }
    },
    setTab(idx) {
      this.currentTab = idx
    },
    onSearchInput(e) {
      this.searchValue = e.detail.value
    },
    onSearch() {
      // 输入即实时过滤，回车仅收起键盘
      if (this.searchValue.trim()) uni.hideKeyboard && uni.hideKeyboard()
    },
    viewAssets(item) {
      uni.navigateTo({
        url: '/pages/promo-detail/index?id=' + item.id
      })
    },
    showInstructions() {
      uni.showModal({
        title: '使用说明',
        content: '素材可用于朋友圈、社群及短视频推广。请勿修改品牌标识或用于非授权渠道。',
        showCancel: false
      })
    },
    /** 排序 + 筛选（与原型一致的 ActionSheet 交互） */
    showSort() {
      uni.showActionSheet({
        itemList: ['最新发布', '素材最多', '仅看上新', '仅看热门'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.sortMode = 'latest'
            this.sortLabel = '最新发布'
            this.filterMode = ''
          } else if (res.tapIndex === 1) {
            this.sortMode = 'count'
            this.sortLabel = '素材最多'
            this.filterMode = ''
          } else if (res.tapIndex === 2) {
            this.filterMode = this.filterMode === 'new' ? '' : 'new'
          } else if (res.tapIndex === 3) {
            this.filterMode = this.filterMode === 'hot' ? '' : 'hot'
          }
        }
      })
    },
    showFilter() {
      this.showSort()
    },
    showTip() {
      uni.showToast({
        title: '分享优质素材，可提升转化效果',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.promo-page {
  background: #fafafa;
  overflow-x: hidden;
}
.promo-top-bg {
  background: #fff;
}
.promo-shell {
  padding-bottom: 48rpx;
  overflow-x: hidden;
}

/* 顶部导航 */
.promo-nav {
  height: 82rpx;
  padding: 0 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  position: relative;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
}
.nav-instructions {
  position: absolute;
  right: 33rpx;
  font-size: 22rpx;
  color: #555;
}

/* 搜索栏 */
.promo-search {
  padding: 18rpx 26rpx;
  background: #fff;
}
.promo-search .search-box {
  background: #f7f7f7;
}

/* 宣传页 Banner 轮播 */
.promo-banner {
  height: 220rpx;
  margin: 18rpx 24rpx 0;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(22, 132, 68, 0.1);
}
.promo-banner-img {
  width: 100%;
  height: 220rpx;
}

/* 分类标签 */
.promo-tabs {
  background: #fff;
  border-bottom: 1rpx solid #eee;
}
.promo-tab-list {
  height: 82rpx;
  display: inline-flex;
  align-items: center;
  padding: 0 32rpx;
  gap: 52rpx;
}
.promo-tab {
  height: 82rpx;
  line-height: 82rpx;
  position: relative;
  white-space: nowrap;
  color: #555;
  font-size: 25rpx;
}
.promo-tab.active {
  color: #168444;
  font-weight: 700;
}
.promo-tab.active::after {
  content: '';
  position: absolute;
  left: 20%;
  bottom: 0;
  width: 60%;
  height: 5rpx;
  border-radius: 5rpx;
  background: #168444;
}

/* 排序筛选 */
.promo-sort {
  height: 82rpx;
  padding: 0 48rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  font-size: 23rpx;
  color: #555;
}
.sort-caret {
  margin-left: 8rpx;
  color: #999;
}

/* 素材列表 */
.promo-list {
  padding: 0 24rpx;
}
.promo-card {
  min-height: 190rpx;
  margin-bottom: 14rpx;
  padding: 18rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.promo-image {
  width: 150rpx;
  height: 164rpx;
  flex: none;
  border-radius: 13rpx;
}
.promo-main {
  flex: 1;
  min-width: 0;
}
.promo-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.promo-title .ellipsis {
  max-width: 360rpx;
  font-size: 27rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.promo-tag {
  padding: 4rpx 10rpx;
  border-radius: 18rpx;
  font-size: 17rpx;
  white-space: nowrap;
}
.promo-tag.new {
  color: #1c9e55;
  background: #e9f8ee;
}
.promo-tag.hot {
  color: #258edc;
  background: #eaf4fd;
}
.promo-meta {
  display: block;
  margin-top: 16rpx;
  color: #969a97;
  font-size: 20rpx;
}
.promo-counts {
  display: flex;
  margin-top: 24rpx;
  gap: 42rpx;
  color: #4d514e;
  font-size: 20rpx;
}
.count-item {
  display: flex;
  flex-direction: column;
}
.count-label {
  margin-top: 5rpx;
  color: #777;
  font-size: 17rpx;
}
.view-btn {
  width: 112rpx;
  height: 48rpx;
  line-height: 48rpx;
  flex: none;
  border: 1rpx solid #25a95a;
  border-radius: 27rpx;
  color: #1d9a50;
  text-align: center;
  font-size: 20rpx;
}

/* 推广小贴士 */
.promo-tip {
  margin: 8rpx 24rpx 0;
  padding: 17rpx;
  border-radius: 15rpx;
  background: linear-gradient(90deg, #f1faf4, #f6fbf9);
  color: #5d625e;
  font-size: 20rpx;
}

/* 列表状态（加载中/空态/失败） */
.promo-state {
  margin: 30rpx 24rpx 0;
  padding: 90rpx 20rpx;
  border-radius: 15rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state-icon {
  font-size: 60rpx;
}
.state-text {
  margin-top: 18rpx;
  color: #9aa09c;
  font-size: 24rpx;
}
.state-retry {
  margin-top: 22rpx;
  padding: 10rpx 40rpx;
  border: 1rpx solid #25a95a;
  border-radius: 30rpx;
  color: #1d9a50;
  font-size: 23rpx;
}

/* 筛选激活态 */
.promo-sort .filter-text.active {
  color: #168444;
  font-weight: 700;
}

/* 搜索栏复用全局 search-box 样式 */
.promo-search .search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 66rpx;
  padding: 0 20rpx;
  border-radius: 33rpx;
}
.promo-search .search-icon {
  width: 26rpx;
  height: 26rpx;
  flex: none;
  border: 4rpx solid #999;
  border-radius: 50%;
  position: relative;
}
.promo-search .search-icon::after {
  content: '';
  position: absolute;
  right: -6rpx;
  bottom: -3rpx;
  width: 12rpx;
  height: 4rpx;
  background: #999;
  border-radius: 2rpx;
  transform: rotate(45deg);
}
.promo-search .search-input {
  flex: 1;
  font-size: 24rpx;
}
</style>
