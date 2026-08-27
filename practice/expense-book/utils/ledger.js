// 对应伪代码：账本 = []
const 账本 = [];

// 对应伪代码：关键字表 = { 衣, 食, 住, 行 }
const 关键字表 = {
  衣: ["衣服", "鞋子", "裤子", "优衣库"],
  食: ["午饭", "晚饭", "早餐", "外卖", "美团", "肯德基", "麦当劳", "瑞幸", "餐厅"],
  住: ["房租", "水电", "燃气", "物业"],
  行: ["滴滴", "地铁", "公交", "打车", "加油", "高铁"],
};

const 分类顺序 = ["衣", "食", "住", "行"];

function 分类(备注) {
  const 文本 = String(备注 ?? "");
  for (const 分类名 of 分类顺序) {
    for (const 关键字 of 关键字表[分类名]) {
      if (关键字.includes(文本)) {
        return 分类名;
      }
    }
  }
  return "其他";
}

function 记账(金额, 备注) {
  const 分类结果 = 分类(备注);
  const 记录 = {
    金额: Number(金额),
    备注: String(备注 ?? "").trim(),
    分类结果,
  };
  账本.push(记录);
  return 记录;
}

function 统计() {
  const 总额 = { 衣: 0, 食: 0, 住: 0, 行: 0, 其他: 0 };
  for (const 条 of 账本) {
    总额[条.分类结果] += 条.金额;
  }
  return 总额;
}

function 记一笔(金额, 备注) {
  记账(金额, 备注);
  return 统计();
}

function 清空账本() {
  账本.length = 0;
}

const api = {
  账本,
  关键字表,
  分类,
  记账,
  统计,
  记一笔,
  清空账本,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  Object.assign(window, api);
}
