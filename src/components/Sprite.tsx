import type { CSSProperties } from "react";
import { sprites, type SpriteName } from "../assets/sprites/manifest";

type SpriteProps = {
  name: SpriteName;
  /** Leave empty for decorative art so screen readers skip it. */
  alt?: string;
  /** Fixed pixel scale. By default the sprite follows the responsive --px scale. */
  pixel?: number;
  className?: string;
};

export function Sprite({ name, alt = "", pixel, className = "" }: SpriteProps) {
  const { src, width, height } = sprites[name];
  const style = {
    "--sprite-w": width,
    "--sprite-h": height,
    ...(pixel ? { "--px": `${pixel}px` } : {}),
  } as CSSProperties;
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      draggable={false}
      className={`sprite ${className}`}
      style={style}
    />
  );
}

/** Two stacked frames that CSS swaps between: "blink" or "steam". */
export function AnimatedSprite({
  frames,
  motion,
  alt = "",
  className = "",
}: {
  frames: [SpriteName, SpriteName];
  motion: "blink" | "steam";
  alt?: string;
  className?: string;
}) {
  return (
    <span className={`anim anim-${motion} ${className}`}>
      <Sprite name={frames[0]} alt={alt} />
      <Sprite name={frames[1]} />
    </span>
  );
}
