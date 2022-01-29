

document.forms['feedbackform'].addEventListener('submit', (event) => {
    event.preventDefault();
    if (!document.forms['feedbackform'].checkValidity()) {
        event.stopPropagation()
    }
    fetch(event.target.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(event.target)) 
    }).then(async (response) => {
        console.log(response);
        popupShowMessage('Форма обратной связи', await response.text())
    }).then((body) => {
        console.log(body);
    }).catch((error) => {
        
    });
});