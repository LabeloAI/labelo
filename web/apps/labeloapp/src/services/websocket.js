export default class WebSocketLB {
  sockets = {}

  addSocket(url, key) {
    let socket
    let start = window.location.protocol === "https:"? "wss" : "ws";
    if(Object.keys(this.sockets).includes(key)) {
      return this.sockets[key]
    }
    socket = new WebSocket(`${start}://${window.location.host}${url}`)
    this.sockets[key] = socket
    return socket
  }

  getSocket(key) {
    return this.sockets[key]
  }
}
