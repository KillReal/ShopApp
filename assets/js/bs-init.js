document.getElementById('header').setAttribute('style',
	'padding-bottom:'+ document.getElementById('footer-body').clientHeight +'px;');

window.onresize = function(event) {
	document.getElementById('header').setAttribute('style',
		'padding-bottom:'+ document.getElementById('footer-body').clientHeight +'px;');
}

if (window.innerWidth < 1000) {
	[].slice.call(document.querySelectorAll('[data-bss-disabled-mobile]')).forEach(function (elem) {
		elem.classList.remove('animated');
		elem.removeAttribute('data-bss-hover-animate');
		elem.removeAttribute('data-aos');
	});
}

document.addEventListener('DOMContentLoaded', function() {
	AOS.init();
}, false);