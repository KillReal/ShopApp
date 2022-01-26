function SetModalProperty(property, productId)
{
    document.getElementById(property).value = document.getElementById(property + '-' + productId).innerText
}

function adminEditProduct(productId)
{
    document.getElementById('modalForm').action = '/admin/products/edit'
    document.getElementById('productId').innerText = "Редактирование продукта с ID: " + productId
    document.getElementById('productIdPost').value = productId
    SetModalProperty('productName', productId)
    SetModalProperty('productDescription', productId)
    SetModalProperty('productPrice', productId)
    SetModalProperty('productDiscontPrice', productId)
    SetModalProperty('productInStock', productId)
    document.getElementById('productImage').src = document.getElementById('productImage-' + productId).src
    document.getElementById('productFile').src = document.getElementById('productImage-' + productId).src
}

function adminCreateProduct()
{
    document.getElementById('modalForm').action = '/admin/products/add'
    document.getElementById('productId').innerText = "Добавление нового продукта";
    document.getElementById('productName').value = ""
    document.getElementById('productDescription').value = ""
    document.getElementById('productPrice').value = ""
    document.getElementById('productDiscontPrice').value = ""
    document.getElementById('productInStock').value = ""
    document.getElementById('productImage').src = ""
}

function adminEditUser(userId)
{
    document.getElementById('modalForm').action = '/admin/users/edit'
    document.getElementById('userId').innerText = "Редактирование пользователя с ID: " + userId
    document.getElementById('userIdPost').value = userId
    SetModalProperty('userEmail', userId)
    SetModalProperty('userPassword', userId)
    SetModalProperty('userRole', userId)
}

function adminCreateUser()
{
    document.getElementById('modalForm').action = '/admin/users/add'
    document.getElementById('userId').innerText = "Добавление нового пользователя";
    document.getElementById('userEmail').value = ""
    document.getElementById('userPassword').value = ""
    document.getElementById('userRole').value = ""
}


var chooseFile = document.getElementById("productFile")

chooseFile.addEventListener("change", function () {
    const files = chooseFile.files[0];
    if (files) {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(files);
        fileReader.addEventListener("load", function () {
            var arrayBuffer = this.result
            document.getElementById("productImageBytes").value = arrayBuffer
            document.getElementById("productImage").src = this.result
        });
    }
});