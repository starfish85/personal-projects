/** 根据百科、规划图功能和园区分区整理。规划点注明现场以开放为准。 */

export const COPY = {
  'gate-north': {
    intro:
      '北门是大夫山北区的主要出入口，面向钟村一带，门外有停车场和公交站。2002年北区建设时一并完善，进来不远就是翠景湖、云岫湖等湖景和儿童游乐场。适合住祈福、钟村的游客从这边进园散步。',
    introEn:
      'The North Gate is the main entrance to the north area of Dafushan, facing Zhongcun. There is parking and a bus stop outside. It was improved when the north area opened in 2002. Just inside are lakes such as Cuijing and Yunxiu, and a play area for children. It is a convenient way in if you stay in Clifford or Zhongcun.',
    voice: '这里是大夫山北门，进园就是湖景和游乐场。',
  },
  'gate-east': {
    intro:
      '东门靠近聚秀园、植物园一侧，是公园东缘的出入口。附近有苇塘、游艇码头和映月荷塘，适合走湖边平路。人比南门、北门少一些，适合想安静进园的游客。',
    introEn:
      'The East Gate sits on the east edge of the park, near Juxiu Garden and the Botanical Garden. Nearby are reed ponds, a boat dock, and the Moonlight Lotus Pond. Paths by the water are fairly flat. It is quieter than the South or North Gate, and a good choice if you want a calmer way in.',
    voice: '这里是大夫山东门，附近多是湖景和平路。',
  },
  'gate-south': {
    intro:
      '南门在禺山西路668号，是大夫山最早开放的主入口。1999年首期工程就是以南区聚秀湖为中心建成开放的。门外有停车场和公交，进门可见入口广场和迎宾园，再往里是凤山湖、聚秀湖和百花园。',
    introEn:
      'The South Gate at 668 Yushan West Road is the oldest main entrance to Dafushan. The first phase opened in 1999 around Juxiu Lake. There is parking and a bus stop outside. Inside you will see the entrance plaza and Welcome Garden, then Fengshan Lake, Juxiu Lake, and the Hundred-Flower Garden.',
    voice: '这里是大夫山南门，进园先到迎宾园和聚秀湖。',
    photo: 'images/welcome-hero.jpg',
  },
  'gate-southwest': {
    intro:
      '西南门靠近禺山西路西段，是公园西南角的出入口。这边人相对少，进园后多是山径和林道，去烽火台、大夫揽胜径比较近。腿脚不便的游客建议走南门平路。',
    introEn:
      'The Southwest Gate is at the southwest corner of the park, near the west stretch of Yushan West Road. It is quieter here. Inside you will find more hill paths and forest trails, closer to the Beacon Tower and the Dafu Scenic Trail. If walking is hard, please use the flatter South Gate instead.',
    voice: '这里是西南门，进园多是山径，去主峰比较近。',
  },

  chashui: {
    intro:
      '茶水平台在北门一带湖区，是临水休息、看湖的小平台。北区2002年建设时围绕翠景湖、云岫湖布置了多处亲水节点，这里适合坐下歇脚、看远处树影，不必走远。',
    introEn:
      'The Tea Platform is a small waterside rest spot in the North Gate lakes. When the north area was built in 2002, several places like this were set around Cuijing Lake and Yunxiu Lake. You can sit, rest, and watch the trees on the water. You do not need to walk far.',
    voice: '茶水平台临水，适合坐下歇脚看湖。',
  },
  cuijing: {
    intro:
      '翠景湖是北区主要人工湖之一。2002年大夫山二期建设北区，翠景湖、云岫湖、晴云湖一起成为北门最常见的湖景。湖边路较平，适合老人慢走，也常有人在此放风、带小孩。',
    introEn:
      'Cuijing Lake is one of the main man-made lakes in the north area. Together with Yunxiu Lake and Qingyun Lake, it is the lake view most visitors see after the North Gate. The shore path is fairly flat, good for a slow walk. People often come here to relax or bring children.',
    voice: '翠景湖是北门最常见的湖景，岸边路比较平。',
  },
  yunxiu: {
    intro:
      '云岫湖与翠景湖相邻，同属北区湖群。湖面不大，树影倒映，名字取云气出岫之意。沿湖走一圈不远，可和翠景湖、晴云湖连成一条轻松的北门散步线。',
    introEn:
      'Yunxiu Lake sits beside Cuijing Lake in the north lake group. The water is not large, and trees reflect on the surface. The name suggests clouds drifting from the hills. A loop around the lake is short. You can link it with Cuijing Lake and Qingyun Lake for an easy walk from the North Gate.',
    voice: '云岫湖就在翠景湖旁边，适合慢慢绕湖走。',
  },
  danche: {
    intro:
      '单车驿站在北区湖边，是骑行补给和休息的地方。园内不少人骑车环湖、上坡，这里可停靠、歇脚。旁边就是童趣园，带小孩的游客常在这一带走。',
    introEn:
      'The Bike Station is by the north lakes, a place to rest and park a bicycle. Many people ride around the lakes or up the hills. You can stop here. The Children Play Garden is next door, so families with children often walk this stretch.',
    voice: '单车驿站可以休息、停靠自行车，旁边是童趣园。',
  },
  tongqu: {
    intro:
      '童趣园靠近北门单车驿站，是给小朋友玩的场地。北区规划有儿童游乐，园内南门、北门附近都设过游乐场。适合亲子短停，大人可在旁边树荫下看着。',
    introEn:
      'The Children Play Garden is near the Bike Station by the North Gate. It is a play area for children. Both the north and south areas have had play facilities. It is good for a short family stop. Adults can watch from the shade nearby.',
    voice: '童趣园给小朋友玩，大人可以在旁边休息。',
  },
  'youtian-north': {
    intro:
      '北区游艇码头临湖，是北门一带的水上活动点。公园湖面约1500亩，游船、骑行是周末常见项目。是否开船、能否租艇以当天现场为准，码头本身也适合看水。',
    introEn:
      'The north boat dock sits on the lake near the North Gate. The park has a large water area. Boat rides and cycling are common on weekends. Whether boats run or can be rented depends on the day. The dock itself is still a nice place to look at the water.',
    voice: '北区游艇码头临湖，开不开船要看当天现场。',
  },
  yayunlin: {
    intro:
      '亚运林在北区湖群南侧，是一片纪念林和绿化带。大夫山大量补种了宫粉紫荆、红花紫荆、大叶紫薇等观花树。这一带树荫好，适合从湖边转到林中慢慢走。',
    introEn:
      'The Asian Games Grove is south of the north lakes. It is a memorial planting and green belt. Dafushan has added many flowering trees such as bauhinia and crape myrtle. The shade is good here. It is a cool walk from the lakes into the woods.',
    voice: '亚运林树荫好，从湖边走进林子很凉快。',
  },
  qiandao: {
    intro:
      '千岛湖是北区一处湖汊较多的水面，岸线曲折，远看像许多小岛。公园内水域约73公顷，湖泊星罗棋布。这里适合沿岸散步，不必下到很陡的坡。',
    introEn:
      'Qiandao Lake in the north area has many inlets. The shoreline bends, and from a distance it looks like small islands. The park has about 73 hectares of water. This is a good place for a walk along the shore. You do not need to go down a steep slope.',
    voice: '千岛湖岸线弯弯绕绕，适合沿湖慢慢走。',
  },
  shuishang: {
    intro:
      '水上乐园在北区湖边，规划为亲水游乐点。园内北门、南门附近都安排过儿童和成人游乐设施。具体开放项目以现场为准，未开业时也可在岸边看水休息。',
    introEn:
      'The Water Park by the north lakes is planned as a water play spot. Play facilities for children and adults have been set near both the North Gate and the South Gate. What is open depends on the day. If it is closed, you can still rest by the water.',
    voice: '水上乐园是北区亲水点，开没开要以现场为准。',
  },
  qingyun: {
    intro:
      '晴云湖是北区三湖之一，和翠景湖、云岫湖一起构成北门最有代表性的湖光。水面开阔处风大一些，阴天云影贴着水走，很适合拍远景。岸边多是步道，坡度不大。',
    introEn:
      'Qingyun Lake is one of the three north lakes, together with Cuijing Lake and Yunxiu Lake. Open water can be windier. On cloudy days, the sky moves across the surface, good for a wide photo. Most of the shore is a path with a gentle slope.',
    voice: '晴云湖和翠景湖、云岫湖连成北门的湖景。',
  },
  xuanlan: {
    intro:
      '绚烂杉塘在北区杉林与水塘交接处，规划强调水岸和针叶林的层次。公园后来补种了许多观叶观花植物。秋冬杉影更明显，夏天则以绿荫为主，适合短停拍照。',
    introEn:
      'Cedar Pond sits where cedars meet the water in the north area. The design plays on layers of shoreline and evergreen trees. Later plantings added more color. In autumn and winter the cedars stand out. In summer it is mostly green shade, good for a short photo stop.',
    voice: '绚烂杉塘是杉林和水塘交界的地方，适合拍照。',
  },
  'hetang-yuese': {
    intro:
      '荷塘月色在北区西侧水塘，夏天荷叶田田，是北门一带看荷的地方。南区也有荷花池、映月荷塘，北区这一处相对安静。开花季节人会多一些，平时适合绕塘慢走。',
    introEn:
      'The Lotus Pond is a west-side pond in the north area. In summer the lotus leaves are thick. It is a place to see lotus near the North Gate. The south area has lotus ponds too; this one is quieter. It is busier in bloom season. On other days, a slow walk around the pond is pleasant.',
    voice: '荷塘月色夏天看荷，平时绕塘走走也很安静。',
  },
  'siji-shan': {
    intro:
      '四季杉影是北区一片杉林景观，不同季节颜色和疏密会变。大夫山原来林相较单一，后来补种观花观叶树，杉林仍是很有识别度的背景。林下步道阴凉，适合夏天走。',
    introEn:
      'The Four-Season Cedars are a cedar grove in the north area. Color and density change with the seasons. Dafushan once had a simpler forest; later flowering trees were added, but the cedars are still easy to recognize. The path under the trees is cool, good in summer.',
    voice: '四季杉影是一片杉林，夏天走很阴凉。',
  },
  wugan: {
    intro:
      '五感花园在北区往中部过渡的位置，规划用植物和场地调动看、听、闻、触、味。园内乡土植物约225种，杜鹃、野牡丹等也有成片种植。适合慢慢停，不适合赶路。',
    introEn:
      'The Five Senses Garden sits where the north area meets the center. Plants and space are meant to engage sight, sound, smell, touch, and taste. The park has about 225 native plant species, with azalea and other flowers in patches. Slow down here. It is not a place to rush.',
    voice: '五感花园用花草调动感官，适合慢慢停一停。',
  },
  yueye: {
    intro:
      '山地自行车越野径在西侧山坡，是给骑行爱好者准备的起伏路。大夫山丘陵多、落差明显，主峰海拔226.6米。老人和推婴儿车的游客请走旁边的平路，不要上越野线。',
    introEn:
      'The mountain-bike trail is on the west slope, a rolling path for riders. Dafushan is hilly. The main peak is 226.6 meters. Older visitors and anyone with a stroller should use the flatter path beside it. Please do not take the off-road line.',
    voice: '山地车越野径起伏大，散步请走旁边的平路。',
  },
  yueduba: {
    intro:
      '悦读吧在君子苑旁边，是林中休息、看书的小空间。公园在山上和湖边都设了亭廊、石凳，方便歇脚。这里树荫好，适合坐一会儿再决定往湖边还是往山上走。',
    introEn:
      'The Reading Corner is next to Junzi Garden, a small shady place to rest or read. The park has pavilions and stone benches on the hills and by the lakes. The shade is good here. Sit for a while, then decide whether to walk toward the lake or up the hill.',
    voice: '悦读吧可以坐下歇脚、看看书，树荫很好。',
  },
  junziyuan: {
    intro:
      '君子苑临近越野径和悦读吧，取意梅兰竹菊等“君子”植物。园内引种了紫荆、黄槐、大叶紫薇等观花树。这里适合短逛，旁边就有厕所和餐饮图标，方便老人。',
    introEn:
      'Junzi Garden is near the bike trail and the Reading Corner. The name comes from classic plants such as plum, orchid, bamboo, and chrysanthemum. Flowering trees such as bauhinia and cassia grow here. It is good for a short stroll. A restroom and snacks are marked nearby.',
    voice: '君子苑多种着观花树木，旁边就能休息。',
  },
  zuomei: {
    intro:
      '做梅湖一带在规划图上和竹韵湖、艳菊湖连成一片水景。公园人工湖像镜子一样嵌在山岭之间，体现山光水色。这一带路绕湖走，适合看水，具体湖名以现场标牌为准。',
    introEn:
      'Zuomei Lake links with nearby ponds on the plan into one stretch of water. The man-made lakes sit like mirrors among the hills. Paths follow the shore, good for watching the water. Please follow the names on the signs you see on site.',
    voice: '做梅湖一带是连片水景，适合绕湖看水。',
  },
  yequ: {
    intro:
      '野趣寻踪径在中西部林下，属于水寮野趣、森林逗趣一类的自然步道。路面可能有根茎和碎石，请穿防滑鞋、走慢一点。适合想听鸟、看林相的游客，不适合赶时间。',
    introEn:
      'The Wild Path is a forest trail in the west-central woods. The ground may have roots and loose stones. Please wear shoes with grip and walk slowly. It is for visitors who want birds and trees, not for anyone in a hurry.',
    voice: '野趣寻踪径是林下小路，请走慢一点、穿防滑鞋。',
  },

  qinxiang: {
    intro:
      '沁香园在公园西侧，园中多香花香草，规划为闻香、休息的庭园。大夫山补种了大量杜鹃、野牡丹和紫荆。花期更香，平时也是西区上山前常见的歇脚点，旁边有厕所和餐饮。',
    introEn:
      'Qinxiang Garden is on the west side of the park. It is planted with scented flowers and herbs, a garden for rest and fragrance. Dafushan has added many azaleas, wild peonies, and bauhinia. It smells strongest in bloom. It is also a common rest stop before you climb the west hills. A restroom and snacks are nearby.',
    voice: '沁香园花香多，上山前可以在这里歇一歇。',
  },
  'senlin-ketang': {
    intro:
      '森林课堂在林中较为开敞的地段，用来做自然教育和科普活动。园内有维管束植物三百多种，也常有志愿者和学校来做讲解。没有活动时，这里仍是阴凉的休息空地。',
    introEn:
      'The Forest Classroom is an open spot in the woods for nature education. The park has more than three hundred vascular plants. Volunteers and schools often give talks here. When there is no program, it is still a cool place to sit and rest.',
    voice: '森林课堂做自然教育，没活动时也能坐下休息。',
  },
  kepu: {
    intro:
      '自然科普径连接西区林道和马饮泉一带，沿路介绍树木、水文和山岗典故。西部有大乌岗、二乌岗、三乌岗等历史科普点。坡度比湖边大一些，走累了就近找亭子歇。',
    introEn:
      'The Nature Trail links the west forest paths with Mayin Spring. Along the way you will see notes on trees, water, and hill stories. The west side has historic spots such as Dawugang. It is steeper than the lakeshore. If you tire, rest at the nearest pavilion.',
    voice: '自然科普径一边走一边看树木和山岗说明。',
  },
  mayin: {
    intro:
      '马饮泉又叫饮马泉，是园内有名的人文点。相传西汉陆贾南下说服南越王赵佗归汉，路过此处人困马渴，马用前蹄刨出甘泉。大夫山之名也与陆贾“太中大夫”的传说有关。',
    introEn:
      'Mayin Spring, also called the Horse-Drinking Spring, is a well-known story spot. Legend says the Han envoy Lu Jia came south to persuade King Zhao Tuo. His horse was thirsty and struck a sweet spring with its hoof. The name Dafushan is also tied to Lu Jia, who held the title Grand Master.',
    voice: '马饮泉传说是陆贾的马刨出的甘泉，是园里的典故点。',
  },
  'senlin-yuchang': {
    intro:
      '森林浴场在西侧山坡林分较密处，强调在树林里慢走、深呼吸。公园绿化覆盖率约88%，被称为番禺的氧吧。这里没有湖边风大，夏天更阴凉，路面以步道为主。',
    introEn:
      'The Forest Bath is on a wooded west slope, meant for a slow walk and deep breaths. About 88 percent of the park is green, and people call it the oxygen bar of Panyu. It is less windy than the lakes, and cooler in summer. The ground is mostly a walking path.',
    voice: '森林浴场林子密、很阴凉，适合慢慢走、深呼吸。',
  },
  liaoyang: {
    intro:
      '森林疗养步道在西区山腰，坡度缓，专为散步养生设计。山上多有石级、石凳和避雨亭。走完一段就能看到林隙和远处湖光，老人建议分段走，不要一次冲到顶。',
    introEn:
      'The Forest Wellness Trail runs along the west hillside. The slope is gentle, made for a health walk. There are stone steps, benches, and rain pavilions. After each stretch you may see gaps in the trees and lakes in the distance. Please walk in stages. Do not push to the top in one go.',
    voice: '森林疗养步道比较缓，适合分段走、中途坐下。',
  },
  'senlin-yangba': {
    intro:
      '森林氧吧靠近主峰一侧，是吸新鲜空气、看林海的停留点。园内原有马尾松、相思，后来补种许多阔叶和花木。风过树梢声音很清楚，适合站一会儿再决定是否继续上山。',
    introEn:
      'The Forest Oxygen Bar is near the main peak, a stop for fresh air and a view of the woods. The park once had more pine and acacia; later many broadleaf and flowering trees were added. You can hear the wind in the leaves. Stand for a while, then decide whether to keep climbing.',
    voice: '森林氧吧空气好，可以站一会儿再决定上不上山。',
  },
  fenghuotai: {
    intro:
      '烽火台遗址在主峰一带，是园内最重要的历史遗迹之一。大夫山主峰海拔226.6米，山上还留有古代烽堠的痕迹。上去能远眺番禺城郊，台阶较多，腿脚不好请量力，可走大夫揽胜径缓上。',
    introEn:
      'The Beacon Tower site is near the main peak, one of the most important historic remains in the park. The peak is 226.6 meters high. Traces of an old signal post remain. From the top you can look over Panyu. There are many steps. If walking is hard, go slowly, or take the gentler Dafu Scenic Trail.',
    voice: '烽火台在主峰，能远眺，台阶多，请量力而行。',
  },
  lansheng: {
    intro:
      '大夫揽胜径是上主峰、看全园的登山道。公园在各山修了石级，并设避雨亭和石凳。从南区上山较常见，途中可看林相变化。全程比湖边累，建议带水、走一段歇一段。',
    introEn:
      'The Dafu Scenic Trail is the climbing path to the main peak and a view of the whole park. Stone steps, rain pavilions, and benches are set on the hills. Many people start from the south. The forest changes along the way. It is harder than the lakeshore. Please bring water and rest between stretches.',
    voice: '大夫揽胜径是上主峰的路，请带水、走一段歇一段。',
  },

  yueji: {
    intro:
      '月季花田在中部花田景观区，花期成片开放，颜色鲜艳。园内还种有杜鹃、野牡丹、紫荆等。拍照请走田埂边的路，不要踩进花田。没开花的季节也能看田间格局和周边湖景。',
    introEn:
      'The Rose Field is in the central flower area. In bloom the colors are bright across the plots. The park also grows azalea, wild peony, and bauhinia. Please stay on the path when you take photos. Do not step into the flowers. In off season you can still see the field layout and nearby lakes.',
    voice: '月季花田开花时很艳，请走路边，不要踩进花田。',
  },
  hexin: {
    intro:
      '社会主义核心价值观主题园在花田附近，是一处主题绿化和小广场。公园作为市民公园，常承担志愿活动、宣传展示。场地平整，适合短停、集合，再去旁边的月季花田或七仙湖。',
    introEn:
      'The Core Values Garden is near the flower fields, a themed green space and small plaza. As a city park, Dafushan often hosts volunteer and public displays. The ground is level, good for a short stop or a meetup, then you can walk to the Rose Field or Qixian Lake.',
    voice: '主题园场地比较平，适合短停后再去旁边花田。',
  },
  jinlianmu: {
    intro:
      '金莲木花海在中东部，规划为成片观花。金莲木花小而密，盛开时像铺了一层金子。大夫山四季都有不同花木，这里是专门看花的点之一。花期以当年现场为准。',
    introEn:
      'The Ochna Flower Field is in the east-central area, planned as a mass of blossoms. The flowers are small and dense. In full bloom they look like a sheet of gold. Dafushan has different flowers in every season. This is one of the spots made for flower viewing. Bloom time depends on the year.',
    voice: '金莲木花海开花时一片金黄，花期看当天现场。',
  },
  zijing: {
    intro:
      '紫荆花景观在中部，宫粉紫荆、红花紫荆是园内重点补种的观花乔木，数量以千计。春天花开满树，是大夫山很有辨识度的颜色。树下多有步道，适合边走边看，不必久站暴晒。',
    introEn:
      'The Bauhinia Grove is in the center of the park. Pink and red bauhinia were planted in the thousands. In spring the trees are full of flowers, a color many people know Dafushan by. There are paths under the trees. Walk as you look. You do not need to stand long in the sun.',
    voice: '紫荆花春天开满树，是大夫山很常见的花景。',
  },
  qixian: {
    intro:
      '七仙湖是中部一处山塘改建的湖面。2000年前后园内做过七盏灯山塘大坝等改造。湖不大，岸线自然，适合从花田走到红山湖之间歇一歇，听听水声。',
    introEn:
      'Qixian Lake is a former hill pond in the center, rebuilt around the year 2000. The lake is not large, and the shore looks natural. It is a good rest between the flower fields and Hongshan Lake. You can sit and listen to the water.',
    voice: '七仙湖不大，走花田去红山湖时可以在这里歇脚。',
  },
  weitang: {
    intro:
      '苇塘垂钓园在东侧水岸，芦苇和水塘连在一起，是钓鱼和看水鸟的地方。公园建成项目里包括钓鱼区。请遵守园方规定，不要占用步道，岸边潮湿，老人走路要小心。',
    introEn:
      'The Reed Fishing Garden is on the east shore, where reeds meet the ponds. People come to fish and watch water birds. Please follow park rules and keep the path clear. The bank can be wet. Walk carefully.',
    voice: '苇塘可以看芦苇、钓鱼，岸边湿，走路请小心。',
  },
  zhiwu: {
    intro:
      '植物园在东门内侧，集中展示园内花木。大夫山有维管束植物三百多种，并大面积种植玉堂春、紫荆、杜鹃、大叶紫薇。适合慢慢认植物，夏天树荫连成片，比湖边晒。',
    introEn:
      'The Botanical Garden is just inside the East Gate, a place to see the park plants together. Dafushan has more than three hundred vascular plants, with magnolia, bauhinia, azalea, and crape myrtle in large groups. Walk slowly and look at the labels. In summer the shade is better than the open lakeshore.',
    voice: '植物园能看到很多花木，夏天树荫很连片。',
  },
  juxiuyuan: {
    intro:
      '聚秀园在东岸，和聚秀湖、百花园互相借景。南区首期就是以聚秀湖为中心的湖光花木区。这里庭园感更强，路平，适合不愿走长路的游客在东门附近转一圈。',
    introEn:
      'Juxiu Garden is on the east shore, looking onto Juxiu Lake and the Hundred-Flower Garden. The first phase of the south area was built around this lake and its gardens. Paths here are flat. If you do not want a long walk, a short loop near the East Gate is enough.',
    voice: '聚秀园在东岸，路比较平，适合就近转一圈。',
  },
  shanlin: {
    intro:
      '杉林栈道架在中部杉林里，走起来比泥土路干净，也能减少踩踏林地。栈道有轻微起伏，请抓牢扶手。从这里可以连到情缘湖、红山湖一带，是中部很常用的通道。',
    introEn:
      'The Cedar Boardwalk runs through the central cedar grove. It is cleaner than a dirt path and protects the woodland. There is a slight rise and fall. Please hold the rail. It links toward Qingyuan Lake and Hongshan Lake, a common route through the center.',
    voice: '杉林栈道比较好走，请抓好扶手，注意脚下。',
  },
  qingyuan: {
    intro:
      '情缘湖在红山湖西侧，水面安静，岸边树多。中部几个湖距离不远，可以一次走完情缘湖、红山湖和游艇码头。适合情侣和老年伴侣慢慢拍照，不必爬山。',
    introEn:
      'Qingyuan Lake is west of Hongshan Lake. The water is quiet and the shore is tree-lined. The central lakes are close together. You can walk Qingyuan Lake, Hongshan Lake, and the boat dock in one go. It is good for a slow photo walk. You do not need to climb.',
    voice: '情缘湖很安静，和红山湖离得近，不用爬山。',
  },
  hongshan: {
    intro:
      '红山湖是园内四个人工湖之一，和聚秀湖、凤山湖、竹山湖一起构成山光水色。红山景区还有红山寨建筑群、长廊和观景台，远远望去有些南洋风情。湖边可休息，也可转去茶轩。',
    introEn:
      'Hongshan Lake is one of four main man-made lakes, together with Juxiu Lake, Fengshan Lake, and Zhushan Lake. The Hongshan area also has buildings, a long corridor, and a lookout, with a hint of Nanyang style from a distance. You can rest by the water or walk on to the tea house.',
    voice: '红山湖是园里主要人工湖之一，旁边还有廊和观景台。',
  },
  'youtian-east': {
    intro:
      '东区游艇码头在聚秀湖、红山湖水系一侧，方便游船上下。聚秀湖边就规划了游艇码头和饮绿居。开船时间、票价以当天告示为准；不开船时，码头仍是看湖的好位置。',
    introEn:
      'The east boat dock is on the Juxiu Lake and Hongshan Lake water system, a place to board a boat. Hours and tickets are posted on the day. If boats are not running, the dock is still a good place to look at the lake.',
    voice: '东区游艇码头看湖很方便，开不开船看当天告示。',
  },
  yingyue: {
    intro:
      '映月荷塘在东岸，对应园志里常写的荷塘飘香、荷花池。夏天荷花开，晚上若有月光，水面更静。南门、东门过来都还算平，是老人容易走到的赏荷点。',
    introEn:
      'The Moonlight Lotus Pond is on the east shore. In summer the lotus bloom. At night, if there is moonlight, the water looks even quieter. Paths from the South Gate and East Gate are fairly flat. It is an easy lotus stop for older visitors.',
    voice: '映月荷塘夏天赏荷，从南门、东门过来路比较平。',
  },
  zhiqiyuan: {
    intro:
      '稚趣园靠近丛林探险，是给孩子玩耍的场地。南区游乐场面积比北区更大，历史上有滑梯、爬网等。具体设施以现场为准，大人请看好孩子，旁边就有厕所。',
    introEn:
      'The Kids Play Garden is near Jungle Adventure, a play area for children. The south play zone is larger than the north. Equipment such as slides has been here in the past. What you find depends on the day. Please watch children. A restroom is nearby.',
    voice: '稚趣园给孩子玩，请大人看着，旁边有厕所。',
  },
  conglin: {
    intro:
      '丛林探险在中南部林地，有探索、攀爬类项目的规划。树密、地面可能不平。只想散步的游客可以从旁边的步道绕开。参加项目请看现场管理和年龄、身体要求。',
    introEn:
      'Jungle Adventure is in the south-central woods, with climbing and explore activities in the plan. The trees are dense and the ground may be uneven. If you only want a walk, take the path around it. If you join an activity, please check age and health rules on site.',
    voice: '丛林探险地面不平，只想散步可以从旁边绕开。',
  },
  guanniao: {
    intro:
      '观鸟平台伸向水岸和林缘，方便看鹭、水禽和林鸟。公园湖多林密，早上和傍晚鸟更活跃。请保持安静、不要投喂。平台一般有栏杆，仍请看管好小孩。',
    introEn:
      'The Birdwatching Deck reaches toward the water and the tree line, good for egrets, water birds, and forest birds. Birds are more active in the morning and evening. Please keep quiet and do not feed them. There is usually a rail. Still watch children closely.',
    voice: '观鸟平台适合安静看鸟，请不要投喂、不要奔跑。',
  },
  shengxiao: {
    intro:
      '生肖廊就是常说的十二生肖林、生肖雕塑廊，在南区湖光花木区。南门一带传统景点包括聚秀湖、百花园、生肖林和荷花池。廊子能遮阳挡雨，适合带老人、小孩认生肖、拍照。',
    introEn:
      'The Zodiac Walk is the twelve-animal corridor in the south gardens. Classic stops near the South Gate include Juxiu Lake, the Hundred-Flower Garden, the Zodiac Walk, and the lotus ponds. The roof gives shade and rain cover. It is a good place to take photos with older visitors and children.',
    voice: '生肖廊有十二生肖，能遮阳，适合带老人小孩拍照。',
  },

  huxindao: {
    intro:
      '湖心岛在聚秀湖中，有桥或长堤连岸。资料写聚秀湖心有两个小岛，湖心亭、长桥与岸相连，是歇脚、留影的地方。过桥注意防滑，风大时请扶好栏杆。',
    introEn:
      'Mid-Lake Island sits in Juxiu Lake, linked to shore by a bridge or causeway. Records mention two small islands, with a pavilion and a long bridge. It is a place to rest and take photos. Watch your step on the bridge. Hold the rail if it is windy.',
    voice: '湖心岛在聚秀湖中，过桥去亭子里休息、拍照。',
  },
  shulin: {
    intro:
      '疏林草地在东岸偏南，树不密，草坡较开敞，适合坐下来远看湖面。南区还有风筝场、草坪旷野的功能。放风筝、野餐请遵守园规，不要占用消防通道。',
    introEn:
      'The Open Lawn is on the southeast shore. Trees are spaced out and the grass is open, good for sitting and looking at the lake. The south area has also been used for kites and picnics. Please follow park rules and keep fire lanes clear.',
    voice: '疏林草地比较开阔，适合坐下远看湖面。',
  },
  baihua: {
    intro:
      '百花园在聚秀湖东岸，是南区首期就有的景点。花木品种多，双亭与湖面遥相呼应，果合岗长廊作衬。一年四季都有不同花开，是南门进来最值得慢慢逛的园中园。',
    introEn:
      'The Hundred-Flower Garden is on the east shore of Juxiu Lake, a stop from the first phase of the south area. There are many kinds of flowers, with twin pavilions facing the water. Something is in bloom in every season. It is one of the best slow walks after you enter the South Gate.',
    voice: '百花园在聚秀湖东岸，花多，是南门最值得慢慢逛的地方。',
  },
  fengyu: {
    intro:
      '风雨亭在百花园、聚秀湖附近，是典型的避雨歇脚亭。山上湖边都有这类亭子和石凳。下雨、暴晒时请就近进亭，不要在大树下躲雷雨。',
    introEn:
      'The Rain Pavilion is near the Hundred-Flower Garden and Juxiu Lake, a typical shelter for rest. There are pavilions and stone benches on the hills and by the lakes. If it rains or the sun is strong, step into the nearest pavilion. Do not shelter under a tall tree in a thunderstorm.',
    voice: '风雨亭用来避雨歇脚，晒得厉害也可以进来坐。',
  },
  zhushan: {
    intro:
      '竹山湖是园内四个人工湖之一，岸边多竹与相思。2000年前后建过竹山相思亭及连廊。湖面比聚秀湖小，环境更静，适合不想走大湖人潮的游客。',
    introEn:
      'Zhushan Lake is one of the four man-made lakes. Bamboo and acacia grow along the shore. A pavilion and corridor were built around the year 2000. The lake is smaller and quieter than Juxiu Lake, good if you want to avoid the crowds.',
    voice: '竹山湖比较安静，岸边竹子多，人比大湖少。',
  },
  'fengyu-lang': {
    intro:
      '风雨长廊沿着南区湖岸或坡地延伸，能边走边躲太阳。南区湖光花木区很重视廊、亭、桥的搭配。老人走长廊比走完全裸晒的堤坝舒服，也方便中途停下。',
    introEn:
      'The Covered Walkway follows the south lakeshore or hillside, so you can walk in shade. The south gardens pair corridors, pavilions, and bridges. For older visitors it is more comfortable than an open dam, and easy to stop along the way.',
    voice: '风雨长廊能边走边遮阳，比走大堤晒得少。',
  },
  juxiu: {
    intro:
      '聚秀湖是园内最大的人工湖，水面约300亩。湖边有半岛观景平台、饮绿居和游艇码头，湖心有岛和亭，长桥连岸。东岸是百花园。1999年公园就是以这里为中心开门迎客的。',
    introEn:
      'Juxiu Lake is the largest man-made lake in the park, about 300 mu of water. There is a peninsula lookout, a boat dock, and islands with a pavilion linked by a long bridge. The Hundred-Flower Garden is on the east shore. The park first opened around this lake in 1999.',
    voice: '聚秀湖是园里最大的湖，可以看水、走桥、去湖心亭。',
  },
  'zijing-south': {
    intro:
      '南区这片紫荆花景观靠近聚秀湖和采摘乐园，春天同样是满树粉花。园内宫粉紫荆种植量很大。从南门进来不用走很远就能看到，适合不想上山的游客。',
    introEn:
      'This south bauhinia grove is near Juxiu Lake and the Picking Garden. In spring the trees are full of pink flowers. Many bauhinia were planted in the park. You can see them without walking far from the South Gate, good if you do not want to climb.',
    voice: '南区紫荆花离南门不远，春天开得很满。',
  },
  miaopu: {
    intro:
      '苗圃基地为公园培育花木，也是了解树木怎么养成的地方。园内大面积种植过玉堂春、紫荆、杜鹃、紫薇。一般只参观外围，请勿进入作业区，以免影响苗木。',
    introEn:
      'The Nursery grows plants for the park, and shows how trees are raised. Magnolia, bauhinia, azalea, and crape myrtle have been planted in large numbers. Please look from the outside. Do not enter the work area, so the young plants are not disturbed.',
    voice: '苗圃基地培育花木，请在外围看，不要走进作业区。',
  },
  caizhai: {
    intro:
      '采摘乐园在南区田园生态观光范围，规划为农事体验和时令果蔬。是否开放、能否入园采摘要看出告示和季节。没开放时，周围仍是田园和湖景，可以路过看看。',
    introEn:
      'The Picking Garden is in the south farm-tour area, planned for seasonal fruit and farm activities. Whether you can pick depends on the season and the posted notice. If it is closed, the fields and lakes around it are still worth a look as you pass.',
    voice: '采摘乐园按季节开放，去之前先看现场告示。',
  },
  juxiutai: {
    intro:
      '聚秀台是聚秀湖东侧的观景高台，视野比岸边更开。南区还有半岛观景台等类似节点。上台阶不多，却能把湖面和百花园收入眼底，适合拍照后马上走下来休息。',
    introEn:
      'Juxiu Terrace is a lookout on the east side of Juxiu Lake. The view is more open than from the shore. There are only a few steps, but you can see the lake and the Hundred-Flower Garden. Take a photo, then come down to rest.',
    voice: '聚秀台能看聚秀湖全景，上台阶不多。',
  },
  pipa: {
    intro:
      '琵琶岛因形状或位置得名，是南区湖中或湖汊里的小岛。聚秀湖一带本就有湖心小岛和长桥。能否上岛看出入口管理，不能上岛也可以在岸边看倒影。',
    introEn:
      'Pipa Island is named for its shape or place, a small island in the south lakes. Juxiu Lake already has mid-lake islands and a long bridge. Whether you can go onto the island depends on the entrance. If not, you can still watch the reflection from the shore.',
    voice: '琵琶岛是湖中小岛，能不能上去看出入口管理。',
  },
  guanyu: {
    intro:
      '观鱼平台贴近水面，能看锦鲤或野杂鱼。湖区常有人投喂，请按园方规定，不要用面包渣污染水体。平台湿滑，请扶栏杆，不要让小孩趴得太低。',
    introEn:
      'The Fish-Viewing Deck is close to the water, where you may see carp or other fish. People often feed them. Please follow park rules. Do not throw bread into the lake. The deck can be slippery. Hold the rail, and do not let children lean too low.',
    voice: '观鱼平台能看鱼，地面湿，请扶好栏杆。',
  },
  huating: {
    intro:
      '划艇基地在南区湖湾，对应航模码头、游船一类水上活动。公园可游船、骑行。是否出租船只、是否允许下水以现场为准。只想看船的游客站在岸上就够了。',
    introEn:
      'The Boat Base is in a south lake bay, for boats and similar water activities. You can boat or cycle in the park. Rentals and going on the water depend on the day. If you only want to watch boats, standing on the shore is enough.',
    voice: '划艇基地是水上活动点，租不租船要看当天。',
  },
  'fengshan-chaxuan': {
    intro:
      '凤山茶轩是红山景区的小筑，灰瓦斜顶，建在凤山湖中，四面环水，有小拱桥和石板路连岸。资料写它像庭园，适合喝茶、看湖。桥面可能滑，老人过桥请慢慢走。',
    introEn:
      'Fengshan Tea House is a small building in the Hongshan area. It sits in Fengshan Lake, with water on all sides, linked by a little arch bridge and stone path. It is a garden-like place for tea and lake views. The bridge can be slippery. Please cross slowly.',
    voice: '凤山茶轩建在湖中，过小桥去喝茶、看水。',
  },
  'youtian-south': {
    intro:
      '南区游艇码头服务聚秀湖、凤山湖一带，是南门进来最方便的水上出发点。湖边还规划了饮绿居。周末人多，排队时注意遮阳；老人可先在码头栏杆边看别人下船。',
    introEn:
      'The south boat dock serves Juxiu Lake and Fengshan Lake. It is the easiest water starting point after the South Gate. Weekends are busy. Please stay in the shade if you wait in line. Older visitors can watch from the rail while others board.',
    voice: '南区游艇码头在聚秀湖边，周末人会比较多。',
  },
  huxin: {
    intro:
      '湖心亭在聚秀湖岛上，有长桥相连，是园志点名的景点，常和印月桥一起被提起。亭里能吹到湖风，也是最常见的留影点。桥不宽，对向行人请侧身慢行。',
    introEn:
      'The Mid-Lake Pavilion stands on an island in Juxiu Lake, linked by a long bridge. It is a named scenic spot, often mentioned with the Moon Bridge. You can feel the lake breeze inside. It is a popular photo point. The bridge is not wide. Please step aside for people coming the other way.',
    voice: '湖心亭在湖心岛上，过桥去亭里吹风、拍照。',
  },
  fengshan: {
    intro:
      '凤山湖是南区人工湖，和聚秀湖一起构成首期开放的湖光花木区。湖中有凤山茶轩，岸边接管理区和迎宾园。水面比聚秀湖小，散步一圈更轻松。',
    introEn:
      'Fengshan Lake is a south-area lake. Together with Juxiu Lake it formed the first gardens to open. Fengshan Tea House sits in the water. The shore leads to the park office and Welcome Garden. The lake is smaller than Juxiu Lake, so a loop is easier.',
    voice: '凤山湖在南门里边，绕一圈比聚秀湖轻松。',
  },
  fengshanguan: {
    intro:
      '凤山馆在凤山湖与南门管理区之间，是园区配套建筑，常作展示、集合或服务用。红山景区有一组休闲建筑。具体是否对游客开放、里面有什么展览，请看当天门口说明。',
    introEn:
      'Fengshan Hall sits between Fengshan Lake and the South Gate office area. It is a park building used for displays, meetups, or services. Whether it is open to visitors, and what is on show, is posted at the door that day.',
    voice: '凤山馆是园区配套建筑，开不开放看出门口说明。',
  },
  guanli: {
    intro:
      '公园管理处是大夫山森林公园的管理机构所在。2024年挂牌为番禺区大夫山森林公园管理中心，同时加挂自然保护地管理中心。走失、投诉、问询可到这里或拨打公示电话。',
    introEn:
      'The Park Office is the management center of Dafushan Forest Park. In 2024 it was listed as the Panyu Dafushan Forest Park Management Center, also covering the nature reserve. If someone is lost, or you need help or to make a complaint, come here or call the posted phone number.',
    voice: '公园管理处可以问询、求助，走丢了也可以来这里。',
  },
  yingbin: {
    intro:
      '迎宾园在南门入口内侧，和入口标志、广场连在一起，是进园第一眼的绿化庭园。南门主入口人流最大。从这里往北很快就到凤山湖、聚秀湖，路平，适合老人。',
    introEn:
      'Welcome Garden is just inside the South Gate, next to the entrance sign and plaza. It is the first garden you see. The South Gate is the busiest entrance. From here it is a short, flat walk north to Fengshan Lake and Juxiu Lake, good for older visitors.',
    voice: '迎宾园就在南门里边，进园第一眼就能看到。',
    photo: 'images/welcome-hero.jpg',
  },
  'nanmen-guangchang': {
    intro:
      '南门入口广场是集散和停车、坐车的地方。园外停车场约450个车位，多路公交可到。周末早上人多，建议早点到。广场平整，也是等人、集合的常用地点。',
    introEn:
      'South Gate Plaza is for gathering, parking, and buses. There are about 450 parking spaces outside, and several bus routes. Weekend mornings are busy, so please arrive early. The plaza is level, a common place to wait for others.',
    voice: '南门入口广场用来集合、坐车，周末人会比较多。',
    photo: 'images/welcome-hero.jpg',
  },
}

