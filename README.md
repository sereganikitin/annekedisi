# annekedisi blog

Статический сайт-блог, который превращает посты публичного Telegram-канала [@annekedisi](https://t.me/annekedisi) в красивую ленту с детальными страницами постов.

Production: <https://pinkcrab.ru>

## Стек

- **Next.js 16** (App Router, статический экспорт `output: "export"`)
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- Скрейпер постов на чистом Node + cheerio — никаких токенов и ботов

## Разработка

```bash
npm install
npm run fetch    # подтянуть свежие посты в data/posts.json
npm run dev      # http://localhost:3000
```

Билд + статический экспорт:

```bash
npm run build    # пишет готовый сайт в ./out/
```

### Скрипты

| Команда             | Что делает                                              |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev-сервер Next.js с Turbopack                          |
| `npm run fetch`     | Тянет ~5 страниц истории канала (≈100 постов)           |
| `npm run fetch:deep`| Тянет до 20 страниц (≈400 постов)                       |
| `npm run build`     | Статический экспорт сайта в `out/`                      |

## Структура

```
app/
  page.tsx                лента постов
  post/[id]/page.tsx      детальная страница
  layout.tsx              шапка/подвал/шрифт
components/
  PostMedia.tsx           фото/видео грид (1/2/3/4+ раскладки)
  PostText.tsx            текст поста с линкификацией
lib/
  posts.ts                чтение data/posts.json + утилиты
scripts/
  fetch-posts.mjs         скрейпер t.me/s/annekedisi
data/
  posts.json              кеш постов (коммитится в репозиторий)
deploy/
  nginx.conf.example      пример конфига Nginx
  server-setup.sh         one-time bootstrap сервера (бэкапит старый лендинг)
  backup-old-landing.sh   только бэкап (без бутстрапа)
.github/workflows/
  deploy.yml              CI: fetch + build + rsync на сервер
```

## Деплой

Сайт — статика. Деплой = `rsync out/ → /var/www/pinkcrab.ru/`.

### Первичная настройка сервера (72.56.12.105)

1. DNS `pinkcrab.ru A 72.56.12.105` уже стоит.
2. **Бэкап старого лендинга** (если ещё не сделан):
   ```bash
   ssh root@72.56.12.105 'bash -s' < deploy/backup-old-landing.sh
   scp 'root@72.56.12.105:/var/backups/pinkcrab.ru-old/*.tar.gz' ./
   ```
3. **Бутстрап**: скопировать публичный deploy-ключ и запустить server-setup.sh
   ```bash
   echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF4c+mp26cdGVE7mSOn6ON6v8aEGiMjAn9v5twhteEds annekedisi-github-actions' \
     | ssh root@72.56.12.105 'cat > /tmp/deploy_key.pub'
   scp deploy/server-setup.sh root@72.56.12.105:/tmp/
   ssh root@72.56.12.105 'bash /tmp/server-setup.sh'
   ```
   Скрипт сам архивирует старый лендинг в `/var/backups/pinkcrab.ru-old/`, отключает старые nginx-vhost-ы для `pinkcrab.ru`, ставит новый и кладёт deploy-ключ в `authorized_keys` пользователя `annekedisi`.
4. **TLS-сертификат** (когда сайт уже отдаётся по HTTP):
   ```bash
   ssh root@72.56.12.105 'certbot --nginx -d pinkcrab.ru -d www.pinkcrab.ru'
   ```

### Автодеплой через GitHub Actions

В репозитории `Settings → Secrets → Actions` нужно завести:

| Secret           | Значение                              |
| ---------------- | ------------------------------------- |
| `DEPLOY_HOST`    | `72.56.12.105`                        |
| `DEPLOY_USER`    | `annekedisi` (или другой)             |
| `DEPLOY_PATH`    | `/var/www/pinkcrab.ru`     |
| `DEPLOY_SSH_KEY` | приватный ключ (содержимое `id_ed25519`) |

Публичный ключ нужно положить в `/home/annekedisi/.ssh/authorized_keys` на сервере.

Воркфлоу `.github/workflows/deploy.yml`:
- запускается на каждый `push` в `main`,
- по расписанию каждые 4 часа (обновляет `data/posts.json` и коммитит обратно),
- ручной запуск через `workflow_dispatch`.

### Ручной деплой с локальной машины

```bash
npm run fetch:deep
npm run build
rsync -avz --delete ./out/ annekedisi@72.56.12.105:/var/www/pinkcrab.ru/
```
