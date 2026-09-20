/**
 * 粘贴地址智能识别 —— 回归用例
 *
 * 运行：node scripts/test-recognize.cjs
 *
 * 说明：src/utils 下的模块是 ESM 且 JSON 需要 import attribute，
 * 这里用轻量转译把 regions.js / address.js 载入为 CommonJS 后直接跑真实实现。
 */
const fs = require('fs')
const path = require('path')

function loadModule(file, replacements) {
  let src = fs.readFileSync(path.resolve(__dirname, '..', 'src', file), 'utf8')
  replacements.forEach(([from, to]) => {
    src = src.replace(from, to)
  })
  src = src.replace(/^export\s+(const|function|default)/gm, '$1')
  src = src.replace(/^export\s+/gm, '')
  return src
}

const regionsSrc = loadModule('utils/regions.js', [
  [/import REGION_DATA from '\.\/region-data\.json'/, 'const REGION_DATA = __REGION_DATA']
])
const addressSrc = loadModule('utils/address.js', [
  [/import \{ matchRegion \} from '\.\/regions\.js'/, 'const { matchRegion } = __REGIONS']
])

const REGION_DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src/utils/region-data.json'), 'utf8'))
const globalScope = { __REGION_DATA: REGION_DATA, __REGIONS: null, uni: { getStorageSync: () => '', setStorageSync: () => {} } }

globalScope.__REGIONS = new Function('__REGION_DATA', regionsSrc + '\nreturn { matchRegion, PROVINCES, citiesOf, districtsOf, resolveRegion };')(REGION_DATA)
const { recognizeAddress, fullAddress } = new Function('__REGIONS', 'uni', addressSrc + '\nreturn { recognizeAddress, fullAddress };')(globalScope.__REGIONS, globalScope.uni)

const CASES = [
  {
    title: '标准三行（姓名/电话/地址分行）',
    input: '张三\n13800138000\n广东省深圳市南山区科技园路1号',
    expect: { name: '张三', phone: '13800138000', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园路1号' }
  },
  {
    title: '单行混合 + 旧数据缺失的连云港市',
    input: '李四 13912345678 江苏省连云港市海州区解放东路100号',
    expect: { name: '李四', phone: '13912345678', province: '江苏省', city: '连云港市', district: '海州区', detail: '解放东路100号' }
  },
  {
    title: '手机号 3-4-4 空格分隔',
    input: '王五 138 0013 8000 浙江省杭州市西湖区文三路200号',
    expect: { name: '王五', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '文三路200号' }
  },
  {
    title: '+86 前缀手机号',
    input: '赵六 +8613800138000 四川省成都市武侯区人民南路四段1号',
    expect: { phone: '13800138000', name: '赵六', province: '四川省', city: '成都市', district: '武侯区', detail: '人民南路四段1号' }
  },
  {
    title: '不写省名（由市反推省）',
    input: '深圳市南山区海岸城B座1201 张三 13800138000',
    expect: { province: '广东省', city: '深圳市', district: '南山区', name: '张三' }
  },
  {
    title: '直辖市 + 省略「市/区」后缀',
    input: '北京朝阳 建国路88号 李四 13900001111',
    expect: { province: '北京市', city: '北京市', district: '朝阳区', detail: '建国路88号' }
  },
  {
    title: '同名区歧义：陕西西安长安区',
    input: '陕西省西安市长安区北长安街1号 张三 13800138000',
    expect: { province: '陕西省', city: '西安市', district: '长安区' }
  },
  {
    title: '带标签的电商格式',
    input: '收件人：孙七，电话：13712345678，地址：湖北省武汉市江汉区解放大道688号',
    expect: { name: '孙七', phone: '13712345678', province: '湖北省', city: '武汉市', district: '江汉区', detail: '解放大道688号' }
  },
  {
    title: '自治区简称（内蒙古）',
    input: '周八 13600001111 内蒙古呼和浩特市赛罕区大学东街66号',
    expect: { province: '内蒙古自治区', city: '呼和浩特市', district: '赛罕区' }
  },
  {
    title: '只识别到省市（区缺失时不猜）',
    input: '广东省广州市天河北路233号 张三 13800138000',
    expect: { province: '广东省', city: '广州市', district: '', level: 2 }
  },
  {
    title: '完全识别不出地区（原文保留在详址）',
    input: '张三 13800138000 某某科技园A栋',
    expect: { name: '张三', phone: '13800138000', province: '', city: '', district: '', level: 0 }
  },
  {
    title: '英文姓名',
    input: 'John 13800138000 上海市浦东新区世纪大道100号',
    expect: { name: 'John', province: '上海市', city: '上海市', district: '浦东新区', detail: '世纪大道100号' }
  },
  {
    title: '姓名带称谓',
    input: '周先生 13600001111 湖南省长沙市岳麓区麓山南路1号',
    expect: { name: '周先生', phone: '13600001111', province: '湖南省', city: '长沙市', district: '岳麓区' }
  },
  {
    title: '区名在详细地址中重复出现',
    input: '吴九 13500001111 河北省石家庄市正定县正定镇燕赵南大街1号',
    expect: { name: '吴九', province: '河北省', city: '石家庄市', district: '正定县', detail: '正定镇燕赵南大街1号' }
  },
  {
    title: '县级市（省直辖，如湖北仙桃：数据里归到与省同名的市级分组下）',
    input: '郑十 13400001111 湖北省仙桃市仙桃大道45号',
    expect: { name: '郑十', province: '湖北省', city: '湖北省', district: '仙桃市', detail: '仙桃大道45号' }
  }
]

// 完整地址拼接去重（直辖市与省直辖分组会出现相邻同名层级）
const JOIN_CASES = [
  { input: { province: '北京市', city: '北京市', district: '朝阳区', detail: '建国路88号' }, want: '北京市朝阳区建国路88号' },
  { input: { province: '湖北省', city: '湖北省', district: '仙桃市', detail: '仙桃大道45号' }, want: '湖北省仙桃市仙桃大道45号' },
  { input: { province: '广东省', city: '深圳市', district: '', detail: '科技园路1号' }, want: '广东省深圳市科技园路1号' }
]

let pass = 0
let fail = 0
CASES.forEach((testCase, i) => {
  const got = recognizeAddress(testCase.input)
  const problems = []
  Object.keys(testCase.expect).forEach((key) => {
    const want = testCase.expect[key]
    if (got[key] !== want) problems.push(`${key}: 期望「${want}」实际「${got[key]}」`)
  })
  if (problems.length) {
    fail += 1
    console.log(`✗ ${i + 1}. ${testCase.title}`)
    console.log(`   输入: ${JSON.stringify(testCase.input)}`)
    console.log(`   ${problems.join('; ')}`)
    console.log(`   完整结果: ${JSON.stringify(got)}`)
  } else {
    pass += 1
    console.log(`✓ ${i + 1}. ${testCase.title}`)
  }
})

JOIN_CASES.forEach((joinCase, i) => {
  const got = fullAddress(joinCase.input)
  if (got !== joinCase.want) {
    fail += 1
    console.log(`✗ J${i + 1}. 地址拼接：期望「${joinCase.want}」实际「${got}」`)
  } else {
    pass += 1
    console.log(`✓ J${i + 1}. 地址拼接：${got}`)
  }
})

console.log(`\n结果：${pass} 通过 / ${fail} 失败 / 共 ${CASES.length + JOIN_CASES.length} 条`)
process.exit(fail ? 1 : 0)
