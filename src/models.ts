import Sequelize = require('sequelize')

const sequelize = new Sequelize.Sequelize('postgres://postgres:123@localhost:5432/webSite', {
    logging: false
});

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch((err: any) => {
        console.error('Unable to connect to the database:', err);
    });

export const User: any = sequelize.define('User', {
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
export const Product: any = sequelize.define('Product', {
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
export const Cart: any = sequelize.define('Cart', {
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
export const Feedback: any = sequelize.define('Feedback', {
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
export const ProductList: any = sequelize.define('ProductList', {
    productCount: {
        type: Sequelize.INTEGER
    }
}, {});
export const Order: any = sequelize.define('Order', {
    name: {
        type: Sequelize.STRING
    },
    address: {
        type: Sequelize.STRING
    },
    postCode: {
        type: Sequelize.STRING
    },
    totalPrice: {
        type: Sequelize.INTEGER
    }
})

export async function getCartByUser(user: any): Promise<any>
{
    let cart = await Cart.findOne({where: {UserId: user.id, isPurchased: false}});
    if (cart == undefined)
    {
        cart = await Cart.create({UserId: user.id, productCount: 0, isPurchased: false});
        console.log("For user (" + user.name + ") created new cart");
    }
    return cart;
}