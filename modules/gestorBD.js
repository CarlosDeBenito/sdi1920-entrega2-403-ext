module.exports = {
    mongo: null, app: null,
    init: function (app, mongo) {
        this.mongo = mongo;
        this.app = app;
    }, obtenerUsuarios: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                let collection = db.collection('usuarios');
                collection.find(criterio).toArray(function (err, usuarios) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(usuarios);
                    }
                    db.close();
                });
            }
        });
    }, insertarUsuario: function (usuario, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null, "Error al crear el usuario");
            } else {
                let collection = db.collection('usuarios');
                collection.insert(usuario, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    }, obtenerUsuariosPg: function (criterio, pg, funcionCallback) {
        var itemsPerPage = this.app.get('itemsPerPage');

        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('usuarios');
                collection.count(criterio, function (err, count) {
                    if (err) {
                        funcionCallback(null);
                        db.close();
                    } else {
                        collection.find(criterio).skip((pg - 1) * itemsPerPage).limit(itemsPerPage)
                            .toArray(function (err, usuarios) {

                                if (err) {
                                    funcionCallback(null);
                                } else {
                                    funcionCallback(usuarios, count);
                                }
                                db.close();
                            });
                    }
                });
            }
        });
    },

    obtenerAmistades: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.find(criterio).toArray(function (err, amistades) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(amistades);
                    }
                    db.close();
                });
            }
        });
    },
    obtenerAmistadesPg: function (criterio, pg, funcionCallback) {
        var itemsPerPage = this.app.get('itemsPerPage');

        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.count(criterio, function (err, count) {
                    if (err) {
                        funcionCallback(null);
                        db.close();
                    } else {
                        collection.find(criterio).skip((pg - 1) * itemsPerPage).limit(itemsPerPage)
                            .toArray(function (err, amistades) {

                                if (err) {
                                    funcionCallback(null);
                                } else {
                                    funcionCallback(amistades, count);
                                }
                                db.close();
                            });
                    }
                });
            }
        });
    },
    enviarPeticion: function (peticion, funcionCallback) {
        var propio = this;

        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null, "Error al mandar petición"); // ERROR
            } else {
                propio.existeUsuarioEnviadoPeticion(db, peticion, funcionCallback); // SIGUIENTE
            }
        });
    },

    existeUsuarioEnviadoPeticion: function (db, peticion, funcionCallback) {
        var propio = this;

        var collection = db.collection('usuarios');
        collection.find({ "email": peticion.emailUsuarioRecibe }).toArray(function (err, usuarios) {
            if (err) {
                // Si se produjo un error, devolvemos error
                funcionCallback(null, "Error al enviar la petición"); // ERROR
                db.close();
            } else if (usuarios.length == 0) {
                // Si el usuario NO existe, devolvemos error
                funcionCallback(null, "Error al enviar la petición, no existe ese usuario"); // ERROR
                db.close();
            } else {
                propio.existePeticionPrevia(db, peticion, funcionCallback); // SIGUIENTE
            }
        });
    },

    existePeticionPrevia: function (db, peticion, funcionCallback) {
        var propio = this;

        // Comprobamos que no exista ya esa invitación
        var collection = db.collection('peticiones');
        collection.find(peticion).toArray(function (err, peticiones) {
            if (err) {
                // Si se produjo un error, devolvemos error
                funcionCallback(null, "Error al enviar la petición"); // ERROR
                db.close();
            } else if (peticiones.length == 1) {
                // Si ya existe la invitación, devolvemos error
                funcionCallback(null, "Error al enviar la petición, ya ha sido enviada previamente"); // ERROR
                db.close();
            } else {
                propio.peticionDelOtroUsuario(db, peticion, funcionCallback); // SIGUIENTE
            }
        });
    },

    peticionDelOtroUsuario: function (db, peticion, funcionCallback) {
        var propio = this;

        // Comprobamos que no exista la invitacion inversa
        // (que el usuario al que le quieres enviar una invitación ya te haya enviado una a ti)
        var criterio = {
            "emailUsuarioRecibe": peticion.emailUsuarioEnvia,
            "emailUsuarioEnvia": peticion.emailUsuarioRecibe
        };

        var collection = db.collection('peticiones');
        collection.find(criterio).toArray(function (err, invitations) {
            if (err) {
                // Si se produjo un error, devolvemos error
                funcionCallback(null, "Error al enviar la petición"); // ERROR
                db.close();
            } else if (invitations.length == 1) {
                // Si existe la invitación inversa, devolvemos error
                funcionCallback(null, "Te ha mandado una petición, revisa tus peticiones"); // ERROR
                db.close();
            } else {
                propio.noAmigos(db, peticion, funcionCallback); // SIGUIENTE
            }
        });
    },

    noAmigos: function (db, peticion, funcionCallback) {
        var propio = this;

        // Comprobamos que no sean amigos
        var criterio = {
            $or: [
                { "emailUsuarioEnvia": peticion.emailUsuarioEnvia, "emailUsuarioRecibe": peticion.emailUsuarioRecibe },
                { "emailUsuarioRecibe": peticion.emailUsuarioEnvia, "emailUsuarioEnvia": peticion.emailUsuarioRecibe }
            ]
        };

        var collection = db.collection('amigos');
        collection.find(criterio).toArray(function (err, amigos) {
            if (err) {
                // Si se produjo un error, devolvemos error
                funcionCallback(null, "Error al enviar la petición"); // ERROR
                db.close();
            } else if (amigos.length == 1) {
                // Si ya existe la amistad, devolvemos error
                funcionCallback(null, "Error al enviar la peticion, ya sois amigos"); // ERROR
                db.close();
            } else {
                propio.enviandoPeticion(db, peticion, funcionCallback); // SIGUIENTE
            }
        });
    },

    enviandoPeticion: function (db, peticion, funcionCallback) {

        // Guardamos la invitacion
        var collection = db.collection('peticiones');
        collection.insert(peticion, function (err, result) {
            if (err) {
                funcionCallback(null, "Error al enviar la petición"); // ERROR
            } else {
                funcionCallback(result.ops[0]._id); // FIN
            }
            db.close();
        });
    },

    obtenerPeticionesPg: function (criterio, pg, funcionCallback) {
        var itemsPerPage = this.app.get('itemsPerPage');

        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('peticiones');
                collection.count(criterio, function (err, count) {
                    if (err) {
                        funcionCallback(null);
                        db.close();
                    } else {
                        collection.find(criterio).skip((pg - 1) * itemsPerPage).limit(itemsPerPage)
                            .toArray(function (err, peticiones) {

                                if (err) {
                                    funcionCallback(null);
                                } else {
                                    funcionCallback(peticiones, count);
                                }
                                db.close();
                            });
                    }
                });
            }
        });
    },
    obtenerPeticiones: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('peticiones');
                collection.find(criterio).toArray(function (err, peticiones) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(peticiones);
                    }
                    db.close();
                });
            }
        });
    },

    eliminarPeticion: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('peticiones');
                collection.remove(criterio, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    },

    insertarAmistad: function (friendship, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.insert(friendship, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },

    insertarMensaje: function (mensaje, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('mensajes');
                collection.insert(mensaje, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    obtenerMensajes: function (criterio, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('mensajes');
                collection.find(criterio).toArray(function (err, messages) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(messages);
                    }
                    db.close();
                });
            }
        });
    },
    actualizarMensajes: function (criterio, message, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function (err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('mensajes');
                collection.update(criterio, { $set: message }, function (err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result);
                    }
                    db.close();
                });
            }
        });
    }
};