export function facilityIntro(name, type) {
  if (type === 'toilet') {
    return `${name}。园内主要活动区都配了公厕，部分靠近出入口的还规划了无障碍设施。请按标识进出，地面潮湿时扶好。具体开放、是否有人值守以现场为准。`
  }
  if (type === 'food') {
    return `${name}。南门、北门和部分湖区、花园附近规划了餐饮点，方便走累了吃饭喝水。营业时间和菜品以当天档口为准，也可自带水和点心。`
  }
  return `${name}。请按现场标识使用。`
}

export function facilityIntroEn(name, type) {
  if (type === 'toilet') {
    return `${name}. Public toilets are located throughout the main visitor areas. Some near the gates are planned to be accessible. Please follow the signs. Watch your step if the floor is wet. Opening hours and staffing may vary.`
  }
  if (type === 'food') {
    return `${name}. Snack spots are planned near the South Gate, North Gate, and some lakes and gardens. Hours and menus depend on the stall that day. You may also bring your own water and snacks.`
  }
  return `${name}. Please follow the signs on site.`
}

export function facilityVoice(name, type) {
  if (type === 'toilet') return `这里是${name}，请按标识使用，地面潮湿请扶好。`
  if (type === 'food') return `这里是${name}，开不开门、卖什么以当天为准。`
  return `这里是${name}。`
}
