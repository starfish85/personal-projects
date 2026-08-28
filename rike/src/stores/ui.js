import { reactive } from 'vue'

export const ui = reactive({
  toast: '',
  confirm: null,
})

let toastTimer = 0

export function toast(message) {
  ui.toast = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (ui.toast === message) ui.toast = ''
  }, 2400)
}

export function clearToast() {
  ui.toast = ''
  window.clearTimeout(toastTimer)
}

export function confirmDialog({ title, copy, ok = '确定', danger = false }) {
  return new Promise((resolve) => {
    ui.confirm = {
      title,
      copy,
      ok,
      danger,
      settle(value) {
        ui.confirm = null
        resolve(value)
      },
    }
  })
}
