
interface NutriparkLogoProps {
  size?: 'small' | 'large';
  className?: string;
}

export default function NutriparkLogo({ size = 'large', className = '' }: NutriparkLogoProps) {
  const isLarge = size === 'large';
  const fontSizeClass = isLarge ? 'text-5xl' : 'text-3xl';
  const svgWidth = isLarge ? '32px' : '20px';
  const svgHeight = isLarge ? '30px' : '18px';
  const svgMarginTop = isLarge ? '27px' : '18px'; // Incrementado aún más para bajar la u

  return (
    <div className={`flex flex-row items-start justify-center flex-nowrap ${className}`}>
      <span className={`text-[#FF7700] font-black tracking-normal ${fontSizeClass} mt-1`}>
        n
      </span>
      <div
        className="flex items-center justify-center mx-0.5"
        style={{ width: svgWidth, height: svgHeight, marginTop: svgMarginTop }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 32 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Letra 'u' - curva superior */}
          <path
            d="M 1 0 C 1 23, 31 23, 31 0 L 23 0 C 23 15, 9 15, 9 0 Z"
            fill="#FF7700"
          />
          {/* Sonrisa/cuenco inferior */}
          <path
            d="M 1 20 C 1 31, 31 31, 31 20 Z"
            fill="#FF7700"
          />
        </svg>
      </div>
      <span className={`text-[#FF7700] font-black tracking-widest ${fontSizeClass} mt-1`}>
        tripark
      </span>
    </div>
  );
}
