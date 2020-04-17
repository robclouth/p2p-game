import { Model, model, prop } from "mobx-keystone";
import { DataConnection } from "peerjs";
import { generateName } from "../utils/NameGenerator";
import { StateData } from "./GameServer";

@model("Player")
export default class Player extends Model({
  userId: prop<string>({ setterAction: true }),
  peerId: prop<string>({ setterAction: true }),
  name: prop<string>({ setterAction: true }),
  isConnected: prop(true, { setterAction: true })
}) {
  connection?: DataConnection;

  sendState(stateData: StateData) {
    this.connection && this.connection.send(stateData);
  }
}