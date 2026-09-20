/**
 * 省市区三级联动数据源与查询工具
 *
 * 数据来自国标（npm 包 china-division 的 pca.json），由 scripts/gen-region-data.js
 * 生成为 region-data.json（31 省 / 341 市 / 3056 区县），
 * 取代此前手写的子集（仅 87 市 / 569 区县，大量地区选不到）。
 *
 * 对外能力：
 *   1) 三级列表读取：PROVINCES / citiesOf / districtsOf
 *   2) 文本地区匹配：matchRegion(text) —— 智能识别用，支持省略「省」或去掉「市/区」后缀
 *   3) 组合合法性校正：resolveRegion(p, c, d)
 */
import REGION_DATA from './region-data.json'

export const REGIONS = REGION_DATA

/** 省份列表（picker 第一列） */
export const PROVINCES = Object.keys(REGIONS)

/** 获取某省的城市列表 */
export function citiesOf(province) {
  const p = REGIONS[province]
  return p ? Object.keys(p) : []
}

/** 获取某省某市的区县列表 */
export function districtsOf(province, city) {
  const p = REGIONS[province]
  if (!p) return []
  return p[city] || []
}

/** 默认省市区（第一个省、第一个市、第一个区） */
export function defaultRegion() {
  const province = PROVINCES[0]
  const city = citiesOf(province)[0]
  const district = districtsOf(province, city)[0]
  return { province, city, district }
}

/* ==================== 反查索引 ==================== */

// 名称后缀别名裁剪表：「石家庄市」→「石家庄」、「广东省」→「广东」、「朝阳区」→「朝阳」
const SUFFIXES = ['维吾尔自治区', '壮族自治区', '回族自治区', '特别行政区', '自治区', '自治州', '自治县', '地区', '省', '市', '盟', '区', '县']

/** 生成一个地名的可省略后缀别名（长度 ≥ 2 且不与原名相同） */
function aliasesOf(name) {
  const list = []
  for (const suffix of SUFFIXES) {
    if (name.length > suffix.length + 1 && name.endsWith(suffix)) {
      const short = name.slice(0, name.length - suffix.length)
      if (short.length >= 2 && list.indexOf(short) < 0) list.push(short)
      break
    }
  }
  return list
}

let INDEX = null

function getIndex() {
  if (INDEX) return INDEX
  const citiesByProvince = {}
  const cityToProvince = {}
  // 名称（含别名）→ 出现位置候选列表，用于文本匹配
  const cityNames = {}
  const districtNames = {}
  const provinceNames = {}

  PROVINCES.forEach((province) => {
    const aliasList = [province].concat(aliasesOf(province))
    aliasList.forEach((alias) => {
      if (!provinceNames[alias]) provinceNames[alias] = []
      provinceNames[alias].push(province)
    })
    const cities = citiesOf(province)
    citiesByProvince[province] = cities
    cities.forEach((city) => {
      if (!cityToProvince[city]) cityToProvince[city] = province
      ;[city].concat(aliasesOf(city)).forEach((alias) => {
        if (!cityNames[alias]) cityNames[alias] = []
        if (cityNames[alias].indexOf(city) < 0) cityNames[alias].push(city)
      })
      districtsOf(province, city).forEach((district) => {
        if (!districtNames[district]) districtNames[district] = []
        districtNames[district].push({ province, city, district })
      })
    })
  })

  INDEX = { citiesByProvince, cityToProvince, provinceNames, cityNames, districtNames }
  return INDEX
}

/** 市 → 省（找不到返回空串） */
export function provinceOfCity(city) {
  return getIndex().cityToProvince[city] || ''
}

/**
 * 在文本中查找地名：候选名（全称 + 去后缀别名）取「出现位置最靠前」的，
 * 同一位置则取最长，返回 { name, at, end }；未命中返回 null
 */
function findName(text, aliasMap, minPos) {
  let best = null
  Object.keys(aliasMap).forEach((alias) => {
    const at = text.indexOf(alias, minPos)
    if (at < 0) return
    const end = at + alias.length
    if (!best || at < best.at || (at === best.at && alias.length > best.alias.length)) {
      best = { alias, at, end, names: aliasMap[alias] }
    }
  })
  if (!best) return null
  return { name: best.names[0], at: best.at, end: best.end }
}

/** 在指定城市列表内查找市（列表为空时回落到全国） */
function findCity(text, minPos, allow) {
  const idx = getIndex()
  let best = null
  Object.keys(idx.cityNames).forEach((alias) => {
    const cities = idx.cityNames[alias]
    cities.forEach((city) => {
      if (allow && allow.indexOf(city) < 0) return
      const at = text.indexOf(alias, minPos)
      if (at < 0) return
      const end = at + alias.length
      if (!best || at < best.at || (at === best.at && alias.length > best.alias.length)) {
        best = { city, at, end, alias }
      }
    })
  })
  return best
}

