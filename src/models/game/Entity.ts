import { observable, computed, when, reaction } from "mobx";
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
  Ref,
  rootRef,
  detach,
  onSnapshot,
  OnSnapshotDisposer,
  SnapshotOutOfModel,
  applySnapshot,
  getSnapshot
} from "mobx-keystone";
import GameState from "../GameState";
import { Box3, Mesh } from "three";
import UIState from "../../stores/UIState";
import RootStore from "../../stores/RootStore";
import { nanoid } from "nanoid";
import EntitySet from "./EntitySet";
import React from "react";
import { omit } from "lodash";
import HandArea from "./HandArea";

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

export const entityRef = rootRef<Entity>("EntityRef", {
  onResolvedValueChange(ref, newEntity, oldEntity) {
    if (oldEntity && !newEntity) detach(ref);
  }
});

export type Vector3 = { x: number; y: number; z: number };

@model("Entity")
export default class Entity extends Model({
  name: prop("", { setterAction: true }),
  type: prop<EntityType>(EntityType.Card, { setterAction: true }),
  ownerSet: prop<Ref<EntitySet> | undefined>(undefined, { setterAction: true }),
  prototype: prop<Ref<Entity> | undefined>(undefined, { setterAction: true }),
  position: prop<Vector3>(() => ({ x: 0, y: 0, z: 0 }), { setterAction: true }),
  angle: prop(0, { setterAction: true }),
  scale: prop<Vector3>(() => ({ x: 1, y: 1, z: 1 }), { setterAction: true }),
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
  editable: prop(true, { setterAction: true }),
  controllingPeerId: prop<string | undefined>(undefined, { setterAction: true })
}) {
  onSnapshotDisposer?: OnSnapshotDisposer;
  @observable mesh?: Mesh;
  @observable boundingBox?: Box3;

  onInit() {
    when(
      () => this.assetCache !== undefined,
      () => {
        this.frontImageUrl && this.assetCache!.addTexture(this.frontImageUrl);
        this.backImageUrl && this.assetCache!.addTexture(this.backImageUrl);
      }
    );

    reaction(
      () => [this.mesh, this.position, this.scale, this.angle],
      data => this.updateBoundingBox(),
      { fireImmediately: true }
    );
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

  @computed get isSelected() {
    return this.uiState?.selectedEntities[this.$modelId] !== undefined;
  }

  @computed get handArea() {
    let area: Entity | undefined;
    if (this.gameState && this.boundingBox) {
      for (const otherEntity of this.gameState.entities) {
        if (otherEntity !== this && otherEntity.boundingBox) {
          const collision = this.boundingBox.intersectsBox(
            otherEntity.boundingBox
          );
          if (collision && otherEntity.$modelType === "HandArea") {
            area = otherEntity;
            break;
          }
        }
      }
    }

    return area;
  }

  @modelAction
  setPosition(x: number, z: number, ignoreEntities: Entity[] = []) {
    let y = 0;
    if (this.boundingBox && this.gameState) {
      for (const otherEntity of this.gameState.entities) {
        if (ignoreEntities.includes(otherEntity)) continue;
        if (otherEntity !== this && otherEntity.boundingBox) {
          const collision = this.boundingBox.intersectsBox(
            otherEntity.boundingBox
          );
          if (collision) {
            if (this.stackable && otherEntity.boundingBox.max.y > y) {
              y = otherEntity.boundingBox.max.y;
            }
          }
        }
      }
    }

    this.position = { x, y, z };
  }

  @modelAction
  updateBoundingBox() {
    if (this.mesh && this.mesh.geometry) {
      this.boundingBox = new Box3();
      this.boundingBox.setFromObject(this.mesh);
      // this.boundingBox.min.y = 0;
    }
  }

  @modelAction
  updateFromPrototype() {
    if (!this.prototype?.maybeCurrent) return;

    let snapshot = getSnapshot(this.prototype?.maybeCurrent)!;

    const newSnapshot = omit(snapshot, [
      "$modelId",
      "position",
      "angle",
      "faceUp",
      "ownerSet",
      "prototype",
      "locked",
      "controllingPeerId"
    ]);

    applySnapshot(this, { ...getSnapshot(this), ...newSnapshot });
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
  setScale(scale: number) {
    this.scale.x = this.scale.y = this.scale.z = scale;
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
    clonedEntity.position.x += 1;
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
