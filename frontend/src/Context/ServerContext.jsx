import { createContext } from "react";
class Server {
  constructor(token = null) {
    this.token = token;
  }
}
export const ServerContext = createContext({
  server: new Server(),
});
