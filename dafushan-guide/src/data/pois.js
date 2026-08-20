import { haversine, walkMinutes, xyToLatLng } from '../utils/geo'
import { COPY, facilityIntro, facilityVoice } from './copy'

const MAP_NOTE = '名称、位置按 2021 年总体规划图红点标注对齐。图上有些是规划项目，现场不一定已建成。'

function spot(id, name, type, x, y, extra = {}) {
  const copy = COPY[id] || {}
  return {
    id,
    name,
    type,
    x,
    y,
    recommendMin: extra.recommendMin ?? (type === 'attraction' ? 15 : 5),
    intro: extra.intro || copy.intro || facilityIntro(name, type),
    voice: extra.intro || copy.intro || extra.voice || copy.voice || facilityIntro(name, type),
    photo: extra.photo || copy.photo,
    hours: extra.hours,
    tags: extra.tags,
    extras: extra.extras,
  }
}

const raw = [
  spot('gate-north', '北门', 'exit', 0.515, 0.032, { extras: ['停车场', '公交站'] }),
  spot('gate-east', '东门', 'exit', 0.758, 0.612),
  spot('gate-south', '南门', 'exit', 0.6686, 0.9292, { extras: ['停车场', '公交站'] }),
  spot('gate-southwest', '西南门', 'exit', 0.442, 0.938),

  // 北区：红点坐标来自规划图
  spot('chashui', '茶水平台', 'attraction', 0.532, 0.0591),
  spot('cuijing', '翠景湖', 'attraction', 0.492, 0.078),
  spot('yunxiu', '云岫湖', 'attraction', 0.510, 0.082),
  spot('danche', '单车驿站', 'attraction', 0.482, 0.122),
  spot('tongqu', '童趣园', 'attraction', 0.500, 0.118, { recommendMin: 20 }),
  spot('youtian-north', '游艇码头', 'attraction', 0.432, 0.108),
  spot('yayunlin', '亚运林', 'attraction', 0.508, 0.128),
  spot('qiandao', '千岛湖', 'attraction', 0.5481, 0.1341),
  spot('shuishang', '水上乐园', 'attraction', 0.502, 0.148),
  spot('qingyun', '晴云湖', 'attraction', 0.4313, 0.1597),
  spot('xuanlan', '绚烂杉塘', 'attraction', 0.458, 0.162),
  spot('hetang-yuese', '荷塘月色', 'attraction', 0.4011, 0.1691, { recommendMin: 20 }),
  spot('siji-shan', '四季杉影', 'attraction', 0.4936, 0.181),
  spot('wugan', '五感花园', 'attraction', 0.5212, 0.2502, { recommendMin: 20 }),
  spot('yueye', '山地自行车越野径', 'attraction', 0.4253, 0.2938, { recommendMin: 25 }),
  spot('yueduba', '悦读吧', 'attraction', 0.418, 0.336, { recommendMin: 10 }),
  spot('junziyuan', '君子苑', 'attraction', 0.448, 0.322, { recommendMin: 15 }),
  spot('zuomei', '做梅湖', 'attraction', 0.5637, 0.3088, { recommendMin: 15 }),
  spot('yequ', '野趣寻踪径', 'attraction', 0.4652, 0.3664, { recommendMin: 20 }),

  // 西区
  spot('qinxiang', '沁香园', 'attraction', 0.3243, 0.4163, { recommendMin: 20 }),
  spot('senlin-ketang', '森林课堂', 'attraction', 0.4628, 0.4161),
  spot('kepu', '自然科普径', 'attraction', 0.4259, 0.4356, { recommendMin: 20 }),
  spot('mayin', '马饮泉', 'attraction', 0.3907, 0.4681, { recommendMin: 10 }),
  spot('senlin-yuchang', '森林浴场', 'attraction', 0.2977, 0.5231, { recommendMin: 25 }),
  spot('liaoyang', '森林疗养步道', 'attraction', 0.3062, 0.5918, { recommendMin: 25 }),
  spot('senlin-yangba', '森林氧吧', 'attraction', 0.4094, 0.6306),
  spot('fenghuotai', '烽火台遗址', 'attraction', 0.3235, 0.6866),
  spot('lansheng', '大夫揽胜径', 'attraction', 0.4167, 0.7036, { recommendMin: 30 }),

  // 中东部：用户指出的月季花田 / 金莲木花海
  spot('yueji', '月季花田景观', 'attraction', 0.5297, 0.5037, { recommendMin: 20 }),
  spot('hexin', '社会主义核心价值观主题园', 'attraction', 0.5209, 0.5083, { recommendMin: 15 }),
  spot('jinlianmu', '金莲木花海景观', 'attraction', 0.6171, 0.5242, { recommendMin: 20 }),
  spot('zijing', '紫荆花景观', 'attraction', 0.4871, 0.5376),
  spot('qixian', '七仙湖', 'attraction', 0.5211, 0.5419),
  spot('weitang', '苇塘垂钓园', 'attraction', 0.7148, 0.5234),
  spot('zhiwu', '植物园', 'attraction', 0.7335, 0.5263, { recommendMin: 20 }),
  spot('juxiuyuan', '聚秀园', 'attraction', 0.73, 0.555, { recommendMin: 15 }),
  spot('shanlin', '杉林栈道', 'attraction', 0.5019, 0.571, { recommendMin: 15 }),
  spot('qingyuan', '情缘湖', 'attraction', 0.5841, 0.5641),
  spot('hongshan', '红山湖', 'attraction', 0.6134, 0.5639),
  spot('youtian-east', '游艇码头', 'attraction', 0.6605, 0.5842),
  spot('yingyue', '映月荷塘', 'attraction', 0.7016, 0.6112, { recommendMin: 20 }),
  spot('zhiqiyuan', '稚趣园', 'attraction', 0.5833, 0.6121),
  spot('conglin', '丛林探险', 'attraction', 0.559, 0.6166),
  spot('guanniao', '观鸟平台', 'attraction', 0.6834, 0.6325),
  spot('shengxiao', '生肖廊', 'attraction', 0.698, 0.635),

  // 南区
  spot('huxindao', '湖心岛', 'attraction', 0.6534, 0.6582),
  spot('shulin', '疏林草地', 'attraction', 0.7358, 0.6552),
  spot('baihua', '百花园', 'attraction', 0.7091, 0.6671, { recommendMin: 25 }),
  spot('fengyu', '风雨亭', 'attraction', 0.6982, 0.6716, { recommendMin: 8 }),
  spot('zhushan', '竹山湖', 'attraction', 0.6156, 0.6778),
  spot('fengyu-lang', '风雨长廊', 'attraction', 0.7153, 0.6993),
  spot('juxiu', '聚秀湖', 'attraction', 0.6719, 0.7089, { recommendMin: 20 }),
  spot('zijing-south', '紫荆花景观', 'attraction', 0.6135, 0.716),
  spot('miaopu', '苗圃基地', 'attraction', 0.5168, 0.7209),
  spot('caizhai', '采摘乐园', 'attraction', 0.654, 0.7265),
  spot('juxiutai', '聚秀台', 'attraction', 0.7307, 0.7278),
  spot('pipa', '琵琶岛', 'attraction', 0.696, 0.7538),
  spot('guanyu', '观鱼平台', 'attraction', 0.6429, 0.7763),
  spot('huating', '划艇基地', 'attraction', 0.6231, 0.7889),
  spot('fengshan-chaxuan', '凤山茶轩', 'attraction', 0.6121, 0.7958),
  spot('youtian-south', '游艇码头', 'attraction', 0.6907, 0.8007),
  spot('huxin', '湖心亭', 'attraction', 0.7132, 0.8105, { recommendMin: 10 }),
  spot('fengshan', '凤山湖', 'attraction', 0.6459, 0.8195),
  spot('fengshanguan', '凤山馆', 'attraction', 0.670, 0.848),
  spot('guanli', '公园管理处', 'attraction', 0.662, 0.888),
  spot('yingbin', '迎宾园', 'attraction', 0.655, 0.910),
  spot('nanmen-guangchang', '南门入口广场', 'attraction', 0.668, 0.932),

  // 厕所：对准图上每一个 WC 方块
  spot('wc-north', '北门厕所', 'toilet', 0.5645, 0.0696, { tags: ['无障碍设施'] }),
  spot('wc-cuijing', '翠景湖厕所', 'toilet', 0.435, 0.091),
  spot('wc-hetang', '荷塘月色厕所', 'toilet', 0.3755, 0.1437),
  spot('wc-danche', '单车驿站厕所', 'toilet', 0.443, 0.1474),
  spot('wc-siji', '四季杉影厕所', 'toilet', 0.446, 0.2265),
  spot('wc-wugan', '五感花园厕所', 'toilet', 0.52, 0.27),
  spot('wc-junzi', '君子苑厕所', 'toilet', 0.45, 0.307),
  spot('wc-qinxiang', '沁香园厕所', 'toilet', 0.318, 0.418),
  spot('wc-qinxiang2', '沁香园厕所', 'toilet', 0.338, 0.43),
  spot('wc-kepu', '自然科普径厕所', 'toilet', 0.44, 0.509),
  spot('wc-huatian', '花田厕所', 'toilet', 0.515, 0.4937),
  spot('wc-yuchang', '森林浴场厕所', 'toilet', 0.29, 0.571),
  spot('wc-weitang', '垂钓园厕所', 'toilet', 0.64, 0.521),
  spot('wc-zhiwu', '植物园厕所', 'toilet', 0.7115, 0.5088),
  spot('wc-zijing', '紫荆花厕所', 'toilet', 0.46, 0.597),
  spot('wc-yingyue', '映月荷塘厕所', 'toilet', 0.6965, 0.5916),
  spot('wc-conglin', '丛林探险厕所', 'toilet', 0.54, 0.615),
  spot('wc-shanlin', '杉林栈道厕所', 'toilet', 0.475, 0.641),
  spot('wc-lansheng', '揽胜径厕所', 'toilet', 0.4295, 0.6989),
  spot('wc-juxiu', '聚秀湖厕所', 'toilet', 0.61, 0.716),
  spot('wc-juxiutai', '聚秀台厕所', 'toilet', 0.725, 0.729),
  spot('wc-bandao', '半岛厕所', 'toilet', 0.644, 0.7271),
  spot('wc-kongque', '孔雀园厕所', 'toilet', 0.59, 0.805),
  spot('wc-huxin', '湖心亭厕所', 'toilet', 0.66, 0.83),
  spot('wc-fengshan', '凤山馆厕所', 'toilet', 0.64, 0.848),
  spot('wc-south', '南门厕所', 'toilet', 0.7, 0.905, { tags: ['无障碍设施'] }),
  spot('wc-southwest', '西南门厕所', 'toilet', 0.4265, 0.8984),

  spot('food-north', '北门餐饮', 'food', 0.588, 0.0571, { hours: '以现场为准' }),
  spot('food-qinxiang', '沁香园餐饮', 'food', 0.298, 0.4216, { hours: '以现场为准' }),
  spot('food-zuomei', '做梅湖餐饮', 'food', 0.536, 0.336, { hours: '以现场为准' }),
  spot('food-huatian', '花田餐饮', 'food', 0.535, 0.4674, { hours: '以现场为准' }),
  spot('food-baihua', '百花园餐饮', 'food', 0.705, 0.6537, { hours: '以现场为准' }),
  spot('food-caizhai', '采摘乐园餐饮', 'food', 0.616, 0.7252, { hours: '以现场为准' }),
  spot('food-south', '南门餐饮', 'food', 0.675, 0.9046, { hours: '以现场为准' }),
]

