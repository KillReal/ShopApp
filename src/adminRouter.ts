import {Product, User} from "./models";
import {getFilePath, readRequestData, redirectTo} from "./router";
import {removeImage, renderPage, saveImage} from "./tools";
import {decrypt, encrypt} from "./encryption";

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
                data = {products: await Product.findAll(), cart: "admin"};
                break;
            case "/admin/orders":
                break;
            case "/admin/users":
                let users = await User.findAll();
                users.forEach(function (user: any) {
                    user.email = decrypt(user.email.toString());
                    user.password = decrypt(user.password.toString());
                });
                data = {users: users, cart: "admin"};
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
    let foundProduct, email, password
    try {
        switch (url.pathname)
        {
            case "/admin/products/add":
                let imageUrl = "./assets/img/" + data.name.split(" ").join("").toLowerCase() + ".jpg";
                saveImage(imageUrl, data.imageBytes);
                await Product.create({
                        name: data.name,
                        description: data.description,
                        price: data.price,
                        discontPrice: data.discontPrice,
                        inStock: data.inStock,
                        imgUrl: imageUrl.substring(2)})
                console.log("Updated product (" + data.name + ") by admin: " + decrypt(user.email))
                redirectTo(response, '/admin/products')
                break;
            case "/admin/products/del":
                foundProduct = await Product.findOne({where: {id: data.id}})
                if (foundProduct != null)
                {
                    User.destroy({where: {id: data.id}})
                    console.log("Removed product (" + foundProduct.name + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/products')
                }
                break;
            case "/admin/products/edit":
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
                            imgUrl: imageUrl.substring(2)}
                        , {where: {id: foundProduct.id}})
                    console.log("Updated product (" + data.name + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/products')
                }
                break; 
            case "/admin/users/add":
                email = encrypt(data.email)
                password = encrypt(data.password)
                await User.create({email: email.content, password: password.content, role: data.role.toString()})
                console.log("Created user (" + data.email + ") by admin: " + decrypt(user.email))
                redirectTo(response, '/admin/users')
                break;
            case "/admin/users/del":
                let foundUser = await User.findOne({where: {id: data.id}})
                if (foundUser != null)
                {
                    User.destroy({where: {id: data.id}})
                    console.log("Removed user (" + decrypt(foundUser.email) + ") by admin: " + decrypt(user.email))
                    redirectTo(response, '/admin/users')
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
    }
}