/**
 * 从地址文本中匹配省市区三级
 *
 * 策略（按文本顺序逐级锁定，逐级收窄检索范围）：
 *   1) 省：全国省名（含简称别名）按位置最靠前命中
 *   2) 市：已识别到省时只在该省内找；没有省时全国找，并由市反推省
 *   3) 区：先在已识别市内找（全称优先，去后缀别名只在不紧跟汉字时采信），未命中再全省找；
 *      同名区跨市且无法判定时留空（宁缺勿错）
 *
 * @param {string} text 地址文本（省市区部分）
 * @returns {{province:string, city:string, district:string, start:number, end:number, level:number}}
 *          level = 命中层级数（0-3），start/end = 已识别地区在文本中的起止下标
 */
export function matchRegion(text) {
  const src = String(text || '')
  const idx = getIndex()
  const out = { province: '', city: '', district: '', start: -1, end: 0, level: 0 }
  if (!src) return out
  const mark = (at) => { out.start = out.start < 0 ? at : Math.min(out.start, at) }

  // 1) 省
  const p = findName(src, idx.provinceNames, 0)
  if (p) {
    out.province = p.name
    out.end = p.end
    mark(p.at)
  }

  // 直辖市：市名与省名相同（北京市/北京市/…），识别到省即视为市已确定，
  // 否则文本里的「北京」被省一级消费后市一级永远匹不到
  const allow = out.province ? idx.citiesByProvince[out.province] : null
  if (out.province && allow && allow.length === 1 && allow[0] === out.province) {
    out.city = out.province
  }

  // 2) 市
  const c = findCity(src, out.end, allow)
  if (c) {
    out.city = c.city
    // 没写省名时由市反推省
    if (!out.province) out.province = idx.cityToProvince[c.city] || ''
    out.end = Math.max(out.end, c.end)
    mark(c.at)
  }

  // 3) 区
  if (out.province) {
    if (out.city) {
      const inCity = districtsOf(out.province, out.city)
      const candidates = []
      inCity.forEach((district) => {
        // 全称命中最可信
        const fullAt = src.indexOf(district, out.end)
        if (fullAt >= 0) candidates.push({ district, at: fullAt, end: fullAt + district.length, score: 2 })
        // 去后缀别名（如「朝阳区」→「朝阳」）只有在后面不紧跟汉字时才采信，
        // 否则「天河北路」会被切成「天河区 + 北路233号」
        aliasesOf(district).forEach((alias) => {
          const at = src.indexOf(alias, out.end)
          if (at < 0) return
          const next = src.charAt(at + alias.length)
          if (next && /[\u4e00-\u9fa5]/.test(next)) return
          candidates.push({ district, at, end: at + alias.length, score: 1 })
        })
      })
      let best = null
      candidates.forEach((item) => {
        if (!best || item.score > best.score || (item.score === best.score && item.at < best.at)) best = item
      })
      if (best) {
        out.district = best.district
        out.end = Math.max(out.end, best.end)
        mark(best.at)
      }
    }

    // 市内未命中（或根本没写市）→ 全省兜底：仅当该省范围内同名区县唯一时才采用，
    // 并顺带把区所属的市补上（湖北仙桃、河南济源这类省直辖县级市就靠这一步识别）
    if (!out.district) {
      const candidates = []
      Object.keys(idx.districtNames).forEach((district) => {
        const at = src.indexOf(district, out.end)
        if (at < 0) return
        idx.districtNames[district].forEach((item) => {
          if (item.province === out.province) candidates.push({ item, at })
        })
      })
      const unique = candidates.filter((entry) => entry.item.city !== out.city)
      if (unique.length === 1) {
        out.city = unique[0].item.city
        out.district = unique[0].item.district
        out.end = Math.max(out.end, unique[0].at + out.district.length)
        mark(unique[0].at)
      }
    }
  }

  out.level = (out.province ? 1 : 0) + (out.city ? 1 : 0) + (out.district ? 1 : 0)
  return out
}

/**
 * 校正省市区组合：任一级在数据中不存在时，返回可安全使用的规范值（不合法的一级置空）
 * 用于编辑回填、微信地址导入等外部来源数据
 */
export function resolveRegion(province, city, district) {
  const idx = getIndex()
  const p = PROVINCES.indexOf(province) >= 0 ? province : ''
  if (!p) return { province: '', city: '', district: '' }
  const cities = idx.citiesByProvince[p]
  const c = cities.indexOf(city) >= 0 ? city : ''
  if (!c) return { province: p, city: '', district: '' }
  const districts = districtsOf(p, c)
  const d = districts.indexOf(district) >= 0 ? district : ''
  return { province: p, city: c, district: d }
}
