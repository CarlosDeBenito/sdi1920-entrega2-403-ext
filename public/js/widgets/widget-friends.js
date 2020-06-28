// Modificamos la URL actual del navegador
window.history.pushState("", "", "/cliente.html?w=friends");

var currentFriendsShown = [];
var numFriends = 0; // numero de amigos totales que tiene el usuario
var numFriendsFullyLoaded = 0; // numero de amigos cuya info ha sido cargada
var friendsNeverUpdated = true;

// Cargamos las amigos
loadFriends();
loadUserEmail();

// Cada N segundos se va a realizar una llamada al SW para comprobar el numero de mensajes sin leer y el orden de los amigos
friendsIntervalId = setInterval(function(){
	// Actualizamos el numero de mensajes y la fecha del ultimo mensaje de cada amigo
	checkNumMessagesNotReadAndOrderFriends();

	// Actualizamos la tabla con los amigos que se muestran actualmente
	updateFriendsTable(currentFriendsShown);

}, UPDATE_TIME);
checkNumMessagesNotReadAndOrderFriends();
updateFriendsTable(currentFriendsShown);



// Funciones:

function errorProducedInFriends(){
    // Dejamos de hacer peticiones al SW cuando se produce
    // un error, como por ejemplo, caduca el token de sesión
    clearInterval(friendsIntervalId);
    loadWidget("login");
}

function loadFriends() {
	friends = []; // vaciamos el array de amigos
	
	// Obtenemos los emails, y por cada uno de ellos,
	// obtenemos sus datos y los cargamos en friends y en la tabla
	$.ajax({
		url : URLbase + "/friend",
		type : "GET",
		data : {},
		dataType : 'json',
		headers : {
			"token" : token
		},
		success : function(response) {
			console.log("Emails amigos: " + JSON.stringify(response));
			var friendsEmails = response;

			numFriends = friendsEmails.length;

			loadFriendsDataAndUpdateTable(friendsEmails);
		},
		error : function(error) {
            errorProducedInFriends();
		}
	});
}

function loadFriendsDataAndUpdateTable(friendsEmailsToShow) {
	// Para cada email, lo cargamos en friends y en la tabla
	$("#friendsTableBody").empty(); // Vaciar la tabla

	for (i = 0; i < friendsEmailsToShow.length; i++) {
		// Para cada email de un usuario amigo, sacamos todos sus datos
		// y los añadimos a una fila de la tabla
		loadUserDataAndAddToTable(friendsEmailsToShow[i]);
	}
}

function loadUserDataAndAddToTable(email) {
	// Cargamos los datos del usuario con ese email,
	// y lo añadimos a friends y a la tabla
	$.ajax({
		url : URLbase + "/user/" + email,
		type : "GET",
		data : {},
		dataType : 'json',
		headers : {
			"token" : token
		},
		success : function(response) {
			friends.push(response); // se añade el amigo a la lista de todos los amigos
            currentFriendsShown.push(response); // se añade el amigo a la lista de amigos mostrados actualmente
			addUserToTable(response);// y a la tabla
		},
		error : function(error) {
            errorProducedInFriends();
		}
	});
}

function addUserToTable(user) {
	var userNameAndMessages;
	// Si hay numero de mensajes sin leer, los añadimos al texto a mostrar, sino no
	if(user.numMessagesNotRead != null)
        userNameAndMessages = user.nombre + " [" + user.numMessagesNotRead + "] ";
	else
		userNameAndMessages = user.nombre;

	// Añadimos los datos de ese usuario a la tabla
	$("#friendsTableBody").append(
			"<tr id="+user.email+">" + 
				'<td><a id="select_'+user.email+'" onclick=chat(\'' + user.email + "')>" + userNameAndMessages + "</a></td>" +
				"<td>" + user.email + "</td>" +  
			"</tr>");
}

function updateFriendsTable(friendsToShow) {
	$("#friendsTableBody").empty(); // Vaciar la tabla

	// Para cada uno de los amigos a mostrar, lo añadimos directamente
	// a la tabla (son amigos, no emails, no hace falta pedir los datos)
	for (i = 0; i < friendsToShow.length; i++) {
		addUserToTable(friendsToShow[i]);
	}

    // Si se han cargado todos los amigos totalmente, se añade un texto en el footer indicándolo
    if(numFriendsFullyLoaded == numFriends){
        friendsFullyLoaded();
    }
}

// Escuchador del input 'nameFilter'
$('#filterName').on('input', function(e) {
	var filteredFriends = [];
	var filterName = $("#filterName").val();

	for (i = 0; i < friends.length; i++) {
		// indexOf() retorna -1 si el valor buscado no se encuentra en el string
		if (friends[i].nombre.indexOf(filterName) != -1) {
			filteredFriends.push(friends[i]);
		}
	}

    currentFriendsShown = filteredFriends;
	updateFriendsTable(currentFriendsShown);
});

