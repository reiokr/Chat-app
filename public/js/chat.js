const socket = io()
// elements from DOM
const chatContainer = document.querySelector('.chat')
const showMessages = document.getElementById('messages')
const sendLocationBtn = document.getElementById('send-location')
// chat form 
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
const sidebarTemplate = document.getElementById('sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, {
	ignoreQueryPrefix: true,
})

// autoscroll if reading last messages
const autoscroll = ()=>{
  // new message element
  const newMessage = showMessages.lastElementChild

  //height of the new message element
  const newMessageStyles = getComputedStyle(newMessage)
  const newMessageMargin = parseInt(newMessageStyles.marginBottom)
  const newMessageHeight = newMessage.offsetHeight + newMessageMargin

  // visible height
  const visibleHeight = showMessages.offsetHeight

  
  // height of messages container
  const containerHeight = showMessages.scrollHeight

  
  // how far have i scrolled?
  const scrollOffset = showMessages.scrollTop + visibleHeight


  // check if we are bottom of messages
  if(containerHeight - newMessageHeight -10 <= scrollOffset){
    showMessages.scrollTop = showMessages.scrollHeight // scroll to the bottom
  }

}

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
				inputMsg.focus()
			}, 3000)
			return
		}
		inputBtn.removeAttribute('disabled')
    inputMsg.focus()
    autoscroll()
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
  autoscroll()
})

// sidebar data render
socket.on('roomData', ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users,
	})
	document.querySelector('.chat__sidebar').innerHTML = html
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
					username: msg.username,
					messagetext: msg.text,
				})
				showMessages.insertAdjacentHTML('beforeend', html)
        inputMsg.focus()
				setTimeout(() => {
					sendLocationBtn.removeAttribute('disabled')
				}, 1000)
        autoscroll()
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
  autoscroll()
})

// error message if username is in use
socket.emit('join', { username, room }, error => {
	if (error) {
		alert(error)
		location.href = '/'
	}
})
