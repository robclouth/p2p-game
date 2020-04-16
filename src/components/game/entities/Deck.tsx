import { observer } from "mobx-react";
import React from "react";
import Entity, { EntityProps, MaterialParameters } from "./Entity";
import Deck from "../../../models/game/Deck";
import { cardHeight } from "./Card";
import { ContextMenuItem } from "../../../types";
import { useStore } from "../../../stores/RootStore";
import Card from "../../../models/game/Card";

export type DeckProps = Omit<EntityProps, "geometry"> & {};

export default observer((props: DeckProps) => {
  const { gameStore } = useStore();
  const { gameState } = gameStore;

  const { entity } = props;
  const deck = entity as Deck;
  const { cards } = deck;

  const contextMenuItems: ContextMenuItem[] =
    cards.length > 0
      ? [
          {
            label: "Take one",
            type: "action",
            action: () => deck.takeCards(1)
          },
          {
            label: "Draw one",
            type: "action",
            action: () => deck.takeCards(1)
          },
          {
            label: "Shuffle",
            type: "action",
            action: () => deck.shuffle()
          }
        ]
      : [];

  let height = cardHeight * Math.max(cards.length, 1);

  const edgeMaterialParams = {
    roughness: 1
    // color: "white"
  };

  const materialParams: MaterialParameters[] = [
    edgeMaterialParams,
    edgeMaterialParams,
    {
      roughness: 0.2,
      textureUrl: cards.length > 0 ? cards[0].backImageUrl : undefined
    },
    {
      roughness: 0.2,
      textureUrl: cards.length > 0 ? cards[0].frontImageUrl : undefined
    },
    edgeMaterialParams,
    edgeMaterialParams
  ];

  return (
    <Entity
      {...props}
      pivot={[0, -height / 2, 0]}
      geometry={<boxBufferGeometry args={[0.7, height, 1]} attach="geometry" />}
      materialParams={materialParams}
      contextMenuItems={contextMenuItems}
    />
  );
});
