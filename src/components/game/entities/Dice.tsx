import { easeBounceOut, easeQuadOut } from "d3-ease";
import delay from "delay";
import { observer } from "mobx-react";
import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSpring } from "react-spring/three";
import { Dom } from "react-three-fiber";
import {
  Color,
  CylinderBufferGeometry,
  Quaternion,
  Texture,
  Vector3
} from "three";
import Dice, { DiceType } from "../../../models/game/Dice";
import { useStore } from "../../../stores/RootStore";
import { ContextMenuItem } from "../../../types";
import {
  DiceD10,
  DiceD12,
  DiceD20,
  DiceD4,
  DiceD6,
  DiceD8
} from "./DiceHelper";
import Entity, { EntityProps } from "./Entity";

export type DiceProps = Omit<EntityProps, "geometry"> & {};
const size = 0.1;

enum RollPhase {
  None,
  Rising,
  Falling,
  ShowValue
}

export default observer((props: DiceProps) => {
  const { t } = useTranslation();
  const { assetCache } = useStore();
  const { entity } = props;
  const dice = entity as Dice;
  const { ownerSet, color, diceType, value, labels, rolling } = dice;
  const [rollPhase, setRollPhase] = useState(RollPhase.None);

  const contextMenuItems: ContextMenuItem[] = [];

  contextMenuItems.push({
    label: t("contextMenu.roll"),
    type: "action",
    action: () => !rolling && dice.roll()
  });

  const handleRoll = async () => {
    if (rolling) {
      setRollPhase(RollPhase.Rising);
      await delay(250);
      setRollPhase(RollPhase.Falling);
      await delay(750);
      setRollPhase(RollPhase.None);
    }
  };

  useEffect(() => {
    handleRoll();
  }, [rolling]);

  const diceData = useMemo(() => {
    let die: any;
    let pivot: [number, number, number] = [0, -0.05, 0];
    if (diceType === DiceType.Coin) {
      const d6 = new DiceD6({ labels });
      const flipped = new Quaternion();
      flipped.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
      die = {
        geometry: new CylinderBufferGeometry(0.2, 0.2, 0.05, 30),
        textures: [d6.textures[0], d6.textures[2], d6.textures[3]],
        faceRotations: [new Quaternion(), flipped],
        labelIndices: [1, 0]
      };
      pivot = [0, -0.05 / 2, 0];
    } else if (diceType === DiceType.D4) {
      die = new DiceD4({ labels });
      pivot = [0, -0.04, 0];
    } else if (diceType === DiceType.D6) die = new DiceD6({ labels });
    else if (diceType === DiceType.D8) die = new DiceD8({ labels });
    else if (diceType === DiceType.D10) {
      die = new DiceD10({ labels });
      pivot = [0, -0.061, 0];
    } else if (diceType === DiceType.D12) {
      die = new DiceD12({ labels });
      pivot = [0, -0.072, 0];
    } else {
      die = new DiceD20({ labels });
      pivot = [0, -0.08, 0];
    }

    return {
      geometry: die.geometry,
      textures: die.textures,
      faceRotations: die.faceRotations as Quaternion[],
      sideLabels: die.labelIndices.map((i: number) => labels[i]),
      pivot
    };
  }, [diceType, JSON.stringify(labels)]);

  const animation = useSpring({
    to: {
      position: [0, rollPhase === RollPhase.Rising ? 1.5 : 0, 0] as any
    },
    config:
      rollPhase === RollPhase.Rising
        ? { duration: 250, easing: easeQuadOut }
        : { duration: 750, easing: easeBounceOut }
  });

  return (
    <Entity
      {...props}
      pivot={diceData.pivot}
      geometry={<primitive object={diceData.geometry} attach="geometry" />}
      materialParams={diceData.textures.map((texture: Texture) => ({
        map: texture,
        roughness: 0.1,
        flatShading: true,
        color: new Color(color.r, color.g, color.b)
      }))}
      contextMenuItems={contextMenuItems}
      rotationOffset={diceData.faceRotations[value]}
      positionOffset={animation.position}
      doubleClickAction={() => !rolling && dice.roll()}
      // hoverMessage={diceData.sideLabels[value]}
    >
      <Dom
        position={[0, 0.5, 0]}
        center
        style={{ pointerEvents: "none", userSelect: "none" }}
        onContextMenu={() => false}
      >
        <h1
          style={{
            pointerEvents: "none",
            userSelect: "none",
            textShadow: "0px 0px 4px black"
          }}
          onContextMenu={() => false}
        >
          {diceData.sideLabels[value]}
        </h1>
      </Dom>
    </Entity>
  );
});
