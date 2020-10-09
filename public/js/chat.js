const socket = io()
// dom content variables
const chatContainer = document.querySelector('.chat')
const showMessages = document.getElementById('messages')
const sendLocationBtn = document.getElementById('send-location')
// chat form variables
const chatForm = document.getElementById('message-form')
const inputMsg = chatForm.querySelector('input')
const inputBtn = chatForm.querySelector('button')

// focus chat input if muse enter chat app
chatContainer.addEventListener('mouseenter', () => {
	inputMsg.focus()
})

// mustache html templates
const messageTemplate = document.getElementById('message-template').innerHTML
const locationTemplate = document.getElementById('location-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, {
	ignoreQueryPrefix: true,
})

// event listener for chat messages
chatForm.addEventListener('submit', e => {
	e.preventDefault()
	inputBtn.setAttribute('disabled', 'disabled')
	const text = inputMsg.value
	socket.emit('sendMessage', text, msg => {
		if (msg) {
			inputMsg.value = msg
			setTimeout(() => {
				inputMsg.value = ''
				inputBtn.removeAttribute('disabled')
			}, 3000)
			return
		}
		inputBtn.removeAttribute('disabled')
	})
})

// messages from server
socket.on('message', message => {
	const html = Mustache.render(messageTemplate, {
		username: message.username,
		messagetext: message.text,
		createdAt: moment(message.createdAt).format('LT'),
	})
	showMessages.insertAdjacentHTML('beforeend', html)
	inputMsg.value = ''
	inputMsg.focus()
})

// send your location
sendLocationBtn.addEventListener('click', () => {
	sendLocationBtn.setAttribute('disabled', 'disabled')
	if (!navigator.geolocation) {
		return alert('Geolocation is not supported by yor browser')
	}
	navigator.geolocation.getCurrentPosition(position => {
		socket.emit(
			'location',
			{
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
			},
			msg => {
				const html = Mustache.render(messageTemplate, {
					messagetext: msg,
				})
				showMessages.insertAdjacentHTML('beforeend', html)
				setTimeout(() => {
					sendLocationBtn.removeAttribute('disabled')
				}, 1000)
			}
		)
	})
})

// location info from server
socket.on('location', location => {
	const html = Mustache.render(locationTemplate, {
		username: location.username,
		location: location.url,
		createdAt: moment(location.createdAt).format('LT'),
	})
	showMessages.insertAdjacentHTML('beforeend', html)
})

socket.emit('join', { username, room }, error => {
	if (error) {
		alert(error)
		location.href = '/'
	}
})
