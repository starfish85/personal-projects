import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function wallClock(tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hm: `${parts.hour}:${parts.minute}`,
  }
}

function weekdayOf(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number)
  const sun = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  return sun === 0 ? 7 : sun
}

function taskOnDate(task, date) {
  if (!task || task.archived || task.paused) return false
  if (task.longTerm) {
    const weekdays = Array.isArray(task.repeatWeekdays) ? task.repeatWeekdays : []
    if (!weekdays.length) return true
    return weekdays.includes(weekdayOf(date))
  }
  return (task.dueDate || date) === date
}

function dayComplete(task, record) {
  if (!task) return false
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  if (subtasks.length) {
    const doneMap = record?.subtasks || {}
    return subtasks.every((item) => doneMap[item.id])
  }
  if (!record) return false
  if (task.completion === 'photo-log') return (record.count || 0) > 0
  if (task.completion === 'check') return Boolean(record.completed_at) || (record.count || 0) > 0
  if (record.completed_at) return true
  const target = record.target || task.target || 0
  return target > 0 && (record.count || 0) >= target
}

function admin() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('missing supabase env')
  return createClient(url, key)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: cors })
  }

  const cronSecret = Deno.env.get('CRON_SECRET') || ''
  const given = req.headers.get('x-cron-secret') || ''
  const isCron = Boolean(cronSecret) && given === cronSecret

  const client = admin()
  let onlyUser = ''
  if (!isCron) {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors })
    const { data, error } = await client.auth.getUser(jwt)
    if (error || !data?.user) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors })
    }
    onlyUser = data.user.id
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:rike@localhost'
  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ error: 'vapid not configured', sent: 0 }, { status: 200, headers: cors })
  }

  let subQuery = client.from('rike_push_subs').select('*')
  if (onlyUser) subQuery = subQuery.eq('user_id', onlyUser)
  const { data: subs, error: subErr } = await subQuery
  if (subErr) return Response.json({ error: subErr.message }, { status: 500, headers: cors })

  const byUser = new Map()
  for (const row of subs || []) {
    const list = byUser.get(row.user_id) || []
    list.push(row)
    byUser.set(row.user_id, list)
  }

  let sent = 0
  const vapid = { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate }

  for (const [userId, userSubs] of byUser) {
    const tz = userSubs[0]?.tz || 'Asia/Shanghai'
    const { date, hm } = wallClock(tz)
    const [{ data: meta }, { data: days }, { data: already }] = await Promise.all([
      client.from('rike_meta').select('tasks').eq('user_id', userId).maybeSingle(),
      client.from('rike_days').select('*').eq('user_id', userId).eq('date', date),
      client.from('rike_remind_sent').select('task_id').eq('user_id', userId).eq('date', date),
    ])
    const sentSet = new Set((already || []).map((row) => row.task_id))
    const dayMap = new Map((days || []).map((row) => [row.task_id, row]))
    const tasks = Array.isArray(meta?.tasks) ? meta.tasks : []

    for (const task of tasks) {
      if (!task?.reminder || !taskOnDate(task, date)) continue
      if (hm < task.reminder) continue
      if (sentSet.has(task.id)) continue
      if (dayComplete(task, dayMap.get(task.id))) continue

      const payload = JSON.stringify({
        title: task.title || '日课',
        body: '到点了',
        tag: `rike-${task.id}`,
        url: `./#/task/${task.id}`,
      })

      let delivered = false
      for (const sub of userSubs) {
        try {
          const request = await buildPushPayload(
            { data: payload, options: { ttl: 3600 } },
            {
              endpoint: sub.endpoint,
              expirationTime: null,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            vapid,
          )
          const res = await fetch(sub.endpoint, request)
          if (res.status === 404 || res.status === 410) {
            await client.from('rike_push_subs').delete().eq('endpoint', sub.endpoint)
          } else if (res.ok || res.status === 201) {
            delivered = true
          }
        } catch {
          /* drop one endpoint, try the rest */
        }
      }

      if (delivered) {
        await client.from('rike_remind_sent').upsert({
          user_id: userId,
          task_id: task.id,
          date,
        })
        sent += 1
      }
    }
  }

  return Response.json({ sent }, { headers: { ...cors, 'Content-Type': 'application/json' } })
})
