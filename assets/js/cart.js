function actionWithCart(actionType, productId){
    switch(actionType)
    {
        case 'createItem': 
            var counter = document.getElementById('cartcounter');
            counter.innerText = parseInt(counter.innerText) + 1;
            var popup = document.getElementById('popup');
            popup.classList.remove('hide');
            popup.classList.add('show');
            popup.classList.add('didLoad');
            setTimeout(hidePopup, 3000);
            sendRequest('/addInCart', productId, 'Need to login', '/login'); 
            break;
        case 'addItem': sendRequest('/plusToCart', productId); break;
        case 'removeItem': sendRequest('/deleteFromCart', productId); break;
        case 'delItem': sendRequest('/minusFromCart', productId); break;
    }
}

function hidePopup(){
    var popup = document.getElementById('popup');
    popup.classList.remove('show');
    popup.classList.add('hide');
}

function sendRequest(route, productId, redirectMsg = '', redirectRoute = '')
{
    var xhr = new XMLHttpRequest();
    xhr.open('POST', route, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (redirectMsg != '' && this.responseText == redirectMsg)
        {
            window.location.href = redirectRoute;
        }
        window.location.reload();
    };
    xhr.send('productId=' + productId);
}