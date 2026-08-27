const { 账本, 记一笔, 统计, 清空账本 } = require("../../utils/ledger.js");

const STORAGE_KEY = "expense-book-ledger";

function formatMoney(n) {
  return Number(n).toFixed(2);
}

Page({
  data: {
    amount: "",
    note: "",
    hint: "",
    hintError: false,
    totals: { 衣: "0.00", 食: "0.00", 住: "0.00", 行: "0.00", 其他: "0.00" },
    records: [],
  },

  onLoad() {
    this.loadLedger();
    this.refresh();
  },

  loadLedger() {
    清空账本();
    try {
      const saved = wx.getStorageSync(STORAGE_KEY);
      if (Array.isArray(saved) && saved.length) {
        账本.push(...saved);
      }
    } catch (err) {
      console.warn("读取本地账本失败", err);
    }
  },

  saveLedger() {
    wx.setStorageSync(STORAGE_KEY, 账本);
  },

  refresh(totals) {
    const data = totals || 统计();
    this.setData({
      totals: {
        衣: formatMoney(data.衣),
        食: formatMoney(data.食),
        住: formatMoney(data.住),
        行: formatMoney(data.行),
        其他: formatMoney(data.其他),
      },
      records: 账本
        .slice()
        .reverse()
        .map((item) => ({
          金额: item.金额,
          备注: item.备注,
          分类结果: item.分类结果,
          金额显示: formatMoney(item.金额),
        })),
    });
  },

  onAmount(event) {
    this.setData({ amount: event.detail.value });
  },

  onNote(event) {
    this.setData({ note: event.detail.value });
  },

  onSubmit() {
    const amount = Number(this.data.amount);
    const note = String(this.data.note || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      this.setData({ hint: "请输入大于 0 的金额", hintError: true });
      return;
    }
    if (!note) {
      this.setData({ hint: "请输入备注", hintError: true });
      return;
    }

    const totals = 记一笔(amount, note);
    this.saveLedger();
    const last = 账本[账本.length - 1];
    this.setData({
      amount: "",
      note: "",
      hint: "已记入「" + last.分类结果 + "」",
      hintError: false,
    });
    this.refresh(totals);
  },
});
