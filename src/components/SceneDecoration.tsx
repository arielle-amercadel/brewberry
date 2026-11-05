import { decorations, type DecorationId } from "../data/decorations";
import { Sprite } from "./Sprite";

/**
 * An equipped decoration, placed and sized by the scene around it, which also
 * decides through `className` where it is too narrow to show. Nothing if not
 * equipped.
 */
export function SceneDecoration({
  id,
  equipped,
  className = "",
}: {
  id: DecorationId;
  equipped: DecorationId[];
  className?: string;
}) {
  if (!equipped.includes(id)) return null;
  const { name, sprite } = decorations[id];
  // The bunting is a repeating strip across the whole scene, not one sprite.
  if (id === "bunting") {
    return <div role="img" aria-label={name} className="scene-bunting" />;
  }
  return (
    <Sprite
      name={sprite}
      alt={name}
      className={className}
    />
  );
}
