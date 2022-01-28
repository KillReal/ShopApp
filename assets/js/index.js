document.forms['feedbackform'].addEventListener('submit', (event) => {
    event.preventDefault();
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