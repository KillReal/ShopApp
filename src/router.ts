import {Cart, Feedback, getCartByUser, Order, Product, ProductList, User} from "./models";
import {checkEmail, parseCookies, renderPage, validateValue} from "./tools";
import querystring from "querystring";
import {decrypt, encrypt} from "./encryption";
import {authentificateUser, verifyUser} from "./Authentification";
import {HandleGetRequest as HandleAdminGetRequest, HandlePostRequest as HandleAdminPostRequest} from "./adminRouter";
import {where} from "sequelize";

export function readRequestData(request: any): any
{
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (buffer: any) => {
            body += buffer;
        });
        request.on('end', () => {
            try {
                if (request.method == "POST")
                {
                    let type = request.headers['content-type'];
                    if (type.split(';')[0] == "application/x-www-form-urlencoded")
                    {
                        resolve(querystring.decode(body));
                    }
                    else
                    {
                        resolve(body)
                    }
                }
                else
                {
                    resolve(querystring.decode(request.url.split('?')[1]));
                }
            }
            catch (error) {
                console.log("Unexpected error on readRequestData (" + error + ")");
                resolve(body);
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

export function respondError(response :any, message :string)
{
    response.writeHead(303);
    response.end(message);
}

export function respondOk(response: any, message :string)
{
    response.writeHead(200);
    response.end(message);
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
        switch (url.pathname) 
        {
            case "/":
            case "/index":
                errorMessage = "Failed to load products";
                let products = await Product.findAll({limit: 3, order: [
                        ['orderCount', 'DESC'],
                        ['id', 'ASC']]});
                if (user != null) 
                {
                    let cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: products, cart: cartCount};
                break;
            case "/login":
                if (user != null) 
                {
                    productList = await Product.findAll({limit: 3});
                    let cart = await getCartByUser(user);
                    data = {products: productList, cart: cart.productCount};
                    redirectTo(response, "/index");
                    return;
                }
                data = {products: productList, cart: 0, isLogin: true};
                break;
            case "/unlogin":
                if (user != null)
                {
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
                productList = await Product.findAll({order: [
                        ['orderCount', 'DESC'],
                        ['id', 'ASC']]})
                if (user != undefined) 
                {
                    let cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: productList, cart: cartCount};
                break;
            case "/profile":
                errorMessage = "Failed to load profile"
                if (user != undefined) 
                {
                    let cart = await getCartByUser(user);
                    data = {cart: cart.productCount, email: decrypt(user.email), isAdmin: user.role.match("admin")};
                    filePath = "./views/profile.html"
                } 
                else
                    redirectTo(response, "/login");
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
                    data = {productlists: products, totalprice: total, cart: cart.productCount, isOrder: false};
                    filePath = "./views/cart.html"
                } else {
                    redirectTo(response, "/login");
                    return;
                }
                break;
            case  "/orders":
                if (user != undefined) {
                    data = {orders: await Order.findAll({order: [['createdAt', 'DESC']]}, {where: {UserId: user.id}}), cart: "admin"}
                    filePath = "./views/orders.html"
                }
                else
                    redirectTo(response, "/login");
                break;
            case "/order":
                if (user != undefined) {
                    data = await readRequestData(request);
                    if (!validateValue(response, data.id))
                        return;
                    let order = await Order.findOne({where: {id: data.id}})
                    if (!validateValue(response, order, "Не найден указанный заказ"))
                        return;
                    let products = await ProductList.findAll({where: {CartId: order.CartId}, include: Product});
                    let cart = await Cart.findOne({where: {id: order.CartId}});
                    let total = 0;
                    products.forEach(function (product: any) {
                        total = total + product.Product.price * product.productCount;
                    });
                    let date = new Date(order.createdAt);
                    let orderDate = date.getDate() +
                        "." + String(date.getMonth() + 1).padStart(2, "0") +
                        "." + String(date.getFullYear()).padStart(2, "0") +
                        " " + String(date.getHours()).padStart(2, "0") +
                        ":" + String(date.getMinutes()).padStart(2, "0") +
                        ":" + String(date.getSeconds()).padStart(2, "0");
                    data = {productlists: products, totalprice: total, cart: cart.productCount, isOrder: true, orderDate: orderDate};
                    filePath = "./views/cart.html"
                }
                else
                    redirectTo(response, "/login");
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
    let user = await verifyUser(cookies);
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
            case "/purchase":
                errorMessage = "Failed to order";
                let isFail = false;
                if (user != undefined) {
                    if (!validateValue(response, data.name, "Поле ФИО не может быть пустым"))
                        return;
                    if (!validateValue(response, data.address, "Поле адрес не может быть пустым"))
                        return;
                    if (!validateValue(response, data.postCode, "Поле почтовый индекс не может быть пустым"))
                        return;
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findAll({
                        where: {CartId: cart.id},
                        include: Product
                    });
                    let totalCounts = 0;
                    await productList.forEach(async function (product: any, index: any) {
                        if (product.productCount > product.Product.inStock)
                        {
                            isFail = true;
                            await ProductList.update({productCount: product.Product.inStock}, {where: {id: product.id}})
                        }
                        totalCounts += product.productCount;
                    });
                    if (totalCounts == 0)
                    {
                        respondError(response, "Нельзя оплатить пустую корзину");
                        return;
                    }
                    if (isFail)
                    {
                        respondError(response, "Некоторых товаров не оказалось на складе");
                        console.log("Failed to order cart (ID:" + cart.id + ")");
                        return;
                    }
                    else
                    {
                        await Cart.update({isPurchased: true, date: Date.now()}, {where: {id: cart.id}})
                        let totalPrice = 0;
                        await productList.forEach(async function (product: any, index: any) {
                            Product.update({inStock: product.Product.inStock - product.productCount, orderCount: product.Product.orderCount + product.productCount}, 
                                {where: {id: product.Product.id}});
                            if (product.Product.discontPrice === null)
                                totalPrice += product.Product.price * product.productCount
                            else
                                totalPrice += product.Product.discontPrice * product.productCount
                        });
                        let nextId = await Order.max('id') + 1;
                        await Order.create({id: nextId, name: data.name, address: data.address, postCode: data.postCode, UserId: user.id, CartId: cart.id, totalPrice: totalPrice});
                        respondOk(response, "Заказ оформлен");
                        console.log("User (" + decrypt(user.name) + ") purchased cart (ID:" + cart.id + "), order (ID:" + nextId + ")");
                    }
                }
                else 
                    redirectTo(response, "/login");
                break;
            case "/plusToCart":
                errorMessage = "Failed add to cart";
                if (user != undefined) 
                {
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({
                        where: {CartId: cart.id, ProductId: data.productId},
                        include: Product
                    });
                    if (productList.Product.inStock - 1 >= productList.productCount) 
                    {
                        await ProductList.update({productCount: productList.productCount + 1}, {
                            where: {
                                CartId: cart.id,
                                ProductId: data.productId
                            }
                        });
                        await Cart.update({productCount: cart.productCount + 1}, {where: {id: cart.id}})
                        respondOk(response, "Товар добавлен в корзину")
                    } 
                    else
                        respondError(response, "Запасы товара исчерпаны")
                } 
                else
                    redirectTo(response, "/login");
                break;
            case "/minusFromCart":
                errorMessage = "Failed to minus from cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    if (!validateValue(response, data.productId))
                        return;
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    if (productList.productCount > 0) 
                    {
                        if (productList.productCount == 1) 
                        {
                            await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}})
                            await Cart.update({productCount: cart.productCount - 1}, {where: {id: cart.id}})
                        } 
                        else 
                        {
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
                    respondOk(response, "Товар убран из корзины")
                } 
                else
                    redirectTo(response, "/login");
                break;
            case "/deleteFromCart":
                errorMessage = "Failed to remove from cart";
                if (user != undefined) {
                    if (!validateValue(response, data.productId))
                        return;
                    let cart = await getCartByUser(user);
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
                    if (!validateValue(response, productList))
                        return;
                    await ProductList.destroy({where: {CartId: cart.id, ProductId: data.productId}});
                    await Cart.update({productCount: cart.productCount - productList.productCount}, {where: {id: cart.id}})
                    respondOk(response, "Товар убран из корзины")
                } 
                else
                    redirectTo(response, "/login");
                break;
            case "/addInCart":
                errorMessage = "Failed to add in cart";
                if (user != undefined) {
                    let cart = await getCartByUser(user);
                    if (!validateValue(response, data.productId))
                        return;
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}, include: Product});
                    let product = await Product.findOne({where: {id: data.productId}})
                    if (!validateValue(response, product))
                        return;
                    if (product.inStock - 1 >= 0)
                    {
                        if (productList != null) {
                            if (productList.Product.inStock - 1 >= productList.productCount)
                            {
                                await ProductList.update({productCount: productList.productCount + 1}, {where: {id: productList.id}});
                                await Cart.update({productCount: cart.productCount + 1}, {where: {UserId: user.id}})
                                respondOk(response, "Товар добавлен в корзину")
                            }
                            else
                                respondError(response, "Запасы товара исчерпаны")
                        } 
                        else 
                        {
                            productList = await ProductList.create({
                                ProductId: data.productId,
                                productCount: 1,
                                CartId: cart.id
                            });
                            await Cart.update({
                                ProductListId: productList.id,
                                productCount: cart.productCount + 1
                            }, {where: {UserId: user.id}});
                            respondOk(response, "Товар добавлен в корзину")
                        }
                        console.log("cart updated");
                    }
                    else
                        respondError(response, "Запасы товара исчерпаны")
                } 
                else 
                    redirectTo(response, "/login");
                break;
            case "/registration":
                errorMessage = "Failed to registrate";
                if (!checkEmail(response, data.email))
                    return;
                if (!validateValue(response, data.password, "Поле пароль не может быть пустым"))
                    return;
                else {
                    let emailHash = encrypt(data.email.toString());
                    let passwordHash = encrypt(data.password.toString());
                    let foundUser = User.findOne({where: {email: encrypt(data.email).content}});
                    if (foundUser != null)
                        respondError(response, "Такой пользователь уже зарегистрирован")
                    else 
                    {
                        await User.create({email: emailHash.content, password: passwordHash.content});
                        redirectTo(response, '/login');
                        console.log("New user registered (" + data.email + ")");
                    }
                }
                break;
            case "/login":
                errorMessage = "Failed to authentificate";
                await authentificateUser(user, response, data);
                break;
            case "/":
            case "/index":
                errorMessage = "Failed to save user feedback";
                if (!checkEmail(response, data.email))
                    return;
                if (!validateValue(response, data.name, "Поле ФИО не может быть пустым"))
                    return;
                if (!validateValue(response, data.message , "Поле сообщение не может быть пустым"))
                    return;
                let userId = undefined;
                if (user != undefined)
                    userId = user.id;
                await Feedback.create({name: data.name, email: data.email, message: data.message, UserId: userId});
                respondOk(response, "Ваше обращение сохранено")
                console.log("User (" + data.name + ") send a feedback");
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
    }
}