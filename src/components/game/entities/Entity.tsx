import { observer } from "mobx-react";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { PointerEvent } from "react-three-fiber";
import {
  Box3,
  BufferGeometry,
  Color,
  Mesh,
  MeshStandardMaterialParameters,
  Plane,
  Vector3
} from "three";
import Entity from "../../../models/game/Entity";
import { useStore } from "../../../stores/RootStore";
import { ContextMenuItem } from "../../../types";
import Material from "../Material";

export type MaterialParameters = MeshStandardMaterialParameters & {
  textureUrl?: string;
};

export type EntityProps = {
  entity: Entity;
  onContextMenu: (e: PointerEvent, contextMenuItems: ContextMenuItem[]) => void;
  contextMenuItems?: ContextMenuItem[];
  pivot?: [number, number, number];
  flipped?: boolean;
  geometry: React.ReactElement<BufferGeometry>;
  materialParams?: MaterialParameters[];
};

export default observer((props: EntityProps) => {
  const { gameStore, uiState } = useStore();
  const { gameState } = gameStore;

  const {
    entity,
    geometry,
    materialParams = [{}],
    pivot = [0, 0, 0],
    flipped = false,
    onContextMenu
  } = props;
  const { position, angle, scale, color, locked } = entity;

  const [hovered, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);

  const standardItems: ContextMenuItem[] = [
    {
      label: "Rotate clockwise",
      type: "action",
      action: () => entity.rotate(Math.PI / 2)
    },
    {
      label: "Rotate counter-clockwise",
      type: "action",
      action: () => entity.rotate(-Math.PI / 2)
    },
    {
      label: "Edit",
      type: "edit",
      target: entity,
      action: () => {}
    },
    {
      label: "Delete",
      type: "action",
      action: () => gameState.removeEntity(entity)
    },
    {
      label: locked ? "Unlock" : "Lock",
      type: "action",
      action: () => entity.toggleLocked()
    }
  ];

  const contextMenuItems = props.contextMenuItems
    ? [...props.contextMenuItems, ...standardItems]
    : standardItems;

  const handlePointerDown = (e: any) => {
    if (e.button === 0) {
      if (!locked) {
        e.stopPropagation();
        uiState.setDraggingEntity(entity);
        setDragging(true);
      }
    }
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: any) => {
    if (e.button === 0) {
      uiState.setDraggingEntity(null);
      e.target.releasePointerCapture(e.pointerId);
      setDragging(false);
    } else if (e.button === 2) {
      onContextMenu(e, contextMenuItems);
      e.stopPropagation();
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (dragging) {
      let point = new Vector3();
      e.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), point);
      entity.position = [point.x, point.z];
    }
  };

  const handlePointerHoverOver = (e: PointerEvent) => {
    setHover(true);
    e.stopPropagation();
  };

  const handlePointerHoverOut = (e: PointerEvent) => {
    setHover(false);
    e.stopPropagation();
  };

  const mesh = useRef<Mesh>();

  useEffect(() => {
    if (mesh.current) {
      entity.boundingBox.setFromObject(mesh.current);
      entity.boundingBox.min.y = 0;
    }
  }, [mesh, position]);

  const minHeight = useMemo(() => {
    let minHeight = 0;
    if (entity.boundingBox) {
      for (const otherEntity of gameState.entities) {
        if (otherEntity !== entity && otherEntity.boundingBox) {
          const collision = entity.boundingBox.intersectsBox(
            otherEntity.boundingBox
          );
          if (collision && otherEntity.boundingBox.max.y > minHeight) {
            minHeight = otherEntity.boundingBox.max.y;
          }
        }
      }
    }

    return minHeight;
  }, [position[0], position[1]]);

  return (
    <group
      position={[position[0], minHeight, position[1]]}
      rotation={[0, angle, 0]}
      scale={[scale, scale, scale]}
    >
      <mesh
        ref={mesh}
        position={[-pivot[0], -pivot[1], -pivot[2]]}
        rotation={[flipped ? Math.PI : 0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerHoverOver}
        onPointerOut={handlePointerHoverOut}
      >
        {geometry}
        {materialParams.map((params, i) => {
          const updatedParams: MaterialParameters = {
            ...params,
            color: new Color(color[0], color[1], color[2]),
            transparent: true,
            opacity: hovered ? 0.7 : 1
          };

          const material = <Material key={i} {...updatedParams} />;

          return material;
        })}
      </mesh>
    </group>
  );
});