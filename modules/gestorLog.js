module.exports = {
	app: null,
	logger: null,
	init: function (app, logger) {
		this.app = app;
		this.logger = logger;
	},
	nuevoUsuario: function (email) {
		this.logger.info("Nuevo usuario registrado: '" + email + "'.");
	},
	usuarioLogueado: function (email) {
		this.logger.info("El usuario '" + email + "' ha iniciado sesión.");
	},
	usuarioDesconectado: function (email) {
		this.logger.info("El usuario '" + email + "' se ha desconectado.");
	},
	usuarioListado: function (email, pg, usuarios) {
		var usuariosEmails = usuarios.map(function (usuarioActual) {
			return usuarioActual.email;
		});

		this.logger.info("El usuario '" + email + "' ha listado a los usuarios. ");
	},
	usuarioListadoBuscador: function (email, searchText, pg, usuarios) {
		var usuariosEmails = usuarios.map(function (usuarioActual) {
			return usuarioActual.email;
		});

		this.logger.info("El usuario con email '" + email + "' ha buscado a un usuario ");
	},
	usuarioListaAmigos: function (email, pg, amigosEmails) {
		this.logger.info("El usuario '" + email + "' ha listado sus amigos. ");
	},
	usuarioListaPeticiones: function (email, pg, peticiones) {
		var usuariosEmails = peticiones.map(function (peticionActual) {
			return peticionActual.emailUsuarioEnvia;
		});

		this.logger.info("El usuario '" + email + "'ha listado sus peticiones. ");
	},
	usuarioMandaPeticion: function (emailUsuarioEnvia, emailUsuarioRecibe) {
		this.logger.info("El usuario '" + emailUsuarioEnvia + "' ha mandado una petición "
			+ "al usuario '" + emailUsuarioRecibe + "'.");
	},
	usuarioAceptaPeticion: function (emailUsuarioRecibe, emailUsuarioEnvia) {
		this.logger.info("El usuario '" + emailUsuarioRecibe + "' ha aceptado la petición "
			+ "del usuario '" + emailUsuarioEnvia + "'.");
	},
	error: function (errorMessage) {
		this.logger.warn(errorMessage);
	}
};


