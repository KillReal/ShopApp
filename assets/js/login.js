document.getElementById("loginfailclose").onclick = function() {
    document.getElementById("feedbackfailclose").classList.add("visually-hidden");
}

document.forms['loginform'].addEventListener('submit', (event) => {
    event.preventDefault();
    fetch(event.target.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target)) 
    }).then((response) => {
        console.log(response);
        if (response.status == "403")
        {
            document.getElementById("loginfail").classList.remove("visually-hidden");
        }
        if (response.redirected)
        {
            window.location.href = response.url;
        }
    }).then((body) => {
        console.log(body);
    }).catch((error) => {
        // TODO handle error
    });
});