"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = ImageProps & { fallbackLabel?: string; fallbackSrc?: string | null };

/** Shows a branded surface when a legacy/CMS image URL is no longer valid. */
export default function SafeImage({ fallbackLabel = "Gelecek Finans", fallbackSrc, alt, ...props }: SafeImageProps) {
  const [failure, setFailure] = useState<{
    src: ImageProps["src"];
    fallbackSrc?: string | null;
    fallbackFailed: boolean;
  } | null>(null);
  const failed = failure !== null && failure.src === props.src && failure.fallbackSrc === fallbackSrc;
  const fallbackFailed = failed && failure !== null && failure.fallbackFailed;

  if (failed) {
    if (fallbackSrc && !fallbackFailed) {
      return (
        <span
          className={`safe-image-fallback-frame${props.fill ? " safe-image-fallback-fill" : ""}`}
          style={props.fill ? undefined : {
            width: props.width,
            height: props.height,
            display: "inline-block",
            flexShrink: 0,
          }}
        >
          <Image
            {...props}
            src={fallbackSrc}
            alt="Temsili finans görseli"
            onError={() => setFailure({ src: props.src, fallbackSrc, fallbackFailed: true })}
          />
          <span className="safe-image-fallback-badge" aria-hidden="true">Temsili görsel</span>
        </span>
      );
    }
    return (
      <div className="image-fallback" role="img" aria-label={alt || fallbackLabel}>
        <span className="image-fallback-mark" aria-hidden="true">GF</span>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return <Image {...props} alt={alt} onError={() => setFailure({ src: props.src, fallbackSrc, fallbackFailed: false })} />;
}
