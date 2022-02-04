import * as fs from "fs";
import {respondError} from "./router";

import ejs from 'ejs';

export function parseCookies(str: any): any
{
    const list: any = {};
    str.split(`;`).forEach(function(cookie: any) {
        let [ name, ...rest] = cookie.split(`=`);
        name = name?.trim();
        if (!name) return;
        const value = rest.join(`=`).trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });
    return list;
}

export function saveImage(filename: string, data: any): void {
    data = data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, 'base64');
    fs.writeFile(filename, buffer, function(err) {
        if(err) {
            console.log("Error while writing file: " + err);
        } else {
            console.log("The file " + filename + " saved");
        }
    });
}

export function removeImage(filename: string): void
{
    fs.unlink(filename, function(err) {
        if(err) {
            console.log("Error while removing file: " + err);
        } else {
            console.log("The file " + filename + " removed");
        }
    });
}

export function renderPage(path: any, data: any): undefined
{
    let html;
    if (data == undefined) {
        ejs.renderFile("views/404.html", {empty: 0}, function (error: any, content: any) {
            html = content;
        });
    } else {
        ejs.renderFile(path, data, function (error: any, content: any) {
            html = content;
        });
    }
    return html;
}

export function strigifyDateTime(dateTimeStamp: any): string
{
    const date = new Date(dateTimeStamp);
    return String(date.getDate()).padStart(2, "0") +
    "." + String(date.getMonth() + 1).padStart(2, "0") +
    "." + String(date.getFullYear()).padStart(2, "0") +
    " " + String(date.getHours()).padStart(2, "0") +
    ":" + String(date.getMinutes()).padStart(2, "0") +
    ":" + String(date.getSeconds()).padStart(2, "0");
}

export function checkEmail(response: any, email: string, message: any = "Неверный формат e-mail"): boolean
{
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegexp.test(email))
    {
        respondError(response, message);
        return false;
    }
    return true;
}

export function validateValue(response: any, value: any, message = "Ошибка в обработке запроса", minLen = 0, maxLen = 255): boolean
{
    if (value == undefined || value == "" || value == null || value.length < minLen || value.length > maxLen)
    {
        respondError(response, message);
        return false;
    }
    return true;
}