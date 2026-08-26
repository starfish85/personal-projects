-- 部署 Edge Function 并设好 Secrets 之后，把下面的 URL / 密钥换成你的，在 SQL Editor 执行一次。
-- 每分钟叫醒 send-reminders。项目 7 天没人访问仍会暂停（免费档），你每天打开日课就不会停。
--
-- Secrets（Dashboard → Edge Functions → Secrets）：
--   VAPID_PUBLIC_KEY
--   VAPID_PRIVATE_KEY
--   VAPID_SUBJECT          例如 mailto:you@example.com
--   CRON_SECRET            自己编一串长随机字符
--
-- 生成 VAPID：
--   npx web-push generate-vapid-keys

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('rike-send-reminders')
where exists (select 1 from cron.job where jobname = 'rike-send-reminders');

select cron.schedule(
  'rike-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'YOUR_ANON_KEY',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 8000
  );
  $$
);