export const TYPE_META = {
  attraction: {
    label: '景点',
    short: '景点',
    color: '#f3ddd8',
    ink: '#8d4a44',
    pin: '#d08a84',
    icon: '景',
  },
  toilet: {
    label: '公共厕所',
    short: '厕所',
    color: '#d9e6f2',
    ink: '#3f6288',
    pin: '#7d9cbc',
    icon: 'WC',
  },
  rest: {
    label: '休息亭',
    short: '休息',
    color: '#eee6c8',
    ink: '#6f5d28',
    pin: '#c2ae74',
    icon: '亭',
  },
  exit: {
    label: '出入口',
    short: '出口',
    color: '#f1d9d6',
    ink: '#8d4540',
    pin: '#cc8882',
    icon: '出',
  },
  food: {
    label: '餐饮',
    short: '餐饮',
    color: '#f0dfd2',
    ink: '#7d5340',
    pin: '#c49a82',
    icon: '餐',
  },
}

export const FILTERS = [
  { id: 'attraction', label: '景点' },
  { id: 'toilet', label: '厕所' },
  { id: 'exit', label: '出口' },
  { id: 'food', label: '餐饮' },
]

export const POIS = raw.map((item) => {
  const xy = xyToLatLng(item.x, item.y)
  return { ...item, lat: xy.lat, lng: xy.lng }
})

export function getPoi(id) {
  return POIS.find((p) => p.id === id) || null
}

export function poisByType(type) {
  if (!type) return POIS
  return POIS.filter((p) => p.type === type)
}

export function searchPois(keyword) {
  const q = (keyword || '').trim()
  if (!q) return POIS
  return POIS.filter((p) => p.name.includes(q) || TYPE_META[p.type].label.includes(q))
}

export function withDistance(pois, from) {
  if (!from) return pois.map((p) => ({ ...p, distance: null, walkMin: null }))
  return pois
    .map((p) => {
      const distance = haversine(from, p)
      return { ...p, distance, walkMin: walkMinutes(distance) }
    })
    .sort((a, b) => a.distance - b.distance)
}

export const PARK_INFO = {
  name: '大夫山森林公园',
  hours: '8:00-18:00（夏季或延至 18:30）',
  phone: '020-84801183',
  address: '广州市番禺区禺山西路668号',
  ticket: '免费开放',
  note: MAP_NOTE,
}
