import { action, observable, reaction } from "mobx";
import {
  getSnapshot,
  onPatches,
  Patch,
  SnapshotOutOf,
  applyPatches,
  clone,
  SnapshotInOf,
  fromSnapshot,
  model,
  Model,
  modelFlow,
  _async,
  _await,
  prop
} from "mobx-keystone";
import localforage from "localforage";
import Peer, { DataConnection } from "peerjs";
import { createPeer } from "../utils/Utils";
import GameState from "./GameState";
import Player from "./Player";
import Deck from "./game/Deck";
import Card from "./game/Card";

export enum StateDataType {
  Full,
  Partial
}

export type StateData = {
  type: StateDataType;
  data: SnapshotOutOf<GameState> | Patch[];
};

@model("GameServer")
export default class GameServer extends Model({}) {
  @observable peer!: Peer;
  @observable lastJson: any;
  @observable gameState!: GameState;

  ignorePlayerIdInStateUpdate?: string;

  @modelFlow
  setup = _async(function*(this: GameServer, peer: Peer, gameState: GameState) {
    this.peer = peer;
    this.gameState = gameState;
    this.gameState.hostPeerId = this.peerId;

    // onPatches(this.gameState, (patches, inversePatches) => {
    //   this.sendStateToClients(patches);
    // });

    this.peer.on("connection", connection => {
      connection.on("open", () => {
        this.handleConnectionOpened(connection);
      });
    });

    this.peer.on("disconnected", () => this.peer.reconnect());
  });

  @action handleConnectionOpened(connection: DataConnection) {
    // if the user was previously in game, they take control of that player
    const { userId, userName } = connection.metadata;

    let player = this.gameState.players.find(p => p.userId === userId);

    if (player) {
      player.isConnected = true;
    } else {
      player = new Player({
        userId,
        name: userName,
        peerId: connection.peer,
        isConnected: true
      });
      this.gameState.addPlayer(player);
    }

    player.connection = connection;

    player.sendState({
      type: StateDataType.Full,
      data: getSnapshot(this.gameState)
    });

    connection.on("data", data => this.onStateDataFromClient(data, player!));
    connection.on("close", () => (player!.isConnected = false));
  }

  get peerId() {
    return this.peer?.id;
  }

  @action sendStateToClients(patches: Patch[]) {
    for (let player of this.gameState.connectedPlayers) {
      if (
        player.peerId === this.peerId ||
        player.userId === this.ignorePlayerIdInStateUpdate
      )
        continue;
      player.sendState({
        type: StateDataType.Partial,
        data: patches
      });
    }
  }

  @action onStateDataFromClient(stateData: StateData, fromPlayer: Player) {
    if (stateData.type === StateDataType.Partial) {
      this.ignorePlayerIdInStateUpdate = fromPlayer.userId;
      applyPatches(this.gameState, stateData.data as Patch[]);
      this.ignorePlayerIdInStateUpdate = undefined;
    }
  }
}
