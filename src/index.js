const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
// setup socket.io server
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))

app.get('/', (req, res) => {
	res.render('index')
})
app.get('/chat.html?', (req, res) => {})

// chat messages
io.on('connection', socket => {
	// join chat
	socket.on('join', (options, callback) => {
		// add user to room
		const { error, user } = addUser({ id: socket.id, ...options })
		if (error) return callback(error)

		// io.to.emit  -> send message everyone in same room
		// socket.broadcast.to.emit -> send message everyone in same room except sender
		socket.join(user.room) // joins to specific room
		// send welcome message to client
		socket.emit(
			'message',
			generateMessage(
				'Admin',
				`${user.username} - Welcome to room: ${options.room}`
			)
		)
		// send message to all users but not to joined user
		socket.broadcast
			.to(user.room)
			.emit('message', generateMessage('Admin', `${user.username} has joined`))
		// room name and all users
		io.to(user.room).emit('roomData', {
			room: options.room,
			users: getUsersInRoom(user.room),
		})

		callback()
		// send message to all others if user left chat
		socket.on('disconnect', () => {
			// remove user
			const user = removeUser(socket.id)
			if (user) {
				io.to(user.room).emit(
					'message',
					generateMessage('Admin', `${user.username} Has left`)
				)
				io.to(user.room).emit('roomData', {
					room: options.room,
					users: getUsersInRoom(user.room),
				})
			}
		})
	})

	// send location to all users
	socket.on('location', (locationData, callback) => {
		const user = getUser(socket.id)
		const usersInRoom = getUsersInRoom(user.room)

		if (usersInRoom.length === 1)
			return callback(generateMessage('Admin', 'No users in this room!'))

		const locationURL = `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`

		io.to(user.room).emit(
			'location',
			generateLocationMessage(user.username, locationURL)
		)
		callback(generateMessage('Admin', 'Your location shared!'))
	})

	//////////////// messages ///////////////////////////
	// receive text from client
	socket.on('sendMessage', (text, callback) => {
		const user = getUser(socket.id)

		// send received text to everione
		const filter = new Filter()
		if (filter.isProfane(text)) {
			return callback('Profanity is not allowed')
		}
		if (text === '') return callback('Please fill out this field!')

		io.to(user.room).emit('message', generateMessage(user.username, text))
		callback()
	})
})

//listen server port using http.createServer()
server.listen(port, () => {
	console.log(`Server is up on: http://localhost:${port}`)
})
