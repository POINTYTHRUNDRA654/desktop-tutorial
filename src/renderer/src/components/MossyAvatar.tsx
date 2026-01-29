import React, { useMemo, useState } from 'react';
import { mossyAvatarUrl, mossyAvatarFallbackUrl } from '../assets/avatar';

/**
 * MossyAvatar
 *
 * Simple reusable avatar component for Mossy.
 * - Uses the app's bundled default avatar (works in Vite dev + packaged Electron)
 * - Can be sized with the `size` prop (default 160px)
 * - Renders as a circle by default so it feels like an AI assistant avatar
 */

export interface MossyAvatarProps {
  /** Size in pixels (width = height). Default: 160 */
  size?: number;
  /** Optional extra CSS classes (Tailwind or regular CSS) */
  className?: string;
  /** If true, renders as a rounded rectangle instead of a circle */
  roundedRect?: boolean;
  /** Optional override for the image src (e.g., a data URL or external URL). */
  src?: string | null;
}

const MossyAvatar: React.FC<MossyAvatarProps> = ({
  size = 160,
  className = '',
  roundedRect = false,
  src = null,
}) => {
  const borderRadius = roundedRect ? '24px' : '9999px';
  const initialSrc = useMemo(() => src || mossyAvatarUrl, [src]);
  const [imageSrc, setImageSrc] = useState(initialSrc);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
        border: '2px solid rgba(255, 255, 255, 0.25)',
        background:
          'radial-gradient(circle at 20% 0%, #ffb347 0, transparent 55%), radial-gradient(circle at 80% 100%, #ff4e50 0, transparent 55%), #020617',
      }}
      className={className}
    >
      <img
        src={imageSrc}
        alt="Mossy – Fallout 4 Modding Assistant"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transform: 'scale(1.08)',
          transformOrigin: 'center',
        }}
        draggable={false}
        onError={() => {
          if (imageSrc !== mossyAvatarUrl) {
            setImageSrc(mossyAvatarUrl);
            return;
          }
          if (imageSrc !== mossyAvatarFallbackUrl) setImageSrc(mossyAvatarFallbackUrl);
        }}
      />
    </div>
  );
};

export default MossyAvatar;
