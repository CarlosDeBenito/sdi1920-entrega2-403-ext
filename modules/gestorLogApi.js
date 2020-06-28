module.exports = {
	app: null,
	logger: null,
	init: function (app, logger) {
		this.app = app;
		this.logger = logger;
	},
	addApiToLogTrace: function (logMessage) {
		this.logger.info("[API] - " + logMessage);
	},
	userHasAuthenticated: function (email) {
		this.addApiToLogTrace("El usuario con email '" + email + "' se ha autenticado " +
			"y se le ha devuelto un token de seguridad.");
	},
	userListHisFriends: function (email, friendsEmails) {
		this.addApiToLogTrace("El usuario con email '" + email + "' ha accedido a su lista de amigos, "
			+ "siendo sus emails los siguientes: {" + friendsEmails + "}");
	},
	userSendsMessage: function (senderEmail, receiverEmail) {
		this.addApiToLogTrace("El usuario con email '" + senderEmail + "' ha mandado un mensaje "
			+ "al usuario con email '" + receiverEmail + "'.");
	},
	userGetsHisMessagesWith: function (userEmail, friendEmail) {
		this.addApiToLogTrace("El usuario con email '" + userEmail + "' ha obtenido todos "
			+ "los mensajes intercambiados con un amigo suyo, cuyo email es '" + friendEmail + "'.");
	},
	userMarkMessageAsRead: function (userEmail, messageId) {
		this.addApiToLogTrace("El usuario con email '" + userEmail + "' ha marcado como leído "
			+ "el mensaje con id '" + messageId + "'.");
	}
};


