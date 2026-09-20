/**
 * 会员登录与邀请码模块
 *
 * 登录方式适配微信官方能力：
 *  - 微信小程序端：wx.login code → 后端换 openid（真实模式）；
 *    昵称（input type=nickname）、头像（chooseAvatar）、
 *    手机号（button open-type=getPhoneNumber）均由页面组件采集后提交。
 *  - 模拟模式（后端未配置 WX_APPID）/ H5 端：
 *    使用前端持久化的 device_id 生成稳定模拟账号，H5 表单可直接提交昵称+手机号。
 *
 * 邀请关系：
 *  - 分享的小程序卡片/链接携带 invite=邀请码 参数
 *  - App.vue onLaunch 时解析并存入 invite_code，新会员注册时随登录接口上报
 */
import { get, post, put, getToken, setToken, setCachedMember, getCachedMember } from './api.js'

// ---- 设备标识（模拟模式/H5 账号唯一性来源）----

export function getDeviceId() {
  let id = uni.getStorageSync('dev_device_id')
  if (!id) {
    id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    uni.setStorageSync('dev_device_id', id)
  }
  return id
}

// ---- 邀请码（别人分享给我的 / 我自己的）----

export function getInviteCode() {
  return uni.getStorageSync('invite_code') || ''
}

/** 保存从分享链接解析出的邀请码（不覆盖为自己的邀请码） */
export function saveInviteCode(code) {
  if (!code) return
  const mine = uni.getStorageSync('my_invite_code') || ''
  if (code !== mine) uni.setStorageSync('invite_code', code)
}

export function getMyInviteCode() {
  return uni.getStorageSync('my_invite_code') || ''
}

function setMyInviteCode(code) {
  if (code) uni.setStorageSync('my_invite_code', code)
}

// ---- 登录态 ----

export function isLoggedIn() {
  return !!getToken()
}

/** 查询后端登录模式：mock=开发模拟 real=微信官方 */
export async function fetchLoginMode() {
  try {
    const res = await get('/api/wxapp/config/mode')
    return res.mode || 'mock'
  } catch (e) {
    return 'mock'
  }
}

/** 登录后统一处理：保存 token、会员信息、我的邀请码 */
function afterLogin(res) {
  setToken(res.token)
  setCachedMember(res.member)
  setMyInviteCode(res.member.inviteCode)
  return res
}

/**
 * 微信小程序端静默登录（wx.login code 换 openid）
 * 模拟模式下 code 无效，后端使用 device_id 生成模拟 openid
 */
export async function wxLogin() {
  const payload = {
    platform: 'mp',
    device_id: getDeviceId(),
    invite_code: getInviteCode()
  }
  // #ifdef MP-WEIXIN
  const code = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (r) => resolve(r.code || ''),
      fail: (e) => reject(new Error(e.errMsg || 'wx.login 失败'))
    })
  })
  payload.code = code
  // #endif
  const res = await post('/api/wxapp/auth/login', payload)
  return afterLogin(res)
}

/**
 * H5 模拟登录：昵称 + 手机号（可选）直接注册/登录
 */
export async function h5Login({ nickname = '', phone = '' } = {}) {
  const res = await post('/api/wxapp/auth/login', {
    platform: 'h5',
    device_id: getDeviceId(),
    invite_code: getInviteCode(),
    nickname,
    phone
  })
  return afterLogin(res)
}

// ---- 开发调试：H5 预览自动登录为指定会员 ----
// device_id 固定为 'lufei'，后端模拟 openid = dev_h5_lufei（已绑定到会员「路飞」id=19）
// 仅在 H5 开发构建生效（#ifdef H5 + import.meta.env.DEV），生产构建不会触发
const DEV_AUTO_LOGIN_DEVICE_ID = 'lufei'

export async function devAutoLogin() {
  // #ifdef H5
  if (!(import.meta.env && import.meta.env.DEV)) return null
  if (isLoggedIn()) return null
  try {
    const res = await post('/api/wxapp/auth/login', {
      platform: 'h5',
      device_id: DEV_AUTO_LOGIN_DEVICE_ID
    })
    console.log('[dev] 已自动登录为：' + (res.member && (res.member.nickname || res.member.memberNo)))
    return afterLogin(res)
  } catch (e) {
    console.warn('[dev] 自动登录失败，走手动登录', e)
    return null
  }
  // #endif
  // #ifndef H5
  return null
  // #endif
}

/**
 * 绑定手机号
 * @param {object} opts - { code } 微信 getPhoneNumber 授权 code（真实模式）
 *                        { phone } 模拟模式/H5 手动输入
 */
export async function bindPhone(opts = {}) {
  const res = await post('/api/wxapp/auth/bind-phone', opts)
  setCachedMember(res.member)
  return res.member
}

/** 拉取当前会员资料（刷新登录态） */
export async function fetchProfile() {
  const res = await get('/api/wxapp/member/profile')
  setCachedMember(res.member)
  setMyInviteCode(res.member.inviteCode)
  return res.member
}

/** 更新昵称/头像/真实姓名 */
export async function updateProfile(data) {
  const res = await put('/api/wxapp/member/profile', data)
  setCachedMember(res.member)
  return res.member
}

/** 我的推荐（下线列表，level=0 全部 / 1-4 指定级别；rootId=0 本人 / 下级会员ID 下钻一层） */
export function fetchReferrals(page = 1, size = 20, level = 0, rootId = 0) {
  return get('/api/wxapp/member/referrals', { page, size, level, root_id: rootId })
}

export { getCachedMember }
