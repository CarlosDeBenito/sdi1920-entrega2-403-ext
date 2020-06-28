module.exports = function (app, swig, gestorBD) {

    var gestorLog = app.get('gestorLog');


    app.get("/usuarios", function (req, res) {
        res.send("ver usuarios");
    });

    app.get("/registrarse", function (req, res) {
        let respuesta = swig.renderFile('views/bregistro.html', {});
        res.send(respuesta);
    });

    app.post('/usuario', function (req, res) {
        if (req.body.email == "" || req.body.name == "" || req.body.apellidos == "") {
            res.redirect("/registrarse?message=Hay campos vacios");
        }
        else if (req.body.password != req.body.passwordConfirm || req.body.password == "" || req.body.passwordConfirm == "")
            res.redirect("/registrarse?message=Contraseñas no coinciden o vacias");
        else {
            let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
                .update(req.body.password).digest('hex');
            let usuario = {
                email: req.body.email,
                nombre: req.body.name,
                apellidos: req.body.apellidos,
                password: seguro,
            }
            gestorBD.obtenerUsuarios({ email: usuario.email }, function (usuarios) {
                if (usuarios == null || usuarios.length == 0) {
                    gestorBD.insertarUsuario(usuario, function (id) {
                        if (id == null || usuario.email == null) {
                            res.redirect("/registrarse?message=Error al registrar usuario")

                        } else {
                            res.redirect("/identificarse?message=Usuario registrado");
                            gestorLog.nuevoUsuario(usuario.email);
                        }
                    });
                } else {
                    res.redirect("/registrarse?message=Error al registrar usuario")
                }
            });
        }
    });
    app.get("/identificarse", function (req, res) {
        let respuesta = swig.renderFile('views/bidentificacion.html', {});
        res.send(respuesta);
    });

    app.post("/identificarse", function (req, res) {
        let seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        let criterio = {
            email: req.body.email,
            password: seguro
        }
        gestorBD.obtenerUsuarios(criterio, function (usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                res.redirect("/identificarse?message=Email o contraseña invalidos");
            } else {
                req.session.email = usuarios[0].email;
                res.redirect("/user/list");
                gestorLog.usuarioLogueado(usuarios[0].email);
            }
        });
    });

    app.get("/desconectarse", function (req, res) {
        gestorLog.usuarioDesconectado(req.session.email);
        req.session.email = null;
        res.redirect("/identificarse" +
            "?message=Desconectado correctamente");
    });

    app.get("/user/list", function (req, res) {
        var criterio = {};
        var searchText = req.query.searchText;

        if (searchText != null) {
            criterio = {
                $or: [
                    { "email": { $regex: ".*" + searchText + ".*", $options: "i" } },
                    { "name": { $regex: ".*" + searchText + ".*", $options: "i" } }
                ]
            };
        }

        var pg = parseInt(req.query.pg);
        if (req.query.pg == null || isNaN(pg)) {
            pg = 1;
        }

        gestorBD.obtenerUsuariosPg(criterio, pg, function (usuarios, total) {
            if (usuarios == null) {
                res.redirect("/" +
                    "?message=Error al listar los usuarios");
            } else {

                var itemsPerPage = app.get('itemsPerPage');
                var pgUltima = Math.floor(total / itemsPerPage);
                if (total % itemsPerPage > 0) { // Sobran decimales
                    pgUltima = pgUltima + 1;
                }

                // Añadimos a cada usuario de la lista el atributo "canInvite" con valor true/false
                // Se añade a aquellos usuarios que son el usuario en sesión, para que no les aparezca el botón de enviar invitación
                añadirPosibleInvitacion(usuarios, req.session.email);

                // Lo añadimos al log
                if (searchText != null)
                    gestorLog.usuarioListadoBuscador(req.session.email, searchText, pg, usuarios);
                else
                    gestorLog.usuarioListado(req.session.email, pg, usuarios);

                var respuesta = swig.renderFile('views/user/list.html', {
                    usuarios: usuarios,
                    pgActual: pg,
                    pgUltima: pgUltima,
                    searchText: searchText,
                    email: req.session.email
                });
                res.send(respuesta);
            }
        });

    });

    app.get("/user/amigos", function (req, res) {
        var criterio = {
            $or: [
                { "emailUsuarioEnvia": req.session.email },
                { "emailUsuarioRecibe": req.session.email },
            ]
        };

        // Número de página
        var pg = parseInt(req.query.pg);
        if (req.query.pg == null || isNaN(pg)) {
            pg = 1;
        }

        gestorBD.obtenerAmistadesPg(criterio, pg, function (amigos, total) {
            if (amigos == null) {
                res.redirect("/user/list?message=Error al listar los amigos.");
            } else {

                var itemsPerPage = app.get('itemsPerPage');
                var pgUltima = Math.floor(total / itemsPerPage);
                if (total % itemsPerPage > 0) { // Sobran decimales
                    pgUltima = pgUltima + 1;
                }

                obtenerEmailsAmigos(req, res, amigos, pg, pgUltima);
            }
        });
    });


    function añadirPosibleInvitacion(usuarios, emailUsuarioSesion) {
        usuarios.forEach(function (usuarioSesion) {
            // No se puede invitar a un usuario si es el mismo que el usuario en sesion
            if (usuarioSesion.email == emailUsuarioSesion)
                usuarioSesion.puedeInvitar = false;
            else
                usuarioSesion.puedeInvitar = true;
        });
    }


    function obtenerEmailsAmigos(req, res, amigos, pg, pgUltima) {
        amigosEmails = [];

        amigos.forEach(function (amigoActual) {
            if (amigoActual.emailUsuarioEnvia != req.session.email)
                amigosEmails.push(amigoActual.emailUsuarioEnvia);
            else
                amigosEmails.push(amigoActual.emailUsuarioRecibe);
        });

        obtenerAmigosConEsosEmails(req, res, amigosEmails, pg, pgUltima);
    }

    function obtenerAmigosConEsosEmails(req, res, amigosEmails, pg, pgUltima) {
        var criterio = { "email": { "$in": amigosEmails } };

        gestorBD.obtenerUsuarios(criterio, function (amigos) {
            if (amigos == null) {
                res.redirect("/user/list?message=Error al listar los amigos.");
            } else {
                gestorLog.usuarioListaAmigos(req.session.email, pg, amigosEmails);

                var respuesta = swig.renderFile('views/user/amigos.html', {
                    amigos: amigos,
                    pgActual: pg,
                    pgUltima: pgUltima,
                    email: req.session.email
                });
                res.send(respuesta);
            }
        });
    }
};