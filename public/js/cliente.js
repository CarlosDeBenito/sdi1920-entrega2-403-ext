// Variables globales
var token;
var userEmail;
var selectedFriendEmail;
var friends;
var URLbase = "https://localhost:8081/api";
var UPDATE_TIME = 10000; // Tiempo en milisegundos entre cada actualiación
var updateMessages = false;
var updateFriends = false;
var friendsIntervalId; // Identificador del setInterval de widget-friends
var chatIntervalId; // Identificador del setInterval de widget-chat

// Cargamos el widget-login al acceder a cliente.html
loadWidget("login");

// Si existe una cookie con el token, lo guardamos e intentamos cargar
// un widget (aunque haya token puede estar caducado)
if (Cookies.get('token') != null) {
	token = Cookies.get('token');
	loadWidgetUsingUrl();
}

function showMessage(message, alertType){
	$("#messageContainer").empty();
	$("#messageContainer")
		.prepend("<div class='alert "+ alertType +"'>"+ message +"</div>");
}

function loadWidgetUsingUrl(){
	// Obtenemos el parámetro w de la url y cargamos el widget correspondiente al parámetro
	var url = new URL(window.location.href);
	var w = url.searchParams.get("w");
	switch (w) {
	case "login":
		loadWidget("login");
		break;
	case "friends":
		loadWidget("friends");
		break;
	case "chat":
		loadWidget("chat");
		break;
	default:
		// Si no existe el parámetro o su valor no es ninguno de los anteriores, 
		// cargamos el widget-friends
		loadWidget("friends");
	}
}

function loadWidget(widget){
	$("#contenedor-principal").load("widget-"+ widget +".html");
	$("#messageContainer").empty();
}

function loadWidgetAndStopIntervals(widget){
    clearInterval(friendsIntervalId);
    clearInterval(chatIntervalId);
	loadWidget(widget);
}

function loadUserEmail() {
    // Si el email es null y existe una cookie con el email,
    // lo guardamos en la variable global
    if (userEmail == null && Cookies.get('userEmail') != null) {
        userEmail = Cookies.get('userEmail');
    }

    console.log("Usuario autenticado: " + userEmail);
    $('#userAuthenticatedAs').text("Usuario autenticado: " + userEmail);
}

function dateFromObjectId(objectId) {
    var timestamp = objectId.substring(0, 8);
    return new Date(parseInt(timestamp, 16) * 1000);
};