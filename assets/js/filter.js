function getState(buttonElement)
{
    if (buttonElement.classList.contains('fa-arrow-up'))
        return 0;
    return 1;
}

function updateFilter(elementId)
{
    let filter = [];
    let sender = document.getElementById(elementId);
    if (elementId != 'onlyInStock')
    {
        if (getState(sender))
        {
            sender.classList.remove('fa-arrow-down');
            sender.classList.add('fa-arrow-up');
        }
        else
        {
            sender.classList.remove('fa-arrow-up');
            sender.classList.add('fa-arrow-down');
        }
    }
    let filterType = 0;
    if (elementId === 'priceBtn')
        filterType = 1;
    else if (elementId === 'stockBtn')
        filterType = 2;
    filter[0] = filterType;
    filter[1] = getState(document.getElementById('nameBtn'));
    filter[2] = getState(document.getElementById('priceBtn'));
    filter[3] = getState(document.getElementById('stockBtn'));
    filter[4] = document.getElementById('onlyInStock').checked;
    
    let url = '/products?filterParam[]=' + filter[0] + '&filterParam[]=' + filter[1] + '&filterParam[]=' + filter[2] + 
        '&filterParam[]='+ filter[3] + '&filterParam[]='+ filter[4];
    window.location.href = url;
}