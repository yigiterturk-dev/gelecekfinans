"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = ImageProps & { fallbackLabel?: string };

/** Shows a branded surface when a legacy/CMS image URL is no longer valid. */
export default function SafeImage({ fallbackLabel = "Gelecek Finans", alt, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="image-fallback" role="img" aria-label={alt || fallbackLabel}>
        <span className="image-fallback-mark" aria-hidden="true">GF</span>
        <span>{fallbackLabel}</span>
      </div>
    );
  }

  return <Image {...props} alt={alt} onError={() => setFailed(true)} />;
}
