var popupTimer;

function popupShowMessage(title, message)
{
    if (message == null)
    {
        return;
    }
    try {
        let popup = document.getElementById('popup');
        popup.querySelector('.me-auto').innerHTML = title;
        popup.querySelector('.toast-body').innerText = message + "!";
        popup.classList.remove('hide');
        popup.classList.add('show');
        clearTimeout(popupTimer);
        popupTimer = setTimeout(hidePopup, 5000);
    }
    catch (e) {

    }
}

document.forms['cartPurchase'].addEventListener('submit', (event) => {
    event.preventDefault()
    if (!document.forms['cartPurchase'].checkValidity()) {
        event.stopPropagation()
    }
    fetch(event.target.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target))
    }).then(async (response) => {
        console.log(response);
        popupShowMessage('Корзина', await response.text())
    }).then((body) => {
        console.log(body);
    }).catch((error) => {

    });
});

function hidePopup(){
    let popup = document.getElementById('popup');
    popup.classList.remove('show');
    popup.classList.add('hide');
}

function UpdateCartCounter(value)
{
    let counter = document.getElementById('cartcounter');
    counter.innerText = parseInt(counter.innerText) + value;
}

function UpdateCart(productId, value)
{
    let card = document.getElementById('card-' + productId)
    let count = card.querySelector('input[name="count"]')
    let price = card.querySelector('.mb-0')
    let totalprice = document.getElementById('totalprice')
    totalprice.innerText = "Всего: " + (parseInt(totalprice.innerText.slice(7, -1)) +
        parseInt(price.innerHTML.slice(0, -1)) * value) + "₽";
    count.value = parseInt(count.value) + value;
    if (count.value === "0")
    {
        card.remove();
    }
}

async function actionWithCart(actionType, productId){
    let result;
    switch(actionType)
    {
        case 'createItem':
            result = await sendRequest('/addInCart', productId);
            popupShowMessage('Корзина', result);
            if (result === 'Товар добавлен в корзину')
            {
                UpdateCartCounter(1);
            }
            break;
        case 'addItem':
            result = await sendRequest('/plusToCart', productId);
            popupShowMessage('Корзина', result);
            if (result === 'Товар добавлен в корзину')
            {
                UpdateCartCounter(1);
                UpdateCart(productId, 1);
            } 
            break;
        case 'removeItem':
            result = await sendRequest('/deleteFromCart', productId);
            popupShowMessage('Корзина', result);
            if (result === 'Товар убран из корзины')
            {
                let card = document.getElementById('card-' + productId)
                let count = card.querySelector('input[name="count"]')
                UpdateCartCounter(-1 * parseInt(count.value))
                UpdateCart(productId, -1 * parseInt(count.value))   
                card.remove();
            }
            break;
        case 'delItem':
            result = await sendRequest('/minusFromCart', productId);
            popupShowMessage('Корзина', result);
            if (result === 'Товар убран из корзины')
            {
                UpdateCartCounter(-1)
                UpdateCart(productId, -1)
            }
            break;
    }
}

async function sendRequest(route, productId = -1, redirectMsg = '', redirectRoute = '')
{
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'productId': productId
        })
    };
    let response = await fetch(route, requestOptions)
    if (response.redirected)
    {
        window.location.href = response.url;
    }
    return await response.text();
}