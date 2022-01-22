import {Cart, Product, ProductList, getCartByUser, Feedback, User} from "./models";
import {getUserByCookies, parseCookies} from "./tools";
import querystring from "querystring";
import { encrypt, decrypt }  from "./encryption";

const ejs = require("ejs");
const sha1 = require('sha1');

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

export async function HandleGetRequest(request :any, response: any)
{
    let filePath = './views' + request.url;
    if (request.url == "/")
    {
        filePath += "index";
    }
    filePath += ".html";
    let url = require('url').parse(request.url, true);
    console.log('request ', url.pathname);
    let cookies = parseCookies( request.headers.cookie );
    let data, productList;
    if (url.pathname == "/" || url.pathname == "/index") {
        try {
            let user = await getUserByCookies(cookies);
            let products = await Product.findAll({limit: 3});
            let cartCount = 0;
            if (user != null) {
                let cart = await getCartByUser(user);
                cartCount = cart.productCount;
            }
            data = {products: products, cart: cartCount};
        } catch (error) {
            console.log("Failed to load products (" + error + ")");
        }
    } else if (url.pathname == "/login") {
        data = {empty: 0};
        let user = await getUserByCookies(cookies);
        if (user != null) {
            productList = await Product.findAll({limit: 3});
            let cart = await getCartByUser(user);
            data = {products: productList, cart: cart.productCount};
            redirectTo(response, "/index");
            return;
        }
        data = {products: productList, cart: 0, isLogin: true};
    } else if (url.pathname == "/registration") {
        filePath = "views/login.html";
        data = {products: productList, cart: 0, isLogin: false};
    } else if (url.pathname == "/products") {
        try {
            await Product.findAll().then(async function (productlist: any) {
                let user = await getUserByCookies(cookies)
                let cartCount = 0;
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: productlist, cart: cartCount};
            });
        } catch (error) {
            console.log("Failed to load products (" + error + ")");
        }
    } else if (url.pathname == "/cart") {
        try {
            let user = await getUserByCookies(cookies);
            if (user != undefined) {
                let cart = await getCartByUser(user);
                let products = await ProductList.findAll({where: {CartId: cart.id}, include: Product});
                let total = 0;
                products.forEach(function (product: any) {
                    total = total + product.Product.price * product.productCount;
                });
                data = {productlists: products, totalprice: total, cart: cart.productCount};
                filePath = "./views/cart.html"
            } else {
                redirectTo(response, "/login");
                return;
            }
        } catch (error) {
            console.log("Failed to load cart products (" + error + ")");
        }
    }
    //console.log("filepath = " + filePath);
    //console.log("data: " + JSON.stringify(data));
    let html;
    if (data == undefined) {
        ejs.renderFile("views/404.html", {empty: 0}, function (error: any, content: any) {
            html = content;
        });
    } else {
        ejs.renderFile(filePath, data, function (error: any, content: any) {
            html = content;
        });
    }
    response.end(html, "utf-8");
}

export async function HandlePostRequest(request :any, response: any)
{
    let url = require('url').parse(request.url, true);
    console.log('request ', url.pathname);
    let cookies = parseCookies( request.headers.cookie );
    let data = await readRequestData(request);
    let user = await getUserByCookies(cookies);
    let errorMessage = "Error occured";
    try {
        switch (url.pathname)
        {
            case "/":
                errorMessage = "Failed to send feedback";
                const emailToValidate = 'a@a.com';
                const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                if (!emailRegexp.test(emailToValidate)) {
                    response.writeHead(403);
                    response.end("Неверный e-mail");
                } else {
                    await Feedback.create({
                        name: data.name.toString(),
                        email: data.email.toString(),
                        message: data.message.toString()
                    });
                }
                break;
            case "/order":
                errorMessage = "Failed to order";
                let isFail = false;
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findAll({
                        where: {CartId: cart.id},
                        include: Product
                    });
                    await productList.forEach(async function (product: any, index: any) {
                        if (product.productCount > product.Product.inStock)
                        {
                            isFail = true;
                            await ProductList.update({productCount: product.Product.inStock}, {where: {id: product.id}})
                        }
                    });
                    if (isFail)
                    {
                        response.writeHead(302);
                        response.end("Некоторых товаров не оказалось на складе");
                    }
                    else
                    {
                        await Cart.update({isPurchased: true, Date: Date.now().toString()}, {where: {id: cart.id}})
                        await productList.forEach(async function (product: any, index: any) {
                            Product.update({inStock: product.Product.inStock - product.productCount, orderCount: product.Product.orderCount + product.productCount}, 
                                {where: {id: product.Product.id}});
                        });
                        response.writeHead(201);
                        response.end("Заказ оформлен");
                    }
                }
                else {
                    redirectTo(response, "/login");
                }
                break;
            case "/plusToCart":
                errorMessage = "Failed add to cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({
                        where: {CartId: cart.id, ProductId: data.productId},
                        include: Product
                    });
                    if (productList.Product.inStock - 1 >= productList.productCount) {
                        await ProductList.update({productCount: productList.productCount + 1}, {
                            where: {
                                CartId: cart.id,
                                ProductId: data.productId
                            }
                        });
                        await Cart.update({productCount: cart.productCount + 1}, {where: {id: cart.id}})
                        response.writeHead(201);
                        response.end("Товар добавлен в корзину");
                    } else {
                        response.writeHead(301);
                        response.end("Запасы товара исчерпаны");
                    }
                } else {
                    redirectTo(response, "/login");
                }
                break;
            case "/minusFromCart":
                errorMessage = "Failed to minus from cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    if (productList.productCount > 0) {
                        if (productList.productCount == 1) {
                            await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}})
                            await Cart.update({productCount: cart.productCount - 1}, {where: {id: cart.id}})
                        } else {
                            await ProductList.update({productCount: productList.productCount - 1}, {
                                where: {
                                    CartId: cart.id,
                                    ProductId: data.productId
                                }
                            });
                            await Cart.update({productCount: cart.productCount - 1}, {where: {id: cart.id}})
                        }
                        console.log("Товар убран из корзины");
                    }
                    response.writeHead(201);
                    response.end("Товар убран из корзины");
                } else {
                    redirectTo(response, "/login");
                }
                break;
            case "/deleteFromCart":
                errorMessage = "Failed to remove from cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}});
                    await Cart.update({productCount: cart.productCount - productList.productCount}, {where: {id: cart.id}})
                    response.writeHead(201);
                    response.end("Товар убран из корзины");
                } else {
                    redirectTo(response, "/login");
                }
                break;
            case "/addInCart":
                errorMessage = "Failed to add in cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}, include: Product});
                    let product = await Product.findOne({where: {id: data.productId}})
                    if (product.inStock - 1 >= 0)
                    {
                        if (productList != null) {
                            if (productList.Product.inStock - 1 >= productList.productCount)
                            {
                                await ProductList.update({productCount: productList.productCount + 1}, {where: {id: productList.id}});
                                await Cart.update({productCount: cart.productCount + 1}, {where: {UserId: user.id}})
                                response.writeHead(201);
                                response.end("Товар добавлен в корзину");
                            }
                            else
                            {
                                response.writeHead(301);
                                response.end("Запасы товара исчерпаны");
                            }
                        } else {
                            productList = await ProductList.create({
                                ProductId: data.productId,
                                productCount: 1,
                                CartId: cart.id
                            });
                            await Cart.update({
                                ProductListId: productList.id,
                                productCount: cart.productCount + 1
                            }, {where: {UserId: user.id}});
                            response.writeHead(201);
                            response.end("Товар добавлен в корзину");
                        }
                        console.log("cart updated");
                    }
                    else {
                        response.writeHead(301);
                        response.end("Запасы товара исчерпаны");
                    }
                } else {
                    redirectTo(response, "/login");
                }
                break;
            case "/registration":
                errorMessage = "Failed to registrate";
                let emailHash = encrypt(data.email.toString());
                let passwordHash = encrypt(data.password.toString());
                await User.create({email: emailHash.content, password: passwordHash.content});
                break;
            case "/login":
                errorMessage = "Failed to authentificate";
                if (user != undefined) {
                    redirectTo(response, "/index");
                } else {
                    let emailHash = encrypt(data.email.toString());
                    let passwordHash = encrypt(data.password.toString());
                    user = await User.findOne({where: {email: emailHash.content, password: passwordHash.content}});
                    if (user != null) {
                        let date = new Date();
                        const cookieTimeout = 1000;
                        date = new Date(date.getTime() + cookieTimeout * 1000);
                        let hash = sha1(user.name + Date.now().toString() + user.password);
                        await User.update({cookie: hash, cookieExpire: date}, {
                            where: {
                                email: emailHash.content,
                                password: passwordHash.content
                            }
                        });
                        response.setHeader('Set-Cookie', 'login=' + hash + '; Max-Age=' + cookieTimeout + '; HttpOnly, Secure');
                        response.writeHead(301, {Location: '/index'});
                        response.end("Success");
                        console.log("User logged in successfully (" + user.name + ")");
                    } else {
                        response.writeHead(377);
                        response.end("login fail");
                        console.log("User login fail  (" + data.email.toString() + ")");
                    }
                }
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
    }
}