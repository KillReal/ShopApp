import { type } from "os";

var http = require('http');
var path = require('path');
var sha1 = require('sha1');
const Sequelize = require('sequelize')
const querystring = require('querystring')
var mime = require('mime-types')
var ejs = require("ejs");
const sequelize = new Sequelize('postgres://postgres:123@localhost:5432/webSite', {
    logging: false
});

sequelize
.authenticate()
.then(() => {
    console.log('Connection has been established successfully.');
})
.catch((err: any) => {
    console.error('Unable to connect to the database:', err);
});


function parseCookies(str :any) 
{
    let rx = /([^;=\s]*)=([^;]*)/g;
    let obj: any = { };
    for ( let m ; m = rx.exec(str) ; )
      obj[ m[1] ] = decodeURIComponent( m[2] );
    return obj;
}

const User = sequelize.define('User', {
    email: {
        type: Sequelize.STRING
    },
    password: {
        type: Sequelize.STRING
    },
    cookie: {
        type: Sequelize.STRING
    },
    cookieExpire: {
        type: Sequelize.DATE
    }
}, {
    
});

const Product = sequelize.define('Product', {
    imgUrl: { 
        type: Sequelize.STRING
    },
    name: {
        type: Sequelize.STRING
    },
    description: {
        type: Sequelize.STRING
    },
    price: {
        type: Sequelize.INTEGER
    },
    discontPrice: {
        type: Sequelize.INTEGER
    },
    inStock: {
        type: Sequelize.INTEGER
    }
}, {
    
});

const Cart = sequelize.define('Cart', {
    productCount: {
        type: Sequelize.INTEGER
    },
    isPurchased: {
        type: Sequelize.BOOLEAN
    }
}, {

});

const Feedback = sequelize.define('Feedback', {
    name: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING
    },
    message: {
        type: Sequelize.STRING
    }
}, {

});

const ProductList = sequelize.define('ProductList', {
    productCount: {
        type: Sequelize.INTEGER
    }
}, {

});

User.hasMany(Cart);
Cart.belongsTo(User);
Product.hasMany(ProductList);
ProductList.belongsTo(Product);
Cart.hasMany(ProductList);
ProductList.belongsTo(Cart);
User.hasMany(Feedback);
Feedback.belongsTo(User);

User.sync();
Product.sync();
Cart.sync();
ProductList.sync();
Feedback.sync();

function readRequestData(request: any): any
{
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (buffer: any) => {
            body += buffer;
        });
        request.on('end', () => {
            resolve(querystring.decode(body));
        });  
    })
}

function redirectTo(response :any, url: string)
{
    response.statusCode = 302;
    response.setHeader('Location', url);
    response.end();
}

async function getUserByCookies(cookies: any)
{
    if (cookies["login"] != undefined )
    {
        return await User.findOne({where: {cookie: cookies["login"]}})
    }
    return null;                  
}

async function getCartByCookies(cookies: any) 
{
    var user = await User.findOne({where: {cookie: cookies["login"]}});
    return await Cart.findOne({where: {userId: user.id}});
}

async function getCartByUser(user :any) 
{
    var cart = await Cart.findOne({where: {UserId: user.id, isPurchased: false}});
    if (cart == undefined)
    {
        cart = await Cart.create({UserId: user.id, productCount: 0, isPurchased: false}, {where: {userId: user.id}});
        console.log("For user (" + user.name + ") created new cart");
    }
    return cart;
}

