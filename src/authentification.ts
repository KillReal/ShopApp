﻿import {encrypt} from "./encryption";
import {User} from "./models";
import {redirectTo} from "./router";

const sha1 = require('sha1');

const cookieTimeout = 10000;

export async function verifyUser(cookies: any)
{
    if (cookies["login"] != undefined )
    {
        let user = await User.findOne({where: {cookie: cookies["login"]}});
        if (user == undefined)
        {
            return null;
        }
        if (user.cookieExpire < Date.now())
        {
            User.update({cookie: ""}, {where: {id: user.id}})
            return null;
        }
        return user; 
    }
    return null;
}

export async function authentificateUser(user: any | null, response: any, data: any) {
    if (user != undefined) {
        redirectTo(response, "/index");
    } else {
        let emailHash = encrypt(data.email.toString());
        let passwordHash = encrypt(data.password.toString());
        user = await User.findOne({where: {email: emailHash.content, password: passwordHash.content}});
        if (user != null) {
            let date = new Date();
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
}