function chat(email) {
    clearInterval(friendsIntervalId); // Dejamos de actualizar los amigos
	selectedFriendEmail = email; // Variable global
	Cookies.set('selectedFriendEmail', email); // lo guardamos en una cookie
	Cookies.set('friends', friends); // lo guardamos en una cookie
	loadWidget("chat");
}

function checkNumMessagesNotReadAndOrderFriends(){
	// Por cada uno de los amigos que se estan mostrando actualmente,
	// comprobamos el numero de mensajes que hay sin leer en su chat
	// y actualizamos el tiempo del ultimo mensaje creado en su chat
    for (i = 0; i < currentFriendsShown.length; i++) {
        checkNumMessagesNotReadOfFriendAndUpdateTime(currentFriendsShown[i].email);
    }

    // Ordenamos a los amigos que se muestran actualmente por antiguedad del ultimo mensaje en su chat
	orderFriendsAndCurrentFriendsShown();
}

function checkNumMessagesNotReadOfFriendAndUpdateTime(email){
	// Obtenemos todos los mensajes con ese usuario
    $.ajax({
        url : URLbase + "/message?user1="+userEmail+"&user2="+email,
        type : "GET",
        data : {},
        dataType : 'json',
        headers : {
            "token" : token
        },
        success : function(response) {
            var messages = response;

        	// Actualizamos el numero de mensajes no leidos en el chat con ese usuario
            updateNumMessagesNotReadOfFriend(email, messages);

            // Actualizamos el tiempo del ultimo mensaje creado en el chat con ese amigo
			updateFriendLastMessageTime(email, messages);

            // actualizamos el numero de amigos cuya info se ha cargado totalmente
            if(numFriendsFullyLoaded < numFriends){
                numFriendsFullyLoaded++;
			}

        },
        error : function(error) {
            errorProducedInFriends();
        }
    });
}

function updateNumMessagesNotReadOfFriend(email, messages){
    var numMessagesNotRead = getNumMessagesNotRead(messages);

    // Modificamos el numero de mensajes sin leer para ese amigo en el array
    // que tiene los amigos que se muestran actualmente
    for (i = 0; i < currentFriendsShown.length; i++) {
        if(currentFriendsShown[i].email == email) {
            currentFriendsShown[i].numMessagesNotRead = numMessagesNotRead;
            break;
        }
    }
}

function getNumMessagesNotRead(messages){
    var numMessagesNotRead = 0;
    for (i = 0; i < messages.length; i++) {
        // Si eres el receptor del mensaje y no lo has leido
        if(messages[i].destino.includes(userEmail) && !messages[i].leido)
            numMessagesNotRead++;
    }
    return numMessagesNotRead;
}

function updateFriendLastMessageTime(email, messages){
	// Si el array de mensajes está vacio, no modificamos lastMessageTime, será null
	if(messages.length == 0)
		return;

    // Modificamos el tiempo del ultimo mensaje en el chat con ese amigo
	// en el array que tiene los amigos que se muestran actualmente
	var lastMessage = messages[messages.length-1];

    for (i = 0; i < currentFriendsShown.length; i++) {
        if(currentFriendsShown[i].email == email) {
            currentFriendsShown[i].lastMessageTime = dateFromObjectId(lastMessage._id);
            break;
        }
    }
}

function orderFriendsAndCurrentFriendsShown(){
    friends.sort(function(a, b) {
        if(a.lastMessageTime == null && b.lastMessageTime == null) return 0;
        if(a.lastMessageTime == null) return +1;// si solo a NO tiene fecha, aparece a despues en el array
        if(b.lastMessageTime == null) return -1;// si solo b NO tiene fecha, aparece b despues en el array
        return b.lastMessageTime - a.lastMessageTime; // si ambos tienen fecha, los ordenamos por fecha (el de fecha mayor va antes)
    });

	currentFriendsShown.sort(function(a, b) {
    	if(a.lastMessageTime == null && b.lastMessageTime == null) return 0;
    	if(a.lastMessageTime == null) return +1;// si solo a NO tiene fecha, aparece a despues en el array
    	if(b.lastMessageTime == null) return -1;// si solo b NO tiene fecha, aparece b despues en el array
		return b.lastMessageTime - a.lastMessageTime; // si ambos tienen fecha, los ordenamos por fecha (el de fecha mayor va antes)
	});
}

function friendsFullyLoaded(){
    // Si se han cargado totalmente todos los amigos
	// (están ordenados y aparece su numero de mensajes sin leer) POR PRIMERA VEZ,
	// mostramos el siguiente texto en el footer
	if(friendsNeverUpdated && numFriendsFullyLoaded == numFriends){
		$("#friendsFooterMessage").text("Todos los amigos cargados");
        friendsNeverUpdated = false;
	}
}
