import type { ImgHTMLAttributes, SyntheticEvent } from "react";

import { FALLBACK_IMAGE } from "../../utils/imageFiles";

type DestinationImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

// Falls back to a bundled placeholder when the image URL is empty or broken.
const DestinationImage = ({ src, onError, ...props }: DestinationImageProps) => {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;

    if (!image.src.endsWith(FALLBACK_IMAGE)) {
      image.src = FALLBACK_IMAGE;
    }

    onError?.(event);
  };

  return <img src={src || FALLBACK_IMAGE} onError={handleError} {...props} />;
};

export default DestinationImage;
