// require('dotenv').config()
const cors = require('cors')
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
app.use(cors({
    origin: '*'
}))

const server = createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const PORT = process.env.PORT || 5000

function getTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0'); // Add leading zero if needed
    const ampm = hours >= 12 ? 'PM' : 'AM';
  
    hours = hours % 12 || 12; // Convert to 12-hour format
  
    return `${hours}:${minutes} ${ampm}`;
}


let connectedClientsCount = {}

io.on('connection', (socket) => {
    // console.log(`connection occured: ${socket.id}`)

    // client creating a room --- making client join a room
    socket.on('create-room', ({ roomId, username }) => {
        if(connectedClientsCount[roomId])
            socket.emit('room-creation-response', { status: 2 })
        else {
            socket.username = username
            connectedClientsCount[roomId] = 1
            socket.join(roomId)
            socket.emit('room-creation-response', { status: 1 })
        }
    })

    // client joining a room
    socket.on('join-room', ({joinRoomName, username}) => {
        if(connectedClientsCount[joinRoomName]) {
            socket.username = username
            socket.join(joinRoomName)
            socket.room = joinRoomName
            connectedClientsCount[joinRoomName]++
            socket.emit('room-joining-response', { status: 1 })
            socket.broadcast.to(joinRoomName).emit('new-joined', { username, time: getTime() })
        } else 
            socket.emit('room-joining-response', { status : 2 })
    })

    // client on sending a message which will be redirected to the room 
    socket.on('message', ({ username, text, roomId }) => {
        socket.to(roomId).emit('recieve-message', { username, text, time: getTime() })
    })

    // typing status of client
    socket.on('typing', ({ boolVal, roomId, username }) => {
        if(boolVal)
            socket.broadcast.to(roomId).emit('typing-user', username)
    })

    // online status of client
    socket.on('online-stats', (roomName) => {
        socket.emit('online-stats-response', connectedClientsCount[roomName])
    })

    socket.on('disconnect', () => {
        connectedClientsCount[socket.room]--

        socket.broadcast.to(socket.room).emit('user-left', { username:socket.username, time: getTime() })

        if(connectedClientsCount[socket.room] === 0) {
            connectedClientsCount.filter(room => room !== socket.room)
        }
        console.log('disconnected')
    })
})

module.exports = app
// module.exports = server

server.listen(PORT, () => {
    console.log(`listening on port: ${PORT}`)
})
