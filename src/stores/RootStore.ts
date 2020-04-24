import React from "react";
import { observable } from "mobx";
import UIState from "./UIState";
import GameStore from "./GameStore";
import {
  createContext,
  registerRootStore,
  model,
  Model,
  prop,
  modelAction,
  modelFlow,
  _async,
  _await,
  applySnapshot,
  getSnapshot
} from "mobx-keystone";
import AssetCache from "./AssetCache";
import EntityLibrary from "./EntityLibrary";

@model("RootStore")
export default class RootStore extends Model({
  gameStore: prop<GameStore>(() => new GameStore({}), { setterAction: true }),
  uiState: prop<UIState>(() => new UIState({}), { setterAction: true }),
  entityLibrary: prop<EntityLibrary>(() => new EntityLibrary({}), {
    setterAction: true
  }),
  assetCache: prop<AssetCache>(() => new AssetCache({}), {
    setterAction: true
  }),
  isInitialized: prop(false, { setterAction: true })
}) {
  @modelFlow
  init = _async(function*(this: RootStore) {
    yield* _await(
      Promise.all([this.entityLibrary.init(), this.gameStore.init()])
    );
    this.isInitialized = true;
  });
}

export const rootStore = new RootStore({});

registerRootStore(rootStore);

const context = React.createContext<RootStore>(rootStore);

export const useStore = () => {
  return React.useContext(context);
};
