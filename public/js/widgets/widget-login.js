//Modificamos la URL actual del navegador
window.history.pushState("", "", "/cliente.html?w=login");

// Borramos todos los eventos antes de registrar uno nuevo
$("#loginButton").unbind( "click" );

$("#loginButton").click(function() {
	var email = $("#email").val();
	var password = $("#password").val();
	
	// Comprobamos que los dos campos tengan valor
	if(email == ""){
		showMessage("Rellena el campo 'Email'", "alert-danger");
		return;
	}
	if(password == ""){
		showMessage("Rellena el campo 'Password'", "alert-danger");
		return;
	}
	
	$.ajax({
		url: URLbase + "/autenticar",
		type: "POST",
		data: {
			email: email,
			password: password
		},
		dataType: 'json',
		success: function(respuesta) {
			console.log("Token: " + respuesta.token);
			
			//Guardamos el email del usuario en una variable global y en una cookie
			userEmail = email;
			Cookies.set('userEmail', email);
			
			// Guardamos el token en una variable global y en una cookie
			token = respuesta.token;
			Cookies.set('token', respuesta.token); 
			
			// Cargamos el widget con el listado de amigos
			loadWidget("friends");
		},
		error: function(error) {
			Cookies.remove('token'); // Eliminamos la cookie token
			showMessage("Usuario no encontrado", "alert-danger");
		}
	});
});
