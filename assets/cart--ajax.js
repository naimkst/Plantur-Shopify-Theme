
class AjaxCart extends HTMLElement {
  
  constructor() {
    super();
    this.cartDrawer = this.querySelector('cart-drawer');
    this.cartIcon = document.getElementById("cart-icon-bubble");
    this.cartCountBubble = document.querySelector(".cart-count-bubble");
    this.cartTotal = document.querySelector("#subtotal_value_cart");
    this.cartIcon.addEventListener('click', this.toggle.bind(this));
    this.headerHamburger = document.querySelector(".header__icon--menu");
    this.headerHamburger.addEventListener('click', this.headerClose.bind(this));

    this.bindEvents();
  }
  
  bindEvents() {
    this.cartClose = this.querySelector('.cart__close');
    this.cartClose.addEventListener('click', this.close.bind(this));
    this.backdrop = this.querySelector('backdrop');
    this.backdrop.addEventListener('click', this.close.bind(this));
    this.swipeMove();
  }

  swipeMove() {
    let startX, startY, distX, distY
    this.querySelector('cart-drawer').addEventListener('touchstart', (e) => {
      var touchobj = e.changedTouches[0];
      startX = touchobj.pageX
      startY = touchobj.pageY
    });
    this.querySelector('cart-drawer').addEventListener('touchend', (e) => {
      var touchobj = e.changedTouches[0];
      distX = touchobj.pageX - startX 
      distY = touchobj.pageY - startY;
      if(distX > 80) {
        e.preventDefault();
        this.close();
      }
    });
  }

  toggle(event) {

    event.preventDefault();
    event.stopPropagation();
    return this.hasAttribute("open") ? this.close() : this.open();
  }
  
  open(event) {
    this.cartDrawer.classList.add('animate', 'active');
    this.setAttribute("open", "");
    document.body.classList.add(`ajax-cart-open`);
  }

  headerClose(event) {
    if(document.body.classList.contains(`ajax-cart-open`)) {
      event.stopPropagation();
      event.preventDefault();
      this.close();
    }
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  close() {
    this.removeAttribute("open", "");
    document.body.classList.remove(`ajax-cart-open`);
    document.body.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden-tablet');
  }

  // Only needed if wishlist present
  initializeWishlistButtons() {
    if("_swat" in window) {  _swat.initializeActionButtons("#shopify-section-ajax-cart") }
  }

  updateCart(parsedState) {

    this.renderContents(parsedState);

    fetch('/cart.js', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': `application/json`
      }
    })
    .then((response) => response.json())
    .then((response) => {
      if (response.status) {
        this.handleErrorMessage(response.description);
        return;
      }
      this.updateCartCount(response);
      this.updateCartTotal(response);

    })
    .catch((e) => {
      console.error(e);
    })
  }

  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section => {
      var section = document.getElementById(section.id);
      if(section) section.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    }));
    setTimeout(() => {
      this.initializeWishlistButtons();
      
      this.open();
    }, 100);
    this.bindEvents();
  }

  updateCartCount(response){
    this.cartCountBubble.classList.remove('hidden');
    this.cartCountBubble.querySelector('[aria-hidden="true"]').innerText = response.item_count;
  }

  updateCartTotal(response){
    // let num = response.items_subtotal_price;
    // let text = num.toLocaleString("au-AU", {style:"currency", currency:"AUD"});
    // console.log(text);

    this.cartTotal.querySelector('[aria-hidden="true"]').innerText = Shopify.formatMoney(response.items_subtotal_price);
    console.log(response.items_subtotal_price);
  }

  getSectionsToRender() {
    return [
      {
        id: 'ajax-cart',
        selector: `#ajax-cart`,
      },
      {
        id: 'gift-with-purchase',
        selector: '#gift-with-purchase'
      }
    ];
  }
}

customElements.define('ajax-cart', AjaxCart);