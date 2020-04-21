import { observable, computed, when } from "mobx";
import {
  Model,
  model,
  modelAction,
  prop,
  findParent,
  getRootPath,
  getRoot,
  getRootStore,
  clone,
  Ref
} from "mobx-keystone";
import GameState from "../GameState";
import { Box3 } from "three";
import UIState from "../../stores/UIState";
import RootStore from "../../stores/RootStore";
import { nanoid } from "nanoid";
import EntitySet from "./EntitySet";
import React from "react";

export enum EntityType {
  Deck,
  Card,
  Tile,
  Dice,
  Piece,
  PieceSet,
  Board,
  Any,
  HandArea
}

export enum Shape {
  Cube,
  Cylinder,
  Cone,
  Sphere,
  Ring,
  Tetrahedron,
  Octahedron,
  Dodecahedron
}

@model("Entity")
export default class Entity extends Model({
  id: prop(nanoid(), { setterAction: true }),
  name: prop("", { setterAction: true }),
  type: prop<EntityType>(EntityType.Card, { setterAction: true }),
  ownerSet: prop<Ref<EntitySet> | undefined>(undefined, { setterAction: true }),
  position: prop<[number, number]>(() => [0, 0], { setterAction: true }),
  angle: prop(0, { setterAction: true }),
  scale: prop<{ x: number; y: number; z: number }>(
    () => ({ x: 1, y: 1, z: 1 }),
    { setterAction: true }
  ),
  color: prop<{ r: number; g: number; b: number }>(
    () => ({ r: 1, g: 1, b: 1 }),
    {
      setterAction: true
    }
  ),
  frontImageUrl: prop<string>("", { setterAction: true }),
  backImageUrl: prop<string>("", { setterAction: true }),
  shape: prop<Shape>(Shape.Cube, { setterAction: true }),
  shapeParam1: prop(3, { setterAction: true }),
  shapeParam2: prop(3, { setterAction: true }),
  locked: prop(false, { setterAction: true }),
  faceUp: prop(true, { setterAction: true }),
  stackable: prop(false, { setterAction: true }),

  controllingPeerId: prop<string | undefined>(undefined, { setterAction: true })
}) {
  onInit() {
    when(
      () => this.assetCache !== undefined,
      () => {
        this.frontImageUrl && this.assetCache!.addTexture(this.frontImageUrl);
        this.backImageUrl && this.assetCache!.addTexture(this.backImageUrl);
      }
    );
  }
  @observable boundingBox: Box3 = new Box3();

  @computed get countInSet() {
    if (!this.ownerSet || !this.ownerSet.maybeCurrent) return 0;
    return this.ownerSet.current.getCount(this);
  }

  @computed get gameState() {
    return findParent<GameState>(
      this,
      parentNode => parentNode instanceof GameState
    )!;
  }

  @computed get assetCache() {
    return getRootStore<RootStore>(this)?.assetCache;
  }

  @computed get uiState() {
    return getRootStore<RootStore>(this)?.uiState;
  }

  @computed get gameStore() {
    return getRootStore<RootStore>(this)?.gameStore;
  }

  @computed get isOtherPlayerControlling() {
    if (!this.controllingPeerId) return false;
    return this.controllingPeerId !== this.gameStore?.peer?.id;
  }

  @computed get isDragging() {
    return (
      this.uiState?.isDraggingEntity && this.uiState?.draggingEntity === this
    );
  }

  @modelAction
  setScaleX(scale: number) {
    this.scale.x = scale;
  }

  @modelAction
  setScaleY(scale: number) {
    this.scale.y = scale;
  }

  @modelAction
  setScaleZ(scale: number) {
    this.scale.z = scale;
  }

  @modelAction
  rotate(radians: number) {
    this.angle += radians;
  }

  @modelAction
  toggleLocked() {
    this.locked = !this.locked;
  }

  @modelAction
  flip() {
    this.faceUp = !this.faceUp;
  }

  @modelAction
  duplicate() {
    const clonedEntity = clone(this);
    clonedEntity.position[0] += 1;
    this.gameState.addEntity(clonedEntity);
  }

  @modelAction
  returnToSet() {
    if (this.ownerSet) {
      const set = this.ownerSet.current;
      this.gameState.removeEntity(this);
      set.addEntity(this);
      this.faceUp = set.faceUp;
    }
  }

  @modelAction
  removeFromSet() {
    this.ownerSet = undefined;
  }

  render(props: any): JSX.Element | null {
    return null;
  }
}
