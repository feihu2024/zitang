/**
 * 全局分享 mixin — 所有页面分享时自动携带邀请码
 *
 * 微信小程序：右上角转发 / button open-type=share 触发 onShareAppMessage，
 * 分享路径携带 invite=我的邀请码，新用户通过该卡片进入并登录即建立推荐关系。
 * 朋友圈分享（onShareTimeline）通过 query 携带邀请码。
 *
 * 全局分享卡片（灵活参数 → 系统参数 → 全局分享卡片）：
 * 标题/封面由后台配置，好友点击卡片默认进入小程序主页。
 * 已单独定义 onShareAppMessage 的页面（商品/拼团/秒杀详情等）不受影响。
 */
import { getMyInviteCode } from './auth.js'
import { get } from './api.js'

/** 构造带邀请参数的分享路径 */
export function buildSharePath(path) {
  const invite = getMyInviteCode()
  if (!invite) return path
  return path + (path.indexOf('?') === -1 ? '?' : '&') + 'invite=' + invite
}

const SHARE_CARD_STORAGE_KEY = 'globalShareCard'
const DEFAULT_SHARE_TITLE = '植萃生活 · 好物拼团更划算'

/** 拉取全局分享卡片配置并缓存（App.vue onLaunch 时调用，失败静默） */
export function loadGlobalShareCard() {
  get('/api/wxapp/config/share-card')
    .then((cfg) => {
      uni.setStorageSync(SHARE_CARD_STORAGE_KEY, {
        title: (cfg && cfg.title) || '',
        imageUrl: (cfg && cfg.imageUrl) || ''
      })
    })
    .catch(() => { /* 拉取失败沿用旧缓存/默认值 */ })
}

/** 同步读取全局分享卡片配置（无配置返回空对象） */
export function getGlobalShareCard() {
  try {
    return uni.getStorageSync(SHARE_CARD_STORAGE_KEY) || {}
  } catch (e) {
    return {}
  }
}

export const shareMixin = {
  onShareAppMessage() {
    const card = getGlobalShareCard()
    // 标题：后台配置的钩子标题优先，留空用默认文案
    const title = card.title || DEFAULT_SHARE_TITLE
    const result = {
      title,
      // 全局卡片点击后进入小程序主页（携带邀请码建立推荐关系）
      path: buildSharePath('/pages/home/index')
    }
    // 分享图仅接受网络 URL（微信限制），无效则省略让微信取默认页面截图
    if (card.imageUrl && card.imageUrl.indexOf('http') === 0) {
      result.imageUrl = card.imageUrl
    }
    return result
  },
  onShareTimeline() {
    const invite = getMyInviteCode()
    const card = getGlobalShareCard()
    return {
      title: card.title || DEFAULT_SHARE_TITLE,
      query: invite ? 'invite=' + invite : ''
    }
  }
}
