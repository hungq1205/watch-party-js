import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import { promisify } from 'util'

export const MessageType = Object.freeze({
    EnterRoom: "enterRoom",             // boxId
    DirectMessage: "user:message",      // data: { senderId, receiverId, content | senderUsername }
    BoxMessage: "box:message",          // data: { senderId, content, boxId | senderUsername }
    BoxMovie: "box:movieUpdate",        // data: { movieId | boxId }
    BoxPlayback: "box:playbackUpdate",  // data: { elapsed, isPaused | boxId }
    BoxMember: "box:memberUpdate"       // data: { | boxId, users }
})

const getOwnerOfBox = async (boxId) => {
    try {
        const res = await fetch(`http://localhost:${process.env.PORT}/api/boxes/${boxId}`)
        if (!res.ok)
            return -1

        const data = await res.json()
        return data ? data.owner_id : -1
    } catch (e) {
        console.error("Error fetching owner id of box: ", e)
    }
    return -1
}

const patchStatus = async (userId, isOnline) => {
    try {
        await fetch(
            `http://localhost:${process.env.PORT}/api/users/${userId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isOnline: isOnline })
            }
        )
    } catch (e) {
        console.error("Error fetching owner id of box: ", e)
    }
}

class SocketServer {
    static io
    static users = []
    static boxOwners = {}
    static statusTimer = null

    static init = (expressServer) => {
        this.io = new Server(expressServer, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"]
                }
        })

        const verifyToken = promisify(jwt.verify)
        
        this.io.on('connection', async socket => {
            try {
                const authHeader = socket.request.headers.authorization
                const token = authHeader && authHeader.split(' ')[1]
                if (!token)
                    return socket.disconnect(true)
                socket.user = await verifyToken(token, process.env.SECRET_KEY)
                patchStatus(socket.user.id, true)
            } catch (err) {
                return socket.disconnect(true)
            }
            this.users[socket.user.id] = { socket: socket }
        
            socket.on('disconnect', () => {
                const boxId = this.users[socket.user.id]?.socket?.boxId
                delete this.users[socket.user.id]

                if (boxId !== null) {
                    this.sendMessage(MessageType.BoxMember, { boxId: boxId })
                }
                patchStatus(socket.user.id, false)
            })

            socket.on(MessageType.EnterRoom, boxId => {
                const prevBoxId = this.users[socket.user.id]?.socket?.boxId
                if (prevBoxId !== null) {
                    socket.leave(prevBoxId)
                    if (this.users[socket.user.id])
                        this.users[socket.user.id].socket.boxId = null
                }
                
                socket.join(boxId)
                this.users[socket.user.id].socket.boxId = boxId
            })
        
            socket.on(MessageType.BoxMessage, data => {
                data.senderId = socket.user.id
                data.senderUsername = socket.user.username
                this.sendMessage(MessageType.BoxMessage, data)
            })

            socket.on(MessageType.BoxMember, data => {
                data.senderId = socket.user.id
                data.users = this.users.filter(usr => usr.socket.user.boxId === data.boxId).map(usr => usr.socket.user)
                this.sendMessage(MessageType.BoxMember, data)
            })

            socket.on(MessageType.BoxMovie, data => {
                data.senderId = socket.user.id
                data.boxId = socket.boxId
                this.sendMessage(MessageType.BoxMovie, data)
            })

            socket.on(MessageType.BoxPlayback, data => {
                data.senderId = socket.user.id
                data.boxId = socket.boxId
                this.sendMessage(MessageType.BoxPlayback, data)
            })

            socket.on(MessageType.DirectMessage, data => {
                data.senderId = socket.user.id
                data.senderUsername = socket.user.username
                this.sendMessage(MessageType.DirectMessage, data)
            })
        })
    }

    static sendMessage = async (type, data) => {
        const user = this.users[data.senderId]
        if (!user) return

        if (type === MessageType.BoxMember || type === MessageType.BoxMessage) {
            user.socket.to(data.boxId).emit(type, data)
        }
        else if (type === MessageType.BoxMovie || type === MessageType.BoxPlayback) {
            if (this.boxOwners[data.boxId] === undefined) {
                const id = await getOwnerOfBox(data.boxId)
                if (id === -1)
                    return

                this.boxOwners[data.boxId] = id
            }
            
            if (this.boxOwners[data.boxId] === data.senderId)
                user.socket.to(data.boxId).emit(type, data)
        } 
        else if (type === MessageType.DirectMessage) {
            const receiver = this.users[data.receiverId]
            if (!receiver) return

            receiver.socket.emit(type, data)
        }
    }
}

export default SocketServer 