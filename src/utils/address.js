/**
 * 收货地址工具（后端地址簿 + 内存缓存）
 *
 * 地址存在后端 member_addresses 表（换设备/清缓存不再丢），本模块维护一份
 * 内存缓存，页面上 onShow 调 loadAddresses() 拉取，渲染时同步读 getAddresses()：
 *   wx_selected_address_id — 确认订单页当前选中的地址 id（仅本机偏好，留在本地）
 */
import { get, post, put, del } from './api.js'
import { matchRegion } from './regions.js'

const SELECTED_KEY = 'wx_selected_address_id'

let _cache = []
let _loading = null

// 旧版本地地址簿（wx_addresses）已废弃：数据已迁到后端 member_addresses，
// 残留缓存会干扰后续排查，加载时一次性清除
try {
  if (uni.getStorageSync('wx_addresses')) uni.removeStorageSync('wx_addresses')
} catch (e) {
  /* 存储不可用时忽略 */
}

/** 同步读地址缓存（需先调 loadAddresses 拉取） */
export function getAddresses() {
  return _cache
}

/**
 * 拉取会员地址列表并刷新缓存
 * @param {boolean} [force] true=忽略进行中的请求，强制重新拉取
 * @returns {Promise<Array>} 地址数组；未登录/请求失败时返回当前缓存，不抛错
 */
export function loadAddresses(force) {
  if (_loading && !force) return _loading
  _loading = get('/api/wxapp/addresses')
    .then((res) => (res && Array.isArray(res.items) ? res.items : []))
    .catch(() => _cache)
    .then((list) => {
      _cache = list
      _loading = null
      return _cache
    })
  return _loading
}

/** 提交给后端的字段（省市区三级必须齐全，运费按省份计算） */
function toPayload(form) {
  return {
    name: (form.name || '').trim(),
    phone: (form.phone || '').trim(),
    province: (form.province || '').trim(),
    city: (form.city || '').trim(),
    district: (form.district || '').trim(),
    detail: (form.detail || '').trim(),
    is_default: !!form.isDefault
  }
}

/** 新增地址（首条后端自动设为默认） */
export function createAddress(form) {
  return post('/api/wxapp/addresses', toPayload(form)).then((item) => {
    loadAddresses(true)
    return item
  })
}

/** 更新地址 */
export function updateAddress(id, form) {
  return put('/api/wxapp/addresses/' + id, toPayload(form)).then((item) => {
    loadAddresses(true)
    return item
  })
}

/** 设为默认地址 */
export function setDefaultAddress(id) {
  return put('/api/wxapp/addresses/' + id + '/default', {}).then((item) => {
    loadAddresses(true)
    return item
  })
}

/** 删除地址；删的是当前选中地址时清除选中 id */
export function removeAddress(id) {
  return del('/api/wxapp/addresses/' + id).then((res) => {
    const selectedId = uni.getStorageSync(SELECTED_KEY)
    if (selectedId && String(selectedId) === String(id)) {
      uni.removeStorageSync(SELECTED_KEY)
    }
    loadAddresses(true)
    return res
  })
}

/** 获取当前选中地址（无选中时返回默认地址或第一个） */
export function getSelectedAddress() {
  const list = _cache
  if (list.length === 0) return null
  const selectedId = uni.getStorageSync(SELECTED_KEY)
  const found = list.find(a => selectedId && String(a.id) === String(selectedId))
  if (found) return found
  const def = list.find(a => a.isDefault)
  return def || list[0]
}

/** 设置当前选中地址 id */
export function setSelectedAddressId(id) {
  uni.setStorageSync(SELECTED_KEY, id)
}

/** 清空本地缓存（退出登录时调用） */
export function clearAddressCache() {
  _cache = []
  _loading = null
  uni.removeStorageSync(SELECTED_KEY)
}

/** 拼接完整地址：省 + 市 + 区 + 详细地址（相邻两级同名时去重，避免「北京市北京市朝阳区」） */
export function fullAddress(a) {
  if (!a) return ''
  const parts = [a.province, a.city, a.district, a.detail].filter(Boolean)
  const merged = []
  parts.forEach((part) => {
    if (merged.length && merged[merged.length - 1] === part) return
    merged.push(part)
  })
  return merged.join('').trim()
}

// 省份别名与地区匹配统一交给 regions.js（国标数据 + 去后缀别名）处理

/* ==================== 粘贴文本智能识别 ==================== */

