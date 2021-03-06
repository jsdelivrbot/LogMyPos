const createHandler = require('azure-function-express').createHandler;
const context = require('aws-lambda-mock-context');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const config = require('./auth/config');
const messenger = require('./messenger');
const logger = require('./logger');
const lambda = require('./alexa');

const app = express();
const port = process.env.PORT || config.local_port;
const fs = require('fs');

const sslOptions = {
	key: fs.readFileSync('./auth/ssl/private-key.pem'),
	cert: fs.readFileSync('./auth/ssl/certificate.pem')
};

app.use(session({secret: 'LogmyposSecret', cookie:{}}));
app.use('/alexa', bodyParser.json({type: 'application/json'}));
app.use('/sms', bodyParser.urlencoded({type: 'application/x-www-form-urlencoded'}));
app.use(function (req,res,next) {
	console.log(JSON.stringify(req.body));
	console.log(req);
	next();
});


app.post('/sms', function(req, res) {
    console.log("Twillo message retrieved");
    if(req.body && req.body.Body) {
        let resp = messenger.respondData(req.body.Body);
	console.log(resp);
        let twiml = new twilio.twiml.MessagingResponse();
        twiml.message(resp);
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
    } else {
        res.send(401);
    }
});

app.post('/alexa', function(req,res) {
    let ctx = context();

    lambda.handler(req.body, ctx);

    ctx.Promise.then((resp) => {
        return res.status(200).json(resp);
    }).catch((err) => {
        console.log(err);
    });

});

app.get('/heart', function(req,res) {
	res.send('hello world');
});



if(config.build_locally) {
    const https = require('https');
    https.createServer(sslOptions, app).listen(config.local_port, function() {
        console.log("Express server listening on port " + config.local_port);
    });
} else {
    module.exports = app;
}
