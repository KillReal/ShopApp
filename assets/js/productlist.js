function ShowDetails(productId)
{
    document.getElementById('ProductName').innerText = document.getElementById('ProductName-' + productId).innerText;
    document.getElementById('ProductImage').src = document.getElementById('ProductImage-' + productId).src;
    document.getElementById('ProductDescription').innerText = document.getElementById('ProductDescription-' + productId).innerText;
    document.getElementById('ProductCount').innerText = document.getElementById('ProductCount-' + productId).innerText;
    document.getElementById('ProductPrice').innerHTML = document.getElementById('ProductPrice-' + productId).innerHTML;
    document.getElementById('ProductButton').onclick = document.getElementById('ProductButton-' + productId).onclick;
}