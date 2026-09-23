/**
 * API 请求工具模块
 *
 * 封装 uni.request，统一管理 BASE_URL、请求格式与会员登录态（token）。
 * H5 开发环境直连后端（后端已配置 CORS），微信小程序真实环境需配置合法域名。
 */

// 后端 API 地址（开发环境；后端已回到 8000 端口，手动启动无 reload）
const BASE_URL = 'https://zitangxhapiwx.yxiaozhu.com'

// 后端返回的相对路径资源（/static/...）→ 完整可访问 URL；已是完整 URL 或 base64 则原样返回
export function resolveAssetUrl(url) {
  if (!url) return ''
  if (url.indexOf('http') === 0 || url.indexOf('data:') === 0) return url
  if (url.indexOf('/static/') === 0 || url.indexOf('/uploads/') === 0) return BASE_URL + url
  return url
}

// ---- 会员登录态（token / 会员信息）----

export function getToken() {
  return uni.getStorageSync('member_token') || ''
}

export function setToken(token) {
  uni.setStorageSync('member_token', token || '')
}

export function clearToken() {
  uni.removeStorageSync('member_token')
  uni.removeStorageSync('member_profile')
}

export function getCachedMember() {
  return uni.getStorageSync('member_profile') || null
}

export function setCachedMember(member) {
  if (member) uni.setStorageSync('member_profile', member)
}

/**
 * 通用请求方法（自动携带会员 token，401 时清理登录态）
 * 登录态滑动续期：后端响应头 X-Member-Token 携带新 token 时自动替换本地存储（用一次续一个月）
 * @param {string} method - GET/POST/PUT/DELETE
 * @param {string} url - 接口路径（不含 BASE_URL）
 * @param {object} data - 请求数据
 * @returns {Promise<any>} 响应数据
 */
export function request(method, url, data = {}) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) header['Authorization'] = 'Bearer ' + token
    uni.request({
      url: BASE_URL + url,
      method: method,
      data: data,
      header: header,
      success(res) {
        // 滑动续期：后端下发的新 token 直接替换（不同端响应头键大小写不一致，两种都取）
        const newToken = res.header && (res.header['X-Member-Token'] || res.header['x-member-token'])
        if (newToken) setToken(newToken)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          if (res.statusCode === 401) clearToken()
          const msg = (res.data && res.data.detail) || '请求失败'
          reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

/**
 * GET 请求快捷方法
 */
export function get(url, data) {
  return request('GET', url, data)
}

/**
 * POST 请求快捷方法
 */
export function post(url, data) {
  return request('POST', url, data)
}

/**
 * PUT 请求快捷方法
 */
export function put(url, data) {
  return request('PUT', url, data)
}

/**
 * DELETE 请求快捷方法
 */
export function del(url, data) {
  return request('DELETE', url, data)
}

// ---- 活动页显示配置（底部「活动」菜单）----

// 活动类型 → 对应页面路径；none/未知类型 → 占位页
export const ACTIVITY_PAGE_MAP = {
  group: '/pages/group/index',
  lottery: '/pages/lottery/index',
  flash: '/pages/flash/index'
}
export const ACTIVITY_PLACEHOLDER_PAGE = '/pages/activity/index'

let _activityCache = null

/**
 * 获取当前展示的活动类型（none/group/lottery/flash）
 * 内存 + storage 两级缓存，避免底部栏频繁请求；请求失败时回退缓存值
 */
export function getActiveActivity() {
  if (_activityCache) return Promise.resolve(_activityCache)
  const cached = uni.getStorageSync('active_activity')
  return get('/api/wxapp/config/activity')
    .then((res) => {
      const activity = res && res.activity ? res.activity : 'none'
      _activityCache = activity
      uni.setStorageSync('active_activity', activity)
      return activity
    })
    .catch(() => {
      return cached || 'none'
    })
}

/**
 * 同步读取活动配置缓存（不发请求），未缓存返回 null
 */
export function getCachedActiveActivity() {
  if (_activityCache) return _activityCache
  const cached = uni.getStorageSync('active_activity')
  return cached || null
}

/**
 * 根据活动类型解析「活动」tab 目标页面路径
 */
export function resolveActivityPage(activity) {
  return ACTIVITY_PAGE_MAP[activity] || ACTIVITY_PLACEHOLDER_PAGE
}

// ---- 推广素材（推广列表 / 推广详情 / 分类）----

/**
 * 推广素材分类列表（公开接口，后台创建的分类驱动 tab，含各分类上架素材数）
 * @returns {Promise<{total:number, items:Array<{id:number,name:string,materialCount:number}>}>}
 */
export function getPromoCategories() {
  return get('/api/wxapp/promo-categories')
}

/**
 * 推广素材列表（公开接口，仅上架，含图片/文案/视频数量统计）
 * @param {number|string} [categoryId] - 分类 ID，不传=全部分类
 * @returns {Promise<{total:number, items:Array}>}
 */
export function getPromoMaterials(categoryId) {
  return get('/api/wxapp/promo-materials' + (categoryId ? '?category_id=' + categoryId : ''))
}

/**
 * 推广素材详情（公开接口，含完整图片列表/视频/文案）
 * @param {number|string} id - 素材 ID
 */
export function getPromoMaterialDetail(id) {
  return get('/api/wxapp/promo-materials/' + id)
}
