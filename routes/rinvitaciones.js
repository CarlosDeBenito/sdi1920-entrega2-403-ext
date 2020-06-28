module.exports = function (app, swig, gestorBD) {

    var gestorLog = app.get('gestorLog');

    app.get("/user/peticion/:email", function (req, res) {
        if (req.params.email === req.session.email) {
            res.redirect("/user/list?message=No puedes enviarte una invitación de amistad a ti mismoS");
            return;
        }

        var peticion = {
            emailUsuarioEnvia: req.session.email,
            emailUsuarioRecibe: req.params.email
        };
        gestorBD.enviarPeticion(peticion, function (id, errMessage) {
            if (id == null) {
                res.redirect("/user/list?message=" + errMessage);
            } else {
                gestorLog.usuarioMandaPeticion(peticion.emailUsuarioEnvia, peticion.emailUsuarioRecibe);

                res.redirect("/user/list?message=Peticion enviada correctamente.");
            }
        });
    });

    app.get("/user/peticiones", function (req, res) {
        var criterio = {
            emailUsuarioRecibe: req.session.email
        };

        var pg = parseInt(req.query.pg);
        if (req.query.pg == null || isNaN(pg)) {
            pg = 1;
        }

        gestorBD.obtenerPeticionesPg(criterio, pg, function (peticiones, total) {
            if (peticiones == null) {
                res.redirect("/user/list?message=Error al listar las peticiones");
            } else {

                var itemsPerPage = app.get('itemsPerPage');
                var pgUltima = Math.floor(total / itemsPerPage);
                if (total % itemsPerPage > 0) {
                    pgUltima = pgUltima + 1;
                }

                obtenerUsuariosEnvianPeticiones(req, res, peticiones, pg, pgUltima);
            }
        });
    });

    function obtenerUsuariosEnvianPeticiones(req, res, peticiones, pg, pgUltima) {
        // Sacamos el email de cada usuario que ha enviado invitacion al usuario en sesion
        var emailUsuarioEnvia = peticiones.map(function (invitacionActual) {
            return invitacionActual.emailUsuarioEnvia;
        });

        // Obtenemos los usuarios con esos emails
        var criterio = { "email": { "$in": emailUsuarioEnvia } };

        gestorBD.obtenerUsuarios(criterio, function (usuariosEnvia) {
            if (usuariosEnvia == null) {
                res.redirect("/user/list?message=Error al listar las peticiones");
            } else {
                añadirUsuarioEnviaAPeticiones(req, res, peticiones, usuariosEnvia, pg, pgUltima);
            }
        });
    }

    function añadirUsuarioEnviaAPeticiones(req, res, peticiones, usuariosEnvia, pg, pgUltima) {
        peticiones.forEach(function (peticion) {
            usuariosEnvia.some(function (usuarioEnvia) { // "some" deja de iterar por los senderUses cuando se retorna true
                if (usuarioEnvia.email == peticion.emailUsuarioEnvia) {
                    peticion.usuarioEnvia = usuarioEnvia;
                    return true;
                }
            });
        });

        verPeticiones(req, res, peticiones, pg, pgUltima);
    }

    function verPeticiones(req, res, peticiones, pg, pgUltima) {
        gestorLog.usuarioListaPeticiones(req.session.email, pg, peticiones);

        var respuesta = swig.renderFile('views/user/peticiones.html', {
            peticiones: peticiones,
            pgActual: pg,
            pgUltima: pgUltima,
            email: req.session.email,
        });

        res.send(respuesta);
    }

    app.get("/user/aceptar/:id", function (req, res) {
        var criterio = { "_id": gestorBD.mongo.ObjectID(req.params.id) };

        gestorBD.obtenerPeticiones(criterio, function (peticiones) {
            if (peticiones == null) {
                // Error
                res.redirect("/user/peticiones?message=Error al aceptar la petición de amistad");
            } else if (peticiones.length == 0) {
                res.redirect("/user/peticiones?message=Esa petición de amistad no existe");
            } else {
                receptorPeticion(req, res, peticiones[0]);
            }
        });
    });

    function receptorPeticion(req, res, peticion) {
        if (peticion.emailUsuarioRecibe != req.session.email) {
            res.redirect("/user/peticiones?message=¡No puedes aceptar una petición de amistad que no te han enviado a ti!");
        } else {
            //Si el usuario en sesion es el receptor de la invitación, creamos la amistad y eliminamos la invitacion
            insertarAmistad(req, res, peticion);
        }
    }

    function insertarAmistad(req, res, peticion) {
        // Creamos la relación de amistad
        var amigos = {
            "emailUsuarioEnvia": peticion.emailUsuarioEnvia,
            "emailUsuarioRecibe": peticion.emailUsuarioRecibe
        };

        gestorBD.insertarAmistad(amigos, function (id) {
            if (id == null) {
                res.redirect("/user/peticiones?message=Error al aceptar la petición de amistad");
            } else {
                eliminarPeticionTrasAceptar(req, res, peticion);
            }
        });
    }

    function eliminarPeticionTrasAceptar(req, res, peticion) {
        var criterio = peticion;

        gestorBD.eliminarPeticion(criterio, function (peticiones) {
            if (peticiones == null) {
                res.redirect("/user/peticiones?message=Usuario agregado como amigo correctamente, pero no se ha podido borrar la invitación de amistad");
            } else {
                gestorLog.usuarioAceptaPeticion(peticion.emailUsuarioRecibe, peticion.emailUsuarioEnvia);

                res.redirect("/user/amigos?message=Usuario agregado como amigo correctamente");
            }
        });
    }

    app.get("/user/rechazar/:id", function (req, res) {
        var criterio = { "_id": gestorBD.mongo.ObjectID(req.params.id) };

        gestorBD.obtenerPeticiones(criterio, function (peticiones) {
            if (peticiones == null) {
                // Error
                res.redirect("/user/peticiones?message=Error al rechazar la petición de amistad");
            } else if (peticiones.length == 0) {
                res.redirect("/user/peticiones?message=Esa petición de amistad no existe");
            } else {
                receptorPeticionRechazar(req, res, peticiones[0]);
            }
        });
    });

    function receptorPeticionRechazar(req, res, peticion) {
        if (peticion.emailUsuarioRecibe != req.session.email) {
            res.redirect("/user/peticiones?message=¡No puedes rechazar una petición de amistad que no te han enviado a ti!");
        } else {
            eliminarPeticionTrasAceptar(req, res, peticion);
        }
    }

}