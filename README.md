# annekedisi blog

Статический сайт-блог, который превращает посты публичного Telegram-канала [@annekedisi](https://t.me/annekedisi) в красивую ленту с детальными страницами постов.

Production: <https://annekedisi.pinkcrab.ru>

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
  server-setup.sh         one-time bootstrap сервера
.github/workflows/
  deploy.yml              CI: fetch + build + rsync на сервер
```

## Деплой

Сайт — статика. Деплой = `rsync out/ → /var/www/annekedisi.pinkcrab.ru/`.

### Первичная настройка сервера (72.56.12.105)

1. Прописать DNS: `annekedisi.pinkcrab.ru A 72.56.12.105`
2. На сервере выполнить `deploy/server-setup.sh` (ставит nginx, создаёт пользователя `annekedisi` и web-root)
3. Получить TLS: `certbot --nginx -d annekedisi.pinkcrab.ru`

### Автодеплой через GitHub Actions

В репозитории `Settings → Secrets → Actions` нужно завести:

| Secret           | Значение                              |
| ---------------- | ------------------------------------- |
| `DEPLOY_HOST`    | `72.56.12.105`                        |
| `DEPLOY_USER`    | `annekedisi` (или другой)             |
| `DEPLOY_PATH`    | `/var/www/annekedisi.pinkcrab.ru`     |
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
rsync -avz --delete ./out/ annekedisi@72.56.12.105:/var/www/annekedisi.pinkcrab.ru/
```
