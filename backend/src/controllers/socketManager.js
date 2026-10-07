import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}

export const connectToSocket = (server) => {
    const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
        : "*";
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: allowedOrigins !== "*"
        }
    });

    io.on("connection", (socket) => {
        console.log("[SOCKET] Client connected", socket.id)

        socket.on("register-user", (userId) => {
            const resolvedUserId = userId || socket.id;
            socket.data.userId = resolvedUserId;
            console.log("[SOCKET] Registered user", resolvedUserId, "for socket", socket.id)
        })

        socket.on("join-call", (payload) => {
            const path = typeof payload === 'string' ? payload : payload?.path || payload?.roomId || "default";
            const userId = typeof payload === 'object' ? payload.userId || socket.data.userId || socket.id : socket.data.userId || socket.id;

            socket.data.userId = userId;

            if (connections[path] === undefined) {
                connections[path] = []
            }

            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id)
            }

            timeOnline[socket.id] = new Date();
            console.log("[CALL]", userId, "joined", path)

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }
        })

        socket.on("signal", (targetSocketId, message) => {
            const toId = typeof targetSocketId === 'object' ? targetSocketId.targetSocketId || targetSocketId.toId : targetSocketId;
            const payload = typeof message === 'string' ? JSON.parse(message) : message;
            const fromUserId = socket.data.userId || socket.id;

            if (payload && payload.sdp) {
                console.log("[OFFER]", fromUserId, "->", toId)
            }
            if (payload && payload.ice) {
                console.log("[ICE]", fromUserId, "->", toId)
            }
            if (payload && payload.sdp && payload.sdp.type === 'answer') {
                console.log("[ANSWER]", fromUserId, "->", toId)
            }

            io.to(toId).emit("signal", socket.id, payload);
        })

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("[CHAT]", sender, "in room", matchingRoom)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }
        })

        socket.on("disconnect", () => {
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        const key = k;

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        const index = connections[key].indexOf(socket.id)
                        connections[key].splice(index, 1)

                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }
            }

            console.log("[SOCKET] Client disconnected", socket.id)
        })
    })

    return io;
}

export default connectToSocket;