// 手机号：兼容 +86/86 前缀与 3-4-4 空格、横线分隔（原实现先去掉分隔符再匹配，
// 却拿无分隔的号码回原文 replace，导致「138 0013 8000」这种写法切分错乱）
const PHONE_PATTERN = /(?:\+?86[\s-]?)?1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}/
// 字段标签（注意不能收单字「省/市/区」，否则会破坏「广东省」这类地名）
const LABEL_PATTERN = /(收件人|收货人|联系人|签收人|姓名|名字|联系电话|手机号码|手机号|电话|联系方式|地址|邮编|所在地区)[:：]?/g
// 姓名：2-6 个汉字（允许少数民族「·」分隔），或纯英文名
const CN_NAME = /^[\u4e00-\u9fa5·]{2,6}$/
const EN_NAME = /^[A-Za-z][A-Za-z.'-]{1,19}$/
// 地址特征字：含这些字的 token 不当作姓名
const ADDR_HINT = /[省市区县州盟镇乡村路街道桥苑庄栋单元楼室座号弄巷坊]/

function stripLabels(text) {
  return String(text || '').replace(LABEL_PATTERN, ' ').replace(/\s+/g, ' ').trim()
}

/** 从一段文本里摘出姓名，返回 { name, rest }（rest 是剩余内容） */
function extractName(text) {
  const cleaned = stripLabels(text)
  if (!cleaned) return { name: '', rest: text }
  const tokens = cleaned.split(/[\s,，、;；|]+/).filter(Boolean)
  let name = ''
  const rest = []
  tokens.forEach((token) => {
    if (name || ADDR_HINT.test(token)) {
      rest.push(token)
      return
    }
    if (!CN_NAME.test(token) && !EN_NAME.test(token)) {
      rest.push(token)
      return
    }
    // 去掉称谓；若去掉后不再是合法姓名（如单字「周」），保留原词
    const stripped = token.replace(/(先生|女士|小姐|师傅|同学|老师|同志)$/, '')
    name = CN_NAME.test(stripped) || EN_NAME.test(stripped) ? stripped : token
  })
  return { name, rest: rest.join(' ') }
}

/**
 * 粘贴文本智能识别
 *
 * 策略（识别到几级填几级，缺的级别交用户手选，不预填假值也不整块放弃）：
 *   1) 先摘手机号（兼容 +86、3-4-4 分隔），从文本中剔除，避免干扰后面切分
 *   2) 国标数据驱动地区匹配（regions.matchRegion）：支持不写省、省略「市/区」后缀、直辖市
 *   3) 地区首次命中位置之前的文本当姓名候选，之后的当详细地址候选
 *   4) 详细地址 = 已识别地区之后的内容（即使只识别到一两级也只剔除已识别部分，不重复）
 * @returns {{name:String, phone:String, province:String, city:String, district:String,
 *            detail:String, level:Number, missing:String[], ok:Boolean}}
 */
export function recognizeAddress(text) {
  const result = { name: '', phone: '', province: '', city: '', district: '', detail: '', level: 0, missing: [], ok: false }
  // 换行归一为空格，保证位置切分一致
  let work = String(text || '').replace(/\s*[\r\n]+\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (!work) return result

  // 1) 手机号
  const phoneMatch = work.match(PHONE_PATTERN)
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/[\s-]/g, '')
    result.phone = digits.replace(/^\+?86(?=1[3-9]\d{9}$)/, '')
    work = (work.slice(0, phoneMatch.index) + ' ' + work.slice(phoneMatch.index + phoneMatch[0].length))
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 2) 地区三级
  const region = matchRegion(work)
  result.province = region.province
  result.city = region.city
  result.district = region.district
  result.level = region.level
  result.missing = ['province', 'city', 'district'].filter((key) => !region[key])

  const regionStart = region.level > 0 ? Math.max(region.start, 0) : 0
  const head = work.slice(0, regionStart)
  let detail = work.slice(region.level > 0 ? region.end : 0)

  // 3) 姓名：地区之前优先，其次从地区之后的残留里摘
  const headName = extractName(head)
  result.name = headName.name
  if (!result.name) {
    const tailName = extractName(detail)
    result.name = tailName.name
    detail = tailName.rest
  }
  if (result.name) {
    // 姓名也可能写在地址末尾（“…1号 张三”），从地址里再摘一次
    detail = detail.replace(new RegExp('(^|[\\s,，、;：:])' + result.name + '($|[\\s,，、;：:])'), ' ')
  }

  // 4) 详细地址：只去掉标签与分隔符，保留地区之后的全部原文
  result.detail = stripLabels(detail).replace(/^[\s,，、;；:：\-]+/, '')
  result.ok = !!(result.name || result.phone || result.province || result.detail)
  return result
}
