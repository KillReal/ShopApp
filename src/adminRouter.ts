import {Feedback, Order, Product, User} from "./models";
import {getFilePath, readRequestData, redirectTo} from "./router";
import {removeImage, renderPage, saveImage} from "./tools";
import {decrypt, encrypt} from "./encryption";
import {Sequelize} from "sequelize";

let errorMessage = "Error occured";
let data :any;

export async function HandleGetRequest(request :any, response: any, user: typeof User) {
    if (user == null || user.role != "admin")
    {
        let html = renderPage('./view/404.html', undefined);
        response.end(html, 'utf-8');
        return;
    }
    
    let url = require('url').parse(request.url, true);
    let filePath = getFilePath(request.url);
    try {
        switch (url.pathname)
        {
            case "/admin/products":
                data = {products: await Product.findAll({order: [
                            ['orderCount', 'DESC'],
                            ['id', 'ASC'],],}), cart: "admin", email: decrypt(user.email)};
                break;
            case "/admin/orders":
                data = {orders: await Order.findAll({order: [['createdAt', 'DESC']]}), cart: "admin", email: decrypt(user.email)}
                break;
            case "/admin/feedbacks":
                data = {feedbacks: await Feedback.findAll({order: [['createdAt', 'DESC']]}), cart: "admin", email: decrypt(user.email)}
                break;
            case "/admin/users":
                let users = await User.findAll();
                users.forEach(function (user: any) {
                    user.email = decrypt(user.email.toString());
                    user.password = decrypt(user.password.toString());
                });
                data = {users: users, cart: "admin", email: decrypt(user.email)};
                break;
        }
        response.end(renderPage(filePath, data), "utf-8");
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
    }
    
}

function getBoundary(request :any) {
    let contentType = request.headers['content-type']
    const contentTypeArray = contentType.split(';').map((item: string) => item.trim())
    const boundaryPrefix = 'boundary='
    let boundary = contentTypeArray.find((item: string) => item.startsWith(boundaryPrefix))
    if (!boundary) return null
    boundary = boundary.slice(boundaryPrefix.length)
    if (boundary) boundary = boundary.trim()
    return boundary
}

function validateProduct(product: typeof  Product)
{
    if (product.price < 0 || (product.discontPrice != "" && product.disontPrice < 0) || product.inStock < 0 || 
        product.orderCount < 0)
    {
        return false;
    }
    return true;
}

export async function  HandlePostRequest(request :any, response: any, user: typeof User)
{
    if (user == null || user.role != "admin")
    {
        response.writeHead(303);
        response.end('У вас не прав доступа');
        return;
    }
    let url = require('url').parse(request.url, true);
    let data = await readRequestData(request);
    let foundProduct, email, password, nextId
    try {
        switch (url.pathname)
        {
            case "/admin/products/add":
                if (!validateProduct(data))
                {
                    response.writeHead(304)
                    response.end("Неверные данные продукта")
                }
                let imageUrl = "./assets/img/" + data.name.split(" ").join("").toLowerCase() + ".jpg";
                saveImage(imageUrl, data.imageBytes);
                nextId = await Product.max('id') + 1;
                if (data.discontPrice == "")
                {
                    data.discontPrice = null;
                }
                await Product.create({
                        id: nextId,
                        name: data.name,
                        description: data.description,
                        price: data.price,
                        discontPrice: data.discontPrice,
                        inStock: data.inStock,
                        orderCount: data.orderCount,
                        imgUrl: imageUrl.substring(2)})
                console.log("Updated product (" + data.name + ") by admin: " + decrypt(user.email))
                redirectTo(response, '/admin/products')
                break;
            case "/admin/products/del":
                foundProduct = await Product.findOne({where: {id: data.id}})
                if (foundProduct != null)
                {
                    await User.destroy({where: {id: data.id}})
                    console.log("Removed product (" + foundProduct.name + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/products')
                }
                else 
                {
                    response.writeHead(304)
                    response.end("Неверные данные продукта")
                }
                break;
            case "/admin/products/edit":
                if (!validateProduct(data))
                {
                    response.writeHead(304)
                    response.end("Неверные данные продукта")
                }
                if (data.discontPrice == "")
                {
                    data.discontPrice = null;
                }
                foundProduct = await Product.findOne({where: {id: data.id}})
                if (foundProduct != null)
                {
                    let imageUrl = "./assets/img/" + data.name.split(" ").join("").toLowerCase() + ".jpg";
                    if (data.imageBytes != "")
                    {
                        removeImage(foundProduct.imgUrl);
                        saveImage(imageUrl, data.imageBytes);
                    }
                    await Product.update({
                            name: data.name, 
                            description: data.description, 
                            price: data.price, 
                            discontPrice: data.discontPrice, 
                            inStock: data.inStock, 
                            orderCount: data.orderCount,
                            imgUrl: imageUrl.substring(2)}
                        , {where: {id: foundProduct.id}})
                    console.log("Updated product (" + data.name + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/products')
                }
                else
                {
                    response.writeHead(304)
                    response.end("Неверные данные продукта")
                }
                break; 
            case "/admin/users/add":
                email = encrypt(data.email)
                password = encrypt(data.password)
                nextId = await User.max('id') + 1;
                await User.create({id: nextId, email: email.content, password: password.content, role: data.role.toString()})
                console.log("Created user (" + data.email + ") by admin: " + decrypt(user.email))
                redirectTo(response, '/admin/users')
                break;
            case "/admin/users/del":
                let foundUser = await User.findOne({where: {id: data.id}})
                if (foundUser != null)
                {
                    await User.destroy({where: {id: data.id}})
                    console.log("Removed user (" + decrypt(foundUser.email) + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/users')
                }
                else
                {
                    response.writeHead(304)
                    response.end("Неверные данные пользователя")
                }
                break;
            case "/admin/users/edit":
                email = encrypt(data.email)
                password = encrypt(data.password)
                await User.update({email: email.content, password: password.content, role: data.role.toString()}, {where: {id: data.id}})
                console.log("Updated user (" + data.email + ") by admin: " + decrypt(user.email))
                redirectTo(response, '/admin/users')
                break;
        }
    }
    catch (error) {
        console.log(errorMessage + " (" + error + ")");
        response.writeHead(304)
        response.end("В процессе обработки запроса произошла ошибка")
    }
}