import {Cart, User} from "./models";

export function parseCookies(str :any)
{
    let rx = /([^;=\s]*)=([^;]*)/g;
    let obj: any = { };
    for (let m ; m = rx.exec(str) ; )
        obj[ m[1] ] = decodeURIComponent( m[2] );
    return obj;
}

export async function getUserByCookies(cookies: any)
{
    if (cookies["login"] != undefined )
    {
        return await User.findOne({where: {cookie: cookies["login"]}})
    }
    return null;
}

export async function getCartByCookies(cookies: any)
{
    let user = await User.findOne({where: {cookie: cookies["login"]}});
    return await Cart.findOne({where: {userId: user.id}});
}