http.createServer(async function (request: any, response: any) {
    var filePath = './views' + request.url;
    if (request.url == "/")
    {
        filePath += "index";
    }
    filePath += ".html";
    var url = require('url').parse(request.url, true);
    console.log('request ', url.pathname);
    let cookies = parseCookies( request.headers.cookie );
    if (request.method == "GET")
    {
        var data;
        if (url.pathname == "/" || url.pathname == "/index")
        {
            try {
                var productlist = await Product.findAll({limit: 3})
                let user = await getUserByCookies(cookies);
                let products = await Product.findAll({limit: 3});
                let cartCount = 0;
                if (user != null)
                {
                    var cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: products, cart: cartCount};
            }
            catch (error) {
                console.log("Failed to load products (" + error + ")");
            }
        }
        else if (url.pathname == "/login")
        {
            data = {empty: 0};
            let user = await getUserByCookies(cookies);
            if (user != null)
            {
                const products = await Product.findAll({limit: 3});
                var cart = await getCartByUser(user);
                data = {products: products, cart: cart.productCount};
                redirectTo(response, "/index");
                return;
            }
            data = {products: products, cart: 0, isLogin: true};
        }
        else if (url.pathname == "/registration")
        {
            filePath = "views/login.html";
            data = {products: products, cart: 0, isLogin: false};
        }
        else if (url.pathname == "/products"){
            try {
                await Product.findAll().then(async function(productlist :any) {
                    let user = await getUserByCookies(cookies)
                    let cartCount = 0;
                    if (user != undefined )
                    {
                        await Cart.findOne({where: {UserId: user.id}}).then(function (cart :any) {
                            cartCount = cart.productCount;
                        })
                    }
                    data = {products: productlist, cart: cartCount};
                });
            }
            catch (error) {
                console.log("Failed to load products (" + error + ")");
            }
        }
        else if (url.pathname == "/cart"){
            try {
                let user = await getUserByCookies(cookies);
                if (user != undefined) {
                    var cart = await getCartByUser(user);
                    var products = await ProductList.findAll({where: {CartId: cart.id}, include: Product});
                    var total = 0;
                    products.forEach(function (product :any)
                    {
                        total = total + product.Product.price * product.productCount;
                    });
                    data = {productlists: products, totalprice: total, cart: cart.productCount};
                    filePath = "./views/cart.html"
                }
                else
                {
                    redirectTo(response, "/login");
                    return;
                }
            }
            catch (error) {
                console.log("Failed to load cart products (" + error + ")");
            }
        }
        //console.log("filepath = " + filePath);
        //console.log("data: " + JSON.stringify(data));
        var html;
        if (data == undefined) {
            ejs.renderFile("views/404.html", {empty: 0}, function(error :any, content :any){
                html = content;
            });
        }
        else { 
            ejs.renderFile(filePath, data, function(error :any, content :any){
                html = content;
            });
        }
        response.end(html, "utf-8");
    }
    else if (request.method == "POST")
    {
        if (url.pathname == "/")
        {
            let data = await readRequestData(request);
            try {
                const emailToValidate = 'a@a.com';
                const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                if (!emailRegexp.test(emailToValidate)) {
                    response.writeHead(403);
                    response.end("incorrect email");   
                }
                else {
                    await Feedback.create({name: data.name.toString(), email: data.email.toString(), message: data.message.toString()});
                }
            }
            catch (error) {
                console.log("Failed to send feedback (" + error + ")");
            }
        }
        if (url.pathname == "/plusToCart")
        {
            let data = await readRequestData(request);
            try {
                var user = await getUserByCookies(cookies);
                if (user != undefined)
                {
                    var cart = await getCartByUser(user);
                    var productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}, include: Product});
                    if (productList.Product.inStock - 1 >= productList.productCount)
                    {
                        await ProductList.update({productCount: productList.productCount + 1}, {where: {CartId: cart.id, ProductId: data.productId}});  
                        await Cart.update({productCount: cart.productCount + 1},{where: {id: cart.id}})    
                        response.writeHead(200);
                        response.end("cart updated");
                    }
                    else {
                        response.writeHead(403);
                        response.end("product out of stock");
                    }
                }
                else {
                    redirectTo(response, "/login");
                }
            }
            catch (error) {
                console.log("Failed add to cart (" + error + ")");
            }
        }
        if (url.pathname == "/minusFromCart")
        {
            let data = await readRequestData(request);
            try {
                var user = await User.findOne({where: {cookie: cookies["login"]}});
                if (user != undefined)
                {
                    var cart = await Cart.findOne({where: {UserId: user.id}})
                    var productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    if (productList.productCount > 0)
                    {
                        if (productList.productCount == 1){
                            await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}})
                            await Cart.update({productCount: cart.productCount - 1},{where: {id: cart.id}}) 
                            console.log("product removed form cart"); 
                        }
                        else {
                            await ProductList.update({productCount: productList.productCount - 1}, {where: {CartId: cart.id, ProductId: data.productId}});  
                            await Cart.update({productCount: cart.productCount - 1},{where: {id: cart.id}})  
                            console.log("cart updated"); 
                        }
                         
                    }
                    response.writeHead(200);
                    response.end("cart updated");    
                }
                else {
                    redirectTo(response, "/login");
                }
            }
            catch (error) {
                console.log("Failed to minus from cart (" + error + ")");
            }
        }
        if (url.pathname == "/deleteFromCart")
        {
            let data = await readRequestData(request);
            try {
                var user = await getUserByCookies(cookies);
                if (user != undefined)
                {
                    var cart = await getCartByUser(user);
                    var productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}});  
                    await Cart.update({productCount: cart.productCount - productList.productCount},{where: {id: cart.id}})    
                    response.writeHead(200);
                    response.end("cart updated");    
                }
                else {
                    redirectTo(response, "/login");
                }
            }
            catch (error) {
                console.log("Failed to remove from cart (" + error + ")");
            }
        }
        if (url.pathname == "/addInCart")
        {
            let data = await readRequestData(request);
            try {
                var user = await getUserByCookies(cookies);    
                if (user != undefined)
                {
                    var cart = await getCartByUser(user);
                    var productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}})
                    if (productList != null)
                    {
                        await ProductList.update({productCount: productList.productCount + 1}, {where: { id: productList.id}});
                        await Cart.update({productCount: cart.productCount + 1}, {where: {UserId: user.id}})
                        response.writeHead(200);
                    }
                    else
                    {
                        var productlist = await ProductList.create({ProductId: data.productId, productCount: 1, CartId: cart.id});
                        await Cart.update({ProductListId: productlist.id, productCount: cart.productCount + 1}, {where: {UserId: user.id}});
                        response.writeHead(200);
                    }       
                    console.log("cart updated");         
                }
                else {
                    redirectTo(response, "/login");
                }
            }
            catch (error) {
                console.log("Failed to add in cart (" + error + ")");
            }   
        }
        if (url.pathname == "/registration")
        {
            let data = await readRequestData(request);
            try {
                await User.create({email: data.email.toString(), password: data.password.toString()});
            }
            catch (error) {
                console.log("Failed to registrate (" + error + ")");
            }
        }
        if (url.pathname == "/login")
        {
            let user = await getUserByCookies(cookies);
            if (user != undefined)
            {
                redirectTo(response, "/index");
            }
            else {
                let data = await readRequestData(request);
                try {
                    user = await User.findOne({where: {email: data.email, password: data.password}});
                    if (user != null)
                    {
                        var date = new Date();
                        var cookieTimeout = 1000;
                        date = new Date(date.getTime() + cookieTimeout * 1000);
                        var hash = sha1(user.name + Date.now().toString() + user.password);
                        await User.update({cookie: hash, cookieExpire:  date}, {where: {email: data.email.toString(), password: data.password.toString()}});
                        response. setHeader('Set-Cookie','login=' + hash +'; Max-Age=' + cookieTimeout +'; HttpOnly, Secure');
                        response.writeHead(301, {Location: '/index'} );
                        response.end("Success");
                        console.log("User logged in successfully (" + user.name + ")");
                    }
                    else
                    {
                        response.writeHead(403);
                        response.end("login fail");
                        console.log("User login fail  (" + data.email.toString() + ")");
                    } 
                }
                catch (error) {
                    console.log("Failed to authentificate (" + error + ")");
                }
            }
        }
    }

}).listen(8125);
console.log('Server running at http://127.0.0.1:8125/');