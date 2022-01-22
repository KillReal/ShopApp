document.getElementById("loginfailclose").onclick = function() {
    document.getElementById("feedbackfail").classList.add("visually-hidden");
}

document.forms['feedbackform'].addEventListener('submit', (event) => {
    event.preventDefault();
    fetch(event.target.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target)) 
    }).then((response) => {
        console.log(response);
        if (response.status == "403")
        {
            document.getElementById("feedbackfail").classList.remove("visually-hidden");
        }
    }).then((body) => {
        console.log(body);
    }).catch((error) => {
        // TODO handle error
    });
});