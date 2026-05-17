import type { Photo, Video } from "@/lib/posts";

type Props = {
  photos: Photo[];
  videos: Video[];
  postUrl?: string;
  compact?: boolean;
};

export function PostMedia({ photos, videos, postUrl, compact = false }: Props) {
  const hasPhotos = photos.length > 0;
  const hasVideos = videos.length > 0;
  if (!hasPhotos && !hasVideos) return null;

  return (
    <div className="space-y-3">
      {hasPhotos ? <PhotoGrid photos={photos} compact={compact} /> : null}
      {hasVideos ? (
        <div className="space-y-3">
          {videos.map((v, i) =>
            v.src ? (
              <video
                key={`v-${i}`}
                src={v.src}
                poster={v.thumb || undefined}
                controls
                preload={compact ? "none" : "metadata"}
                playsInline
                className="w-full rounded-2xl bg-black"
              />
            ) : (
              <VideoPlaceholder
                key={`vp-${i}`}
                thumb={v.thumb}
                postUrl={postUrl}
                compact={compact}
              />
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

function VideoPlaceholder({
  thumb,
  postUrl,
  compact,
}: {
  thumb: string | null;
  postUrl?: string;
  compact: boolean;
}) {
  const body = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-rose-100/60 dark:bg-rose-950/40 ${
        compact ? "aspect-[16/10]" : "aspect-video"
      }`}
    >
      {thumb ? (
        <>
          {/* Blurred backdrop — same thumb, blown up. The native thumb
              Telegram serves is ~180×320 and stretches awfully when
              cover-fit into a wider card. */}
          <div
            className="absolute inset-0 scale-125 bg-cover bg-center blur-2xl brightness-90 dark:brightness-75"
            style={{ backgroundImage: `url("${thumb}")` }}
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="absolute inset-0 m-auto h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]"
          />
        </>
      ) : null}
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/40 via-black/0 to-black/0">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-rose-700 shadow-lg backdrop-blur-sm transition group-hover:scale-110 dark:bg-rose-950/80 dark:text-rose-100">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 translate-x-[1px]" aria-hidden="true">
            <path d="M8 5v14l11-7-11-7Z" />
          </svg>
        </span>
      </div>
      {!compact ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
          Открыть в Telegram
        </span>
      ) : null}
    </div>
  );

  if (postUrl) {
    return (
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        aria-label="Смотреть видео в Telegram"
      >
        {body}
      </a>
    );
  }
  return <div className="group">{body}</div>;
}

function PhotoGrid({ photos, compact }: { photos: Photo[]; compact: boolean }) {
  const n = photos.length;

  if (n === 1) {
    return (
      <Img
        src={photos[0]}
        ratio={compact ? "aspect-[16/10]" : "aspect-auto max-h-[80vh]"}
        objectFit={compact ? "object-cover" : "object-contain"}
      />
    );
  }
  if (n === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {photos.map((p) => (
          <Img key={p} src={p} ratio="aspect-square" />
        ))}
      </div>
    );
  }
  if (n === 3) {
    return (
      <div className="space-y-1.5">
        <Img src={photos[0]} ratio="aspect-[16/10]" />
        <div className="grid grid-cols-2 gap-1.5">
          <Img src={photos[1]} ratio="aspect-square" />
          <Img src={photos[2]} ratio="aspect-square" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {photos.map((p) => (
        <Img key={p} src={p} ratio="aspect-square" />
      ))}
    </div>
  );
}

function Img({
  src,
  ratio,
  objectFit = "object-cover",
}: {
  src: string;
  ratio: string;
  objectFit?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-rose-100/60 dark:bg-rose-950/40 ${ratio}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`h-full w-full ${objectFit} transition-transform duration-500 hover:scale-[1.02]`}
      />
    </div>
  );
}
