import { useState } from 'react';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg width="88" height="88" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="#1A1A1A"/>
      <path d="M8 3H16C17.6569 3 19 4.34315 19 6V18C19 19.6569 17.6569 21 16 21H8C6.34315 21 5 19.6569 5 18V6C5 4.34315 6.34315 3 8 3Z" stroke="#3A3A3A" stroke-width="1.5"/>
      <path d="M9 10C9.55228 10 10 9.55228 10 9C10 8.44772 9.55228 8 9 8C8.44772 8 8 8.44772 8 9C8 9.55228 8.44772 10 9 10Z" fill="#3A3A3A"/>
      <path d="M5 15L9 12L13 15L16 13L19 15" stroke="#3A3A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  );

/**
 * Drop-in replacement for <img> that shows a neutral placeholder if the source
 * fails to load. Accepts all standard <img> props.
 */
export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, ...rest } = props;

  if (didError) {
    return (
      <div className={`inline-block bg-[#141414] text-center align-middle ${className ?? ''}`} style={style}>
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Image failed to load" {...rest} data-original-url={src} />
        </div>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={() => setDidError(true)} />
  );
}

export default ImageWithFallback;
