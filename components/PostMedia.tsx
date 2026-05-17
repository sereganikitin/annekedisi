import type { Photo, Video } from "@/lib/posts";

type Props = {
  photos: Photo[];
  videos: Video[];
  compact?: boolean;
};

export function PostMedia({ photos, videos, compact = false }: Props) {
  const hasPhotos = photos.length > 0;
  const hasVideos = videos.length > 0;
  if (!hasPhotos && !hasVideos) return null;

  return (
    <div className="space-y-3">
      {hasPhotos ? <PhotoGrid photos={photos} compact={compact} /> : null}
      {hasVideos ? (
        <div className="space-y-3">
          {videos.map((v, i) => (
            <video
              key={`${v.src}-${i}`}
              src={v.src}
              poster={v.thumb || undefined}
              controls
              preload={compact ? "none" : "metadata"}
              playsInline
              className="w-full rounded-2xl bg-black"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PhotoGrid({ photos, compact }: { photos: Photo[]; compact: boolean }) {
  // Layout rules:
  //  1 photo  → full-width single
  //  2 photos → 2-column
  //  3 photos → first big on top, two below
  //  4+       → 2-column grid, all square cropped
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
    <div className={`overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-900 ${ratio}`}>
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
