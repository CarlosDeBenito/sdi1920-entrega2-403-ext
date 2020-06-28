module.exports = function (app, gestorBD) {

	var gestorLogApi = app.get('gestorLogApi');

	app.post("/api/autenticar/", function (req, res) {
		var encryptedPassword = app.get("crypto").createHmac('sha256', app.get('clave'))
			.update(req.body.password).digest('hex');

		var criterio = {
			email: req.body.email,
			password: encryptedPassword
		}

		gestorBD.obtenerUsuarios(criterio, function (users) {
			if (users == null || users.length == 0) {
				res.status(401); // Unauthorized
				res.json({
					authenticated: false,
					message: "Inicio de sesión no correcto"
				});
			} else {
				gestorLogApi.userHasAuthenticated(criterio.email);

				var token = app.get('jwt').sign(
					{ email: criterio.email, tiempo: Date.now() / 1000 },
					"secret");

				res.status(200);// OK
				res.json({
					authenticated: true,
					token: token
				});
			}
		});
	});

	app.get("/api/friend", function (req, res) {
		var criterio = {
			$or: [
				{ "emailUsuarioEnvia": res.email },
				{ "emailUsuarioRecibe": res.email },
			]
		};

		gestorBD.obtenerAmistades(criterio, function (friendships, total) {
			if (friendships == null) {
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else {
				obtenerEmailsAmigos(req, res, friendships);
			}
		});
	});

	function obtenerEmailsAmigos(req, res, friendships) {
		friendsEmails = [];

		friendships.forEach(function (currentFriendship) {
			if (currentFriendship.emailUsuarioEnvia != res.email)
				friendsEmails.push(currentFriendship.emailUsuarioEnvia);
			else
				friendsEmails.push(currentFriendship.emailUsuarioRecibe);
		});

		gestorLogApi.userListHisFriends(res.email, friendsEmails);

		res.status(200);
		res.send(JSON.stringify(friendsEmails));
	}

	app.post("/api/message", function (req, res) {
		var message = {
			emisor: res.email, // el emisor es el usuario en sesión
			destino: req.body.destino,
			texto: req.body.texto,
			leido: false // por defecto se crea como no leido
		};

		// Validamos los datos de entrada
		if (message.destino == null || message.texto == null ||
			typeof message.destino != "string" ||
			typeof message.texto != "string") {

			res.status(400);// Bad Request
			res.json({
				error: "Datos introducidos erróneos"
			});
			return;
		}

		paso1ComprobarExisteDestino(req, res, message);
	});

	function paso1ComprobarExisteDestino(req, res, message) {
		// Comprobamos que exista el usuario de destino del mensaje
		var criterio = { "email": message.destino };

		gestorBD.obtenerUsuarios(criterio, function (users, total) {
			if (users == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (users.length == 0) {
				// No existe el usuario de destino
				res.status(404); // Not Found
				res.json({
					error: "No existe el usuario destinatario del mensaje"
				});
			} else {
				// Existe el usuario de destino
				paso2ComprobarSonAmigos(req, res, message);
			}
		});
	}

	function paso2ComprobarSonAmigos(req, res, message) {
		// Comprobamos que sean amigos
		var criterio = {
			$or: [
				{ "emailUsuarioEnvia": message.emisor, "emailUsuarioRecibe": message.destino },
				{ "emailUsuarioEnvia ": message.destino, "emailUsuarioRecibe": message.emisor }
			]
		};

		gestorBD.obtenerAmistades(criterio, function (friendships, total) {
			if (friendships == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (friendships.length == 0) {
				// No son amigos
				res.status(403); // Forbidden
				res.json({
					error: "No eres amigo del destinatario del mensaje"
				});
			} else {
				// Son amigos
				paso3InsertarMensaje(req, res, message);
			}
		});
	}

	function paso3InsertarMensaje(req, res, message) {
		gestorBD.insertarMensaje(message, function (id) {
			if (id == null) {
				res.status(500);
				res.json({
					error: "Se ha producido un error"
				});
			} else {
				gestorLogApi.userSendsMessage(message.emisor, message.destino);

				res.status(201); // Created
				res.json({
					mensaje: "Mensaje insertado",
					_id: id
				});
			}
		});
	}

	app.get("/api/message", function (req, res) {
		// Validamos los datos de entrada
		if (req.query.user1 == null || req.query.user2 == null
			|| typeof req.query.user1 != "string"
			|| typeof req.query.user2 != "string"
			|| req.query.user1 == req.query.user2) {

			res.status(400);// Bad Request
			res.json({
				error: "Datos introducidos erróneos"
			});
			return;
		}

		paso1ComprobarExisteUser1(req, res);
	});

	function paso1ComprobarExisteUser1(req, res) {
		// Comprobamos que exista user1
		var criterio = { "email": req.query.user1 };

		gestorBD.obtenerUsuarios(criterio, function (users, total) {
			if (users == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (users.length == 0) {
				// No existe user1
				res.status(404); // Not Found
				res.json({
					error: "No existe el usuario 1"
				});
			} else {
				// Existe user1
				paso2ComprobarExisteUser2(req, res);
			}
		});
	}

	function paso2ComprobarExisteUser2(req, res) {
		// Comprobamos que exista user2
		var criterio = { "email": req.query.user2 };

		gestorBD.obtenerUsuarios(criterio, function (users, total) {
			if (users == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (users.length == 0) {
				// No existe user2
				res.status(404); // Not Found
				res.json({
					error: "No existe el usuario 2"
				});
			} else {
				// Existe user2
				paso3ComprobarUsuarioEnSesionEsEmisorOReceptor(req, res);
			}
		});
	}

	function paso3ComprobarUsuarioEnSesionEsEmisorOReceptor(req, res) {
		// Si el email del usuario en sesión es el de user1 o el de user2,
		// entonces podemos acceder a los mensajes enviados entre user1 y user2
		if (res.email == req.query.user1 || res.email == req.query.user2) {
			paso4ObtenerMensajesConversacion(req, res);
		} else {
			res.status(403); // Forbidden
			res.json({
				error: "No puedes acceder a esa conversación. " +
					"No eres ni el emisor ni el receptor de los mensajes."
			});
		}
	}

	function paso4ObtenerMensajesConversacion(req, res) {
		var criterio = {
			$or: [
				{ "emisor": req.query.user1, "destino": req.query.user2 },
				{ "emisor": req.query.user2, "destino": req.query.user1 }
			]
		};

		gestorBD.obtenerMensajes(criterio, function (messages, total) {
			if (messages == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else {
				var friendEmail = res.email == req.query.user1 ? req.query.user2 : req.query.user1;
				gestorLogApi.userGetsHisMessagesWith(res.email, friendEmail);

				// Añadimos la URL /api/user/ para los campos emisor y destino de cada mensaje
				// HATEOAS
				for (var i = 0; i < messages.length; i++) {
					messages[i].emisor = "/api/user/" + messages[i].emisor;
					messages[i].destino = "/api/user/" + messages[i].destino;
				}

				res.status(200);	// OK
				res.send(JSON.stringify(messages));
			}
		});
	}

	app.put("/api/message/:id", function (req, res) {
		// Primero obtenemos el mensaje con ese id
		var criterio = { "_id": gestorBD.mongo.ObjectID(req.params.id) };
		// el valor que nos llega puede ser un string o un boolean
		var message = { leido: req.body.leido == 'true' || req.body.leido };

		// De momento, solo se puede actualizar un mensaje marcandolo como leido
		if (message.leido != true) {
			res.status(400);// Bad Request
			res.json({
				error: "Datos a actualizar erróneos. Sólo se puede actualizar el campo leido a true."
			});
			return;
		}

		gestorBD.obtenerMensajes(criterio, function (messages) {
			if (messages == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (messages.length == 0) {
				// No existe el mensaje
				res.status(404); // Not Found
				res.json({
					error: "No existe el mensaje con ese id"
				});
			} else {
				// Existe el mensaje
				paso1ComprobarUsuarioEnSesionEsReceptorMensaje(req, res, messages[0], message);
			}
		});
	});

	function paso1ComprobarUsuarioEnSesionEsReceptorMensaje(req, res, message, messageDataToUpdate) {
		if (res.email == message.destino) {
			paso2ActualizarMensaje(req, res, messageDataToUpdate);
		} else {
			res.status(403); // Forbidden
			res.json({
				error: "No puedes modificar un mensaje del cual no eres su receptor"
			});
		}
	}

	function paso2ActualizarMensaje(req, res, messageDataToUpdate) {
		var criterio = { "_id": gestorBD.mongo.ObjectID(req.params.id) };

		gestorBD.actualizarMensajes(criterio, messageDataToUpdate, function (result) {
			if (result == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else {
				gestorLogApi.userMarkMessageAsRead(res.email, req.params.id);

				res.status(200); // OK
				res.json({
					mensaje: "Mensaje marcado como leído",
					_id: req.params.id
				});
			}
		});
	}

	app.get("/api/user/:email", function (req, res) {
		// Obtenemos el usuario con ese email
		var criterio = { "email": req.params.email };

		gestorBD.obtenerUsuarios(criterio, function (users) {
			if (users == null) {
				// Error
				res.status(500); // Server Internal Error
				res.json({
					error: "Se ha producido un error"
				});
			} else if (users.length == 0) {
				// No existe el usuario
				res.status(404); // Not Found
				res.json({
					error: "No existe el usuario con ese email"
				});
			} else {
				// Existe el usuario
				res.status(200);
				res.send(JSON.stringify(users[0]));
			}
		});
	});

};