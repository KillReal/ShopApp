import {Cart, Feedback, Product, ProductList, User, Order} from "./models";
import {HandleGetRequest, HandlePostRequest} from "./router";

import http = require('http');

User.hasMany(Cart);
Cart.belongsTo(User);
Product.hasMany(ProductList);
ProductList.belongsTo(Product);
Cart.hasMany(ProductList);
ProductList.belongsTo(Cart);
User.hasMany(Feedback);
Feedback.belongsTo(User);
User.hasMany(Order);
Order.belongsTo(Cart);

User.sync();
Product.sync();
Cart.sync();
ProductList.sync();
Feedback.sync();
Order.sync();

const PORT = 8125;

http.createServer(async function (request: any, response: any): Promise<any> {
    switch (request.method)
    {
        case "GET": await HandleGetRequest(request, response); break;
        case "POST": await HandlePostRequest(request, response); break;
    }

}).listen(PORT);
console.log('Server running at http://127.0.0.1:' + PORT + '/');