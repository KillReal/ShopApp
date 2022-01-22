"use strict";
var http = require('http');
var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var mime = require('mime-types');
var sequelize = new Sequelize('postgres://postgres:123@localhost:5432/webSite');
sequelize
    .authenticate()
    .then(function () {
    console.log('Connection has been established successfully.');
})
    .catch(function (err) {
    console.error('Unable to connect to the database:', err);
});
var User = sequelize.define('user', {
    firstName: {
        type: Sequelize.STRING
    },
    lastName: {
        type: Sequelize.STRING
    }
}, {});
User.sync({ force: true });
http.createServer(function (request, response) {
    console.log('request ', request.url);
    var filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './index.html';
    }
    else if (filePath == "./about") {
        filePath = "./views/about.html";
        try {
            var newUser = new User(2);
            newUser.lastName = "Пупкин";
            newUser.firstName = "Вася";
            newUser.save();
            response.json({ user: newUser }); // Returns the new user that is created in the database
        }
        catch (error) {
            console.error(error);
        }
    }
    var extname = String(path.extname(filePath)).toLowerCase();
    var contentType = 'text/html';
    contentType = mime.lookup(extname) || 'text/html';
    fs.readFile(filePath, function (error, content) {
        if (error) {
            if (error.code == 'ENOENT') {
                fs.readFile('./404.html', function (_error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
}).listen(8125);
console.log('Server running at http://127.0.0.1:8125/');
