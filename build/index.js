"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("./models");
const router_1 = require("./router");
const http = require('http');
models_1.User.hasMany(models_1.Cart);
models_1.Cart.belongsTo(models_1.User);
models_1.Product.hasMany(models_1.ProductList);
models_1.ProductList.belongsTo(models_1.Product);
models_1.Cart.hasMany(models_1.ProductList);
models_1.ProductList.belongsTo(models_1.Cart);
models_1.User.hasMany(models_1.Feedback);
models_1.Feedback.belongsTo(models_1.User);
models_1.User.hasMany(models_1.Order);
models_1.Order.belongsTo(models_1.Cart);
models_1.User.sync();
models_1.Product.sync();
models_1.Cart.sync();
models_1.ProductList.sync();
models_1.Feedback.sync();
models_1.Order.sync();
http.createServer(async function (request, response) {
    switch (request.method) {
        case "GET":
            await router_1.HandleGetRequest(request, response);
            break;
        case "POST":
            await router_1.HandlePostRequest(request, response);
            break;
    }
}).listen(8125);
console.log('Server running at http://127.0.0.1:8125/');
//# sourceMappingURL=index.js.map