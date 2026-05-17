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
  post/[id]/page.tsx      детальная страница с JSON-LD Article
  layout.tsx              шапка/подвал, метаданные сайта, JSON-LD Organization/WebSite
  sitemap.ts              авто-sitemap.xml
  robots.ts               авто-robots.txt
components/
  PostMedia.tsx           фото/видео грид (1/2/3/4+ раскладки)
  PostText.tsx            текст поста с линкификацией
  PartnerBlock.tsx        блок партнёрских ссылок под постом
  Cats.tsx                декоративные SVG-коты
lib/
  posts.ts                чтение data/posts.json + утилиты
  site.ts                 чтение data/site.json и data/partner-links.json
scripts/
  fetch-posts.mjs         скрейпер t.me/s/annekedisi
data/
  posts.json              кеш постов (коммитится в репозиторий)
  site.json               SEO/мета настройки сайта (редактируется в /admin/)
  partner-links.json      ссылки партнёров: global + per-post (редактируется в /admin/)
public/
  admin/index.html        Sveltia CMS (загружается с CDN)
  admin/config.yml        схема CMS — какие файлы и поля редактируются
  uploads/                сюда загружаются картинки из админки
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
rsync -avz --delete ./out/ seldegram@72.56.12.105:/var/www/landing/
```

## Админка (Sveltia CMS)

Веб-админка живёт по адресу <https://pinkcrab.ru/admin/>. Она правит файлы
`data/site.json` и `data/partner-links.json` напрямую в GitHub: сохранение
коммитит изменение в `main`, CI пересобирает сайт и раскатывает на сервер.

### Что можно править

- **Сайт → SEO и общие настройки** — заголовок, описание, OG-картинка, canonical, robots, организация (Schema.org).
- **Партнёры → Партнёрские ссылки** — глобальные ссылки (выводятся под каждым постом) и индивидуальные для отдельных постов (например только для поста #731).

### Одноразовая настройка GitHub OAuth App

Sveltia использует PKCE-OAuth от GitHub напрямую, без бэкенда. Нужен только
Client ID OAuth-приложения:

1. Открой <https://github.com/settings/applications/new>
2. **Application name:** `annekedisi CMS`
3. **Homepage URL:** `https://pinkcrab.ru`
4. **Authorization callback URL:** `https://pinkcrab.ru/admin/`
5. Сохранить → скопировать **Client ID** (это публичная строка, секретом не является)
6. Открыть `public/admin/config.yml` и заменить закомментированную строку:
   ```yaml
   # client_id: <paste-here>
   ```
   на:
   ```yaml
   client_id: Iv1.0123456789abcdef
   ```
7. Закоммитить и запушить — после деплоя /admin/ заработает.

### Авторизация

Кнопка «Sign in with GitHub», открывается PKCE-popup, требует доступ к
`repo` для `sereganikitin/annekedisi`. У пользователя должен быть write-доступ
к репо (или быть в команде с доступом). После входа открывается UI с двумя
коллекциями: «Сайт» и «Партнёры».

### Локальные изменения и админка

Если правишь файлы в IDE, обычные `git commit && git push` — конфликтов
с админкой нет, потому что Sveltia не держит локальной копии данных
между сессиями.
