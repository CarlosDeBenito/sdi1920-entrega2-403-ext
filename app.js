//Modulos
let express = require('express');
let app = express();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, UPDATE, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token");
    // Debemos especificar todas las headers que se aceptan. Content-Type , token
    next();
});


var jwt = require('jsonwebtoken');


let fs = require('fs');
let https = require('https');

let expressSession = require('express-session');
app.use(expressSession({ secret: 'abcdefg', resave: true, saveUninitialized: true }));

let crypto = require('crypto');
let mongo = require('mongodb');
let bodyParser = require('body-parser');
let swig = require('swig');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


let gestorBD = require("./modules/gestorBD.js");
gestorBD.init(app, mongo);

var log4js = require('log4js');

// Configuramos el logger
log4js.configure({
    appenders: {
        out: {
            type: 'stdout',
            layout: { type: 'pattern', pattern: '%[[%d{dd-MM-yyyy hh:mm:ss}] [%p] - %]%m' }
        },
        file: { 	// para la salida a un fichero de log
            type: 'file', filename: 'logs/mySocialNetwork.log',
            layout: { type: 'pattern', pattern: '[%d{dd-MM-yyyy hh:mm:ss}] [%p] - %m' }
        }
    },
    categories: {
        default: { appenders: ['out', 'file'], level: 'debug' }
    }
});
var logger = log4js.getLogger();

var gestorLog = require("./modules/gestorLog.js");
gestorLog.init(app, logger);

var gestorLogApi = require("./modules/gestorLogApi.js");
gestorLogApi.init(app, logger);

//routerUsuarioToken
var routerUsuarioToken = express.Router();
routerUsuarioToken.use(function (req, res, next) {

    // obtener el token, puede ser un parámetro GET , POST o HEADER
    var token = req.body.token || req.query.token || req.headers['token'];

    if (token != null) {
        // verificar el token
        jwt.verify(token, 'secret', function (err, infoToken) {
            if (err || (Date.now() / 1000 - infoToken.tiempo) > 480) {
                res.status(403); // Forbidden
                res.json({
                    access: false,
                    error: 'Token inválido o caducado'
                });
                return;
            } else {
                // dejamos correr la petición
                res.email = infoToken.email;
                next();
            }
        });

    } else {
        res.status(403); // Forbidden
        res.json({
            access: false,
            message: 'No hay Token'
        });
    }
});

// Aplicar routerUsuarioToken
app.use('/api/friend', routerUsuarioToken);
app.use('/api/message', routerUsuarioToken);
app.use('/api/user', routerUsuarioToken);


// routerUsuarioSession
let routerUsuarioSession = express.Router();
routerUsuarioSession.use(function (req, res, next) {
    if (req.session.email) {
        // Si hay un usuario en sesión, dejamos correr la petición
        next();
    } else {
        // Si no, lo redirigimos al login
        res.redirect("/identificarse" +
            "?message=Debes identificarte primero para acceder a esa página.");
    }
});

// Aplicar routerUsuarioSession
app.use("/user", routerUsuarioSession);

app.use(express.static('public'));

//Variables
app.set('port', 8081);
app.set('db', 'mongodb://admin:sdi@sdi-actividad2-1002-shard-00-00-nzw1n.mongodb.net:27017,sdi-actividad2-1002-shard-00-01-nzw1n.mongodb.net:27017,sdi-actividad2-1002-shard-00-02-nzw1n.mongodb.net:27017/test?ssl=true&replicaSet=sdi-actividad2-1002-shard-0&authSource=admin&retryWrites=true&w=majority');
app.set('clave', 'abcdefg');
app.set('crypto', crypto);
app.set('itemsPerPage', 5);
app.set('gestorLog', gestorLog);
app.set('gestorLogApi', gestorLogApi);
app.set('jwt', jwt);

// Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig, gestorBD); // (app, param1, param2, etc.)
require("./routes/rinvitaciones.js")(app, swig, gestorBD); // (app, param1, param2, etc.)
require("./routes/rapi.js")(app, gestorBD);


// Página inicio
app.get('/', function (req, res) {
    var respuesta = swig.renderFile("views/index.html", {
        email: req.session.email
    });
    res.send(respuesta);
});

https.createServer({
    key: fs.readFileSync('certificates/alice.key'),
    cert: fs.readFileSync('certificates/alice.crt')
}, app).listen(app.get('port'), function () {
    console.log("Servidor activo");
});

app.use(function (err, req, res, next) {
    gestorLog.error("Error producido: " + err);
    if (!res.headersSent) {
        res.status(400);
        res.redirect("/error");
    }
});
