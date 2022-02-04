document.getElementById("loginfailclose").onclick = function() {
    document.getElementById("loginfail").classList.add("visually-hidden");
}

document.forms['loginform'].addEventListener('submit', (event) => {
    event.preventDefault();
    fetch(event.target.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target)) 
    }).then(async (response) => {
        if (response.redirected)
            window.location.href = response.url;
        else {
            document.getElementById("loginfail").classList.remove("visually-hidden");
            document.getElementById("loginfailmessage").innerText = await response.text();
        }
    }).then((body) => {
        console.log(body);
    }).catch((error) => {
        // TODO handle error
    });
});