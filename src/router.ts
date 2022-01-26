import {Cart, Feedback, getCartByUser, Product, ProductList, User} from "./models";
import {checkEmail, parseCookies, renderPage} from "./tools";
import querystring from "querystring";
import {decrypt, encrypt} from "./encryption";
import {authentificateUser, verifyUser} from "./Authentification";
import {HandleGetRequest as HandleAdminGetRequest, HandlePostRequest as HandleAdminPostRequest} from "./adminRouter";

export function readRequestData(request: any): any
{
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (buffer: any) => {
            body += buffer;
        });
        request.on('end', () => {
            let type = request.headers['content-type'];
            if (type.split(';')[0] == "application/x-www-form-urlencoded")
            {
                resolve(querystring.decode(body));
            }
            else
            {
                resolve(body)
            }
        });
    })
}

export function redirectTo(response :any, url: string)
{
    response.statusCode = 302;
    response.setHeader('Location', url);
    response.end();
}

export function getFilePath(url :any)
{
    let filePath = './views' + url;
    if (url == "/")
    {
        filePath += "index";
    }
    return filePath += ".html";
}

export async function HandleGetRequest(request :any, response: any)
{
    let cookies = parseCookies( request.headers.cookie );
    let url = require('url').parse(request.url, true);
    console.log('GET ', url.pathname);
    let user = await verifyUser(cookies)
    if (/^\/admin.*/.test(url.pathname))
    {
        await HandleAdminGetRequest(request, response, user);
        return;
    }
    let filePath = getFilePath(request.url);
    let data, productList, cartCount;
    data = {empty: 0};
    cartCount = 0;
    let errorMessage;
    try {
        switch (url.pathname) {
            case "/":
            case "/index":
                errorMessage = "Failed to load products";
                let products = await Product.findAll({limit: 3});
                if (user != null) {
                    let cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: products, cart: cartCount};
                break;
            case "/login":
                if (user != null) {
                    productList = await Product.findAll({limit: 3});
                    let cart = await getCartByUser(user);
                    data = {products: productList, cart: cart.productCount};
                    redirectTo(response, "/index");
                    return;
                }
                data = {products: productList, cart: 0, isLogin: true};
                break;
            case "/unlogin":
                if (user != null) {
                    await User.update({cookie: "", cookieExpire: null}, {where: {id: user.id}})
                    console.log("User " + decrypt(user.email) + " logged off")
                }
                redirectTo(response, "/index")
                break;
            case "/registration":
                filePath = "views/login.html";
                data = {products: productList, cart: 0, isLogin: false};
                break;
            case "/products":
                errorMessage = "Failed to load products";
                productList = await Product.findAll()
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: productList, cart: cartCount};
                break;
            case "/profile":
                errorMessage = "Failed to load profile"
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    data = {cart: cart.productCount, email: decrypt(user.email), isAdmin: user.role.match("admin")};
                    filePath = "./views/profile.html"
                } else {
                    redirectTo(response, "/login");
                    return;
                }
                break;
            case "/cart":
                errorMessage = "Failed to load cart products";
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
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
    }
    response.end(renderPage(filePath, data), "utf-8");
}

export async function HandlePostRequest(request :any, response: any)
{
    let cookies = parseCookies( request.headers.cookie );
    let url = require('url').parse(request.url, true);
    console.log('POST ', url.pathname);
    let user = await verifyUser(cookies)
    if (/^\/admin.*/.test(url.pathname))
    {
        await HandleAdminPostRequest(request, response, user);
        return;
    }
    let data = await readRequestData(request);
    let errorMessage = "Error occured";
    try {
        switch (url.pathname)
        {
            case "/":
                errorMessage = "Failed to send feedback";
                if (!checkEmail(data.email)) {
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
                        await Cart.update({isPurchased: true, date: Date.now()}, {where: {id: cart.id}})
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
                if (!checkEmail(data.email))
                {
                    response.writeHead(303);
                    response.end("Неверный формат e-mail");
                }
                else {
                    let emailHash = encrypt(data.email.toString());
                    let passwordHash = encrypt(data.password.toString());
                    await User.create({email: emailHash.content, password: passwordHash.content});
                    redirectTo(response, '/login');
                }
                break;
            case "/login":
                errorMessage = "Failed to authentificate";
                await authentificateUser(user, response, data);
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
    }
}