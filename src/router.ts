import {Cart, Feedback, getCartByUser, Order, Product, ProductList, User} from "./models";
import {checkEmail, parseCookies, renderPage, strigifyDateTime, validateValue} from "./tools";
import querystring from "querystring";
import {decrypt, encrypt} from "./encryption";
import {authentificateUser, verifyUser} from "./Authentification";
import {HandleGetRequest as HandleAdminGetRequest, HandlePostRequest as HandleAdminPostRequest} from "./adminRouter";
import XPromise from 'promise';

export function readRequestData(request: any): any
{
    return new XPromise((resolve, reject) => {
        let body = '';
        request.on('data', (buffer: any) => {
            body += buffer;
        });
        request.on('end', () => {
            try {
                if (request.method == "POST")
                {
                    const type = request.headers['content-type'];
                    if (type.split(';')[0] == "application/x-www-form-urlencoded")
                        resolve(querystring.decode(body));
                    else
                        resolve(body)
                }
                else
                    resolve(querystring.decode(request.url.split('?')[1]));
            }
            catch (error) {
                reject();
                console.log("Unexpected error on readRequestData (" + error + ")");
                resolve(body);
            }
        });
    })
}

export function redirectTo(response: any, url: string): void
{
    response.statusCode = 302;
    response.setHeader('Location', url);
    response.end();
}

export function respondError(response: any, message: string): void
{
    response.writeHead(303);
    response.end(message);
}

export function respondOk(response: any, message: string): void
{
    response.writeHead(200);
    response.end(message);
}

export function getFilePath(url: any): string
{
    let filePath = './views' + url;
    if (url == "/")
    {
        filePath += "index";
    }
    return filePath += ".html";
}

export async function HandleGetRequest(request: any, response: any): Promise<any>
{
    const cookies = parseCookies( request.headers.cookie );
    const url = require('url').parse(request.url, true);
    console.log('GET ', url.pathname);
    const user = await verifyUser(cookies)
    let userEmail = '';
    if (user != null)
    {
        userEmail = decrypt(user.email);
    }
    if (/^\/admin.*/.test(url.pathname))
    {
        await HandleAdminGetRequest(request, response, user);
        return;
    }
    let filePath = getFilePath(request.url);
    let data, productList, cartCount;
    data = undefined;
    cartCount = 0;
    let errorMessage;
    try {
        switch (url.pathname) 
        {
            case "/":
            case "/index":
                errorMessage = "Failed to load products";
                const products = await Product.findAll({limit: 3, order: [
                        ['orderCount', 'DESC'],
                        ['id', 'ASC']]});
                if (user != null) 
                {
                    const cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: products, cart: cartCount, email: userEmail};
                break;
            case "/login":
                if (user != null) 
                {
                    productList = await Product.findAll({limit: 3});
                    const cart = await getCartByUser(user);
                    data = {products: productList, cart: cart.productCount, email: userEmail};
                    redirectTo(response, "/index");
                    return;
                }
                data = {products: productList, cart: 0, isLogin: true, email: userEmail};
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
                data = {products: productList, cart: 0, isLogin: false, email: userEmail};
                break;
            case "/products":
                errorMessage = "Failed to load products";
                productList = await Product.findAll({order: [['orderCount', 'DESC'], ['id', 'ASC']]})
                if (user != undefined) 
                {
                    const cart = await getCartByUser(user);
                    cartCount = cart.productCount;
                }
                data = {products: productList, cart: cartCount, email: userEmail};
                break;
            case "/profile":
                errorMessage = "Failed to load profile"
                if (user != undefined) 
                {
                    const cart = await getCartByUser(user);
                    data = {cart: cart.productCount, email: decrypt(user.email), isAdmin: user.role.match("admin")};
                    filePath = "./views/profile.html"
                } 
                else
                    redirectTo(response, "/login");
                break;
            case "/cart":
                errorMessage = "Failed to load cart products";
                if (user != undefined) {
                    const cart = await getCartByUser(user);
                    const products = await ProductList.findAll({where: {CartId: cart.id}, include: Product});
                    let total = 0;
                    products.forEach(function (product: any) {
                        total = total + product.Product.price * product.productCount;
                    });
                    data = {productlists: products, totalprice: total, cart: cart.productCount, isOrder: false, email: userEmail};
                    filePath = "./views/cart.html"
                } else {
                    redirectTo(response, "/login");
                    return;
                }
                break;
            case  "/orders":
                if (user != undefined) {
                    const cart = await getCartByUser(user);
                    const orders = await Order.findAll({order: [['createdAt', 'DESC']], include: {model: Cart, where: {UserId: user.id}}});
                    orders.forEach(function (order: any) {
                        order.name = decrypt(order.name.toString());
                        order.address = decrypt(order.address.toString());
                        order.postCode = decrypt(order.postCode.toString());
                    });
                    const ordersDates: string[] = [];
                    orders.forEach(function(order: any, iterator: number) {
                        ordersDates[iterator] = strigifyDateTime(order.createdAt);
                    })
                    data = {orders: orders, ordersDates: ordersDates, cart: cart.productCount, email: userEmail}
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
                    const order = await Order.findOne({where: {id: data.id}})
                    if (order.UserId != user.id)
                    {
                        const html = renderPage('./view/404.html', undefined);
                        response.end(html, 'utf-8');
                        return;
                    }
                    if (!validateValue(response, order, "Не найден указанный заказ"))
                        return;
                    order.name = decrypt(order.name.toString());
                    order.address = decrypt(order.address.toString());
                    order.postCode = decrypt(order.postCode.toString());
                    const products = await ProductList.findAll({where: {CartId: order.CartId}, include: Product});
                    const cart = await Cart.findOne({where: {id: order.CartId}});
                    let total = 0;
                    products.forEach(function (product: any) {
                        total = total + product.Product.price * product.productCount;
                    });
                    const orderDate = strigifyDateTime(order.createdAt);
                    data = {productlists: products, totalprice: total, cart: cart.productCount, email: userEmail, isOrder: true, orderDate: orderDate};
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
    response.writeHead(201);
    response.end(renderPage(filePath, data), "utf-8");
}

export async function HandlePostRequest(request: any, response: any): Promise<any>
{
    const cookies = parseCookies( request.headers.cookie );
    const url = require('url').parse(request.url, true);
    console.log('POST ', url.pathname);
    const user = await verifyUser(cookies);
    if (/^\/admin.*/.test(url.pathname))
    {
        await HandleAdminPostRequest(request, response, user);
        return;
    }
    const data = await readRequestData(request);
    let errorMessage = "Error occured";
    try {
        switch (url.pathname)
        {
            case "/purchase":
                errorMessage = "Failed to order";
                let isFail = false;
                if (user != undefined) {
                    if (!validateValue(response, data.name, "Поле ФИО не может быть пустым, либо слишком длинным"))
                        return;
                    if (!validateValue(response, data.address, "Поле адрес не может быть пустым, либо слишком длинным"))
                        return;
                    if (!validateValue(response, data.postCode, "Поле почтовый индекс не может быть пустым, либо слишком длинным"))
                        return;
                    const cart = await getCartByUser(user);
                    const productList = await ProductList.findAll({
                        where: {CartId: cart.id},
                        include: Product
                    });
                    let totalCounts = 0;
                    for (const product of productList) {
                        if (product.productCount > product.Product.inStock)
                        {
                            isFail = true;
                            await ProductList.update({productCount: product.Product.inStock}, {where: {id: product.id}})
                        }
                        totalCounts += product.productCount;
                    }
                    if (isFail)
                    {
                        respondError(response, "Некоторых товаров не оказалось на складе");
                        console.log("Failed to order cart (ID:" + cart.id + ")");
                        return;
                    }
                    if (totalCounts == 0)
                    {
                        respondError(response, "Нельзя оплатить пустую корзину");
                        return;
                    }
                    else
                    {
                        await Cart.update({isPurchased: true, date: Date.now()}, {where: {id: cart.id}})
                        let totalPrice = 0;
                        for (const product of productList)
                        {
                            await Product.update({inStock: product.Product.inStock - product.productCount, orderCount: product.Product.orderCount + product.productCount},
                                {where: {id: product.Product.id}});
                            if (product.Product.discontPrice == null)
                                totalPrice += product.Product.price * product.productCount
                            else
                                totalPrice += product.Product.discontPrice * product.productCount
                        }
                        const nextId = await Order.max('id') + 1;
                        let name = encrypt(data.name.toString());
                        let address = encrypt(data.address.toString());
                        let postCode = encrypt(data.postCode.toString());
                        await Order.create({id: nextId, name: name.content, address: address.content, postCode: postCode.content, UserId: user.id, CartId: cart.id, totalPrice: totalPrice});
                        respondOk(response, "Заказ оформлен");
                        console.log("User (" + decrypt(user.email) + ") purchased cart (ID:" + cart.id + "), order (ID:" + nextId + ")");

                    }
                }
                else 
                    redirectTo(response, "/login");
                break;
            case "/plusToCart":
                errorMessage = "Failed add to cart";
                if (user != undefined) 
                {
                    const cart = await getCartByUser(user);
                    const productList = await ProductList.findOne({
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
                    const cart = await getCartByUser(user);
                    if (!validateValue(response, data.productId))
                        return;
                    const productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
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
                    const cart = await getCartByUser(user);
                    const productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}});
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
                    const cart = await getCartByUser(user);
                    if (!validateValue(response, data.productId))
                        return;
                    let productList = await ProductList.findOne({where: {CartId: cart.id, ProductId: data.productId}, include: Product});
                    const product = await Product.findOne({where: {id: data.productId}})
                    if (!validateValue(response, product))
                        return;
                    if (product.inStock - 1 >= 0)
                    {
                        if (productList != null) {
                            if (productList.Product.inStock - 1 >= productList.productCount)
                            {
                                await ProductList.update({productCount: productList.productCount + 1}, {where: {id: productList.id}});
                                await Cart.update({productCount: cart.productCount + 1}, {where: {id: cart.id}})
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
                            }, {where: {id: cart    .id}});
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
                if (!validateValue(response, data.password, "Пароль должен быть длинной от 5 до 255 символов", 5, 255))
                    return;
                else {
                    const emailHash = encrypt(data.email.toString());
                    const passwordHash = encrypt(data.password.toString());
                    const foundUser = await User.findOne({where: {email: encrypt(data.email).content}});
                    if (foundUser != null)
                        respondError(response, "Такой пользователь уже зарегистрирован")
                    else 
                    {
                        await User.create({email: emailHash.content, password: passwordHash.content, role: 'user'});
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
                if (!validateValue(response, data.name, "Поле ФИО не может быть пустым, либо слишком длинным"))
                    return;
                if (!validateValue(response, data.message , "Поле сообщение не может быть пустым, либо слишком длинным", 0, 1024))
                    return;
                let userId = undefined;
                if (user != undefined)
                    userId = user.id;
                let name = encrypt(data.name.toString());
                let email = encrypt(data.email.toString());
                let message = encrypt(data.message.toString());
                await Feedback.create({name: name.content, email: email.content, message: message.content, UserId: userId});
                respondOk(response, "Ваше обращение сохранено")
                console.log("User (" + data.name + ") send a feedback");
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
        respondError(response, "Во время обработки запроса произошла ошибка");
    }
}