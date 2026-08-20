import { getPoi } from './pois'
import { haversine, walkMinutes } from '../utils/geo'

const drafts = [
  {
    id: 'south-easy',
    name: '南门轻松走',
    audience: '适合老人、散步',
    minutes: 45,
    source: '百科：南门一带以聚秀湖、百花园、生肖林、荷花为主。',
    stopIds: [
      'gate-south',
      'yingbin',
      'juxiu',
      'huxin',
      'baihua',
      'shengxiao',
      'yingyue',
      'gate-south',
    ],
  },
  {
    id: 'north-lakes',
    name: '北门看湖',
    audience: '适合亲子、休闲',
    minutes: 60,
    source: '百科：北门一带有翠景湖、云岫湖、晴云湖和儿童游乐。',
    stopIds: [
      'gate-north',
      'yunxiu',
      'cuijing',
      'danche',
      'tongqu',
      'hetang-yuese',
      'qingyun',
      'gate-north',
    ],
  },
  {
    id: 'peak-walk',
    name: '登主峰揽胜',
    audience: '适合腿脚好、想爬山',
    minutes: 90,
    source: '游客常走南区上山；主峰附近有烽火台遗址、大夫揽胜径。',
    stopIds: [
      'gate-south',
      'juxiu',
      'miaopu',
      'lansheng',
      'fenghuotai',
      'senlin-yangba',
      'gate-south',
    ],
  },
]

export const ROUTES = drafts.map((item) => {
  const stops = item.stopIds.map((id) => getPoi(id)).filter(Boolean)
  let meters = 0
  for (let i = 1; i < stops.length; i++) meters += haversine(stops[i - 1], stops[i])
  return {
    ...item,
    stops,
    meters,
    walkMin: Math.max(item.minutes, walkMinutes(meters)),
  }
})

export function getRoute(id) {
  return ROUTES.find((r) => r.id === id) || null
}
