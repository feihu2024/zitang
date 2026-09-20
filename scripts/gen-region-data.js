/**
 * 生成小程序端省市区三级联动数据（src/utils/region-data.json）
 *
 * 数据源：npm 包 china-division 的 dist/pca.json（国标省市区三级，名称版）
 * 用法：node scripts/gen-region-data.js
 *
 * 归一化规则：
 *  1) 直辖市（北京/上海/天津/重庆）在源数据里的市一级是「市辖区 / 县」，
 *     以及「省直辖县级行政区划」（如湖北仙桃、河南济源、新疆石河子），
 *     对用户都没有意义，统一折叠成省名本身（如 北京市 / 北京市 / 朝阳区）。
 *  2) 输出保持 { 省: { 市: [区, ...] } } 结构，与 utils/regions.js 的读取方式一致。
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../node_modules/china-division/dist/pca.json')
const OUT = path.resolve(__dirname, '../src/utils/region-data.json')

// 源数据中的二级分组名（对用户无意义，需折叠到省名）
const FLAT_CITY_GROUPS = ['市辖区', '县', '自治区直辖县级行政区划', '省直辖县级行政区划']

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'))

const result = {}
Object.keys(raw).forEach((province) => {
  const cities = raw[province]
  const normalized = {}
  Object.keys(cities).forEach((city) => {
    const districts = Array.isArray(cities[city]) ? cities[city] : Object.keys(cities[city])
    // 「市辖区 / 县 / 省（自治区）直辖县级行政区划」这类分组对用户没有意义，折叠到省名本身
    let target = FLAT_CITY_GROUPS.includes(city) ? province : city
    if (!normalized[target]) normalized[target] = []
    districts.forEach((d) => {
      if (normalized[target].indexOf(d) < 0) normalized[target].push(d)
    })
  })
  result[province] = normalized
})

// 统计
let cityCount = 0
let districtCount = 0
Object.keys(result).forEach((p) => {
  Object.keys(result[p]).forEach((c) => {
    cityCount += 1
    districtCount += result[p][c].length
  })
})

fs.writeFileSync(OUT, JSON.stringify(result), 'utf8')

console.log('省: %d  市: %d  区县: %d', Object.keys(result).length, cityCount, districtCount)
console.log('输出: %s (%.1f KB)', path.relative(process.cwd(), OUT), fs.statSync(OUT).size / 1024)
console.log('样例 北京市:', JSON.stringify(result['北京市']))
console.log('样例 广东省/深圳市:', JSON.stringify(result['广东省']['深圳市']))
console.log('样例 江苏省市列表:', Object.keys(result['江苏省']).join(','))
console.log('样例 海南省市列表:', Object.keys(result['海南省']).join(','))
