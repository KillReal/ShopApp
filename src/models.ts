// noinspection JSVoidFunctionReturnValueUsed,TypeScriptValidateJSTypes

const Sequelize = require('sequelize')

const sequelize = new Sequelize('postgres://postgres:123@localhost:5432/webSite', {
    logging: false
});

export async function getCartByUser(user :any)
{
    let cart = await Cart.findOne({where: {UserId: user.id, isPurchased: false}});
    if (cart == undefined)
    {
        cart = await Cart.create({UserId: user.id, productCount: 0, isPurchased: false}, {where: {userId: user.id}});
        console.log("For user (" + user.name + ") created new cart");
    }
    return cart;
}

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch((err: any) => {
        console.error('Unable to connect to the database:', err);
    });

export const User = sequelize.define('User', {
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
    },
    role : {
        type: Sequelize.STRING
    }
}, {});
export const Product = sequelize.define('Product', {
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
    },
    orderCount: {
        type: Sequelize.INTEGER
    }
}, {});
export const Cart = sequelize.define('Cart', {
    productCount: {
        type: Sequelize.INTEGER
    },
    isPurchased: {
        type: Sequelize.BOOLEAN
    },
    date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {});
export const Feedback = sequelize.define('Feedback', {
    name: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING
    },
    message: {
        type: Sequelize.STRING(1024)
    }
}, {});
export const ProductList = sequelize.define('ProductList', {
    productCount: {
        type: Sequelize.INTEGER
    }
}, {});
export const Order = sequelize.define('Order', {
    name: {
        type: Sequelize.STRING
    },
    address: {
        type: Sequelize.STRING
    },
    postCode: {
        type: Sequelize.INTEGER
    },
    totalPrice: {
        type: Sequelize.INTEGER
    }
})