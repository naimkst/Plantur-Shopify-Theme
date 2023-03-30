//This feature requires Shopify.loadElements and Shopify.formatMoney to be in global.js
Shopify.MegaMenu = {};

Shopify.LoadMegaMenu = function(){
  this.navigation = [];
  this.layouts = [];
  this.templates = {};
  this.products = [];

  this.selectors = {
    menuLayoutsData: '[data-mega-menu]',
    navigationData: '#Navigation',
    htmlTemplates: '[data-template-for]'
  };

  Shopify.loadElements(this,this.selectors);

  this.menuLayoutsData = this.menuLayoutsData.innerHTML;
  this.navigationData = this.navigationData.children;
  this.navigationLinks = Array.from(this.navigationData);

  Shopify.MegaMenu = {
    layouts: []
  }

  this.parseNavLinks();
  this.parseMegaMenu();
  this.parseHtmlTemplates();
  this.buildMenuLayouts();
  this.loadMenuProducts();
  
};

Shopify.LoadMegaMenu.prototype = {
  
   parseNavLinks: function(){
    const self = this;
    
    self.navigationLinks.forEach((item) => {

      var group = {
        title: item.dataset.title,
        link_title: item.dataset.title.split(' ').join('-'),
        level: parseInt(item.dataset.level),
        url: item.dataset.ref,
        hash: item.dataset.ref == '#' ? '#' : '',
        handle: '',
        parentHandle: '',
        childLinks: []
      };

      group.handle = item.dataset && item.dataset.handle ? item.dataset.handle : item.dataset.title.toLowerCase().replaceAll(' ','-').replaceAll('#','');

      let index = parseInt(item.dataset.level);
      let lastNavItemIndex = self.navigation.length-1;
      switch(index) {
        case 1:
          self.navigation.push(group);
          break;
        case 2:
          group.parentHandle = self.navigation[(lastNavItemIndex)].handle;
          self.navigation[(lastNavItemIndex)].childLinks.push(group);
          break;
        case 3:
          group.parentHandle = self.navigation[(lastNavItemIndex)].childLinks[(self.navigation[(lastNavItemIndex)].childLinks.length-1)].handle;
          self.navigation[(lastNavItemIndex)].childLinks[(self.navigation[(lastNavItemIndex)].childLinks.length-1)].childLinks.push(group);
          break;
        case 4:
          var level1 = self.navigation[(lastNavItemIndex)]
          var level2 = level1.childLinks[(level1.childLinks.length-1)]
          var level3 = level2.childLinks[(level2.childLinks.length-1)]
          group.parentHandle = level3.handle;
          level3.childLinks.push(group);
          break;
        default:
          // code block
      }
    });

  },

  parseMegaMenu: function(){
    const self = this;

    const menu = JSON.parse(self.menuLayoutsData);
    menu.forEach((item)=>{
      if (item.menu_handle.length > 0){
        Shopify.MegaMenu.layouts.push(item);
      }
    });
  },

  parseHtmlTemplates: function(){
    const self = this;

    self.htmlTemplates.forEach((item) => {
      if (item.dataset.templateFor.includes('mega-menu')){
        self.templates[item.dataset.templateName] = { 
          html: item.innerHTML, 
          blocks: item.dataset.blocks.split(',') 
        };
      }
    });

  },

  loadMenuProducts: async function(){
    const self = this;
    let batchArray = [];

    Shopify.MegaMenu.layouts.forEach(async (menu) => {

      if (menu && menu.images){
        menu.images.map( async (blocks) => {
          if (blocks.product.length > 0){
            batchArray.push(self.loadProductData(blocks.product));
          }
        });
      }
      
    });

    if (batchArray.length > 0){
      await Promise.all(batchArray)
      .then(function() {

        self.buildProductLayouts();

      }).catch(function(error) {
        console.log(error);
      });
    }

  },

  buildGridItem: function(data){
    const self = this;
    let template = {};

    template = Object.assign({},self.templates['product-item']);

    return self.setTemplateVariables(template,data.product);
    
  },

  buildMenuLayouts: function(){
    const self = this;
    Shopify.MegaMenu.layouts.forEach((item)=>{

      item.template = Object.assign({}, self.templates[item.layout]);

      item.navList = self.navigation.find((list)=>{
        if (list.handle == item.menu_handle){
          return list;
        }
      });

      item.template.blocks.forEach((block)=>{
        switch(block) {
          case 'navlist':
            item.template.html = item.template.html.replaceAll(`{${block}}`,self.buildNavlist(item));
            break;
          case 'nested-navlist':
            item.template.html = item.template.html.replaceAll(`{${block}}`,self.buildNestedNavlist(item));
            break;
          case 'mega-menu-nested-images':
            item.template.html = item.template.html.replaceAll(`{${block}}`,self.buildNestedNavlist(item));
            item.template.html = item.template.html.replaceAll(`{${block}}`,self.buildImages(item));
            break;
          case 'images':
            item.template.html = item.template.html.replaceAll(`{${block}}`,self.buildImages(item));
            break;
          default:
            item.template.html = item.template.html.replaceAll(`{${block}}`,item[block]);
            break;
        }
      });

    });


  },

  buildProductLayouts: function(){
    const self = this;

    Shopify.MegaMenu.layouts.forEach((menu) => {

      if (menu && menu.images){
        menu.images.map((block) => {
          if (block.product.length > 0){
            let product = Object.assign(block, self.products.find((item)=> item.handle == block.product));

            if (product){
              let productGridItem = self.buildProductGridItem(product);
              menu.template.html = menu.template.html.replace('<div data-menu-product></div>',productGridItem);

              const updateMegaMenu = new CustomEvent('update:mega-menu', {
                bubbles: true,
                detail: { handle: menu.handle }
              });
              document.dispatchEvent(updateMegaMenu);
            }
            
          }
        });
      }
      
    });
  },

  buildProductGridItem: function(product){
    const self = this;
    let template = Object.assign({}, self.templates['product-item']);

    template.blocks.forEach((block)=>{
      switch(block) {
        case 'navlist':
          template.html = template.html.replaceAll(`{${block}}`,self.buildNavlist(product));
          break;
        case 'images':
          template.html = template.html.replaceAll(`{${block}}`,self.buildImages(product));
          break;
        case 'price':
          if(!Shopify.formatMoney)console.log('Theme is missing Shopify.formatMoney')
          template.html = template.html.replaceAll(`{${block}}`,Shopify.formatMoney(product[block]));
          break;
        default:
          template.html = template.html.replaceAll(`{${block}}`,product[block]);
          break;
      }
    });

    return template.html;
  },

  loadProductData: async function(handle){
    const self = this;

    return fetch(`${'/products/[handle]?view=data'.replace('[handle]',handle)}`)
    .then((response) => {
      return response.text();
    })
    .then((data) => {
      self.products.push(JSON.parse(data));
      return;
    }).catch(()=>{
      return '';
    });
    
  },

  buildImages: function(item){
    const self = this;
    let imageGrid = '';

    const imageItemTemplate = Object.assign({}, self.templates['image-item']);
    const emptyProductTemplate = '<div data-menu-product></div>'

    if (item.images){
      item.images.forEach((imageItem)=>{
        
        if (imageItem.product.length == 0){
          imageGrid = imageGrid + self.setTemplateVariables(imageItemTemplate,imageItem);
        }
        else {
          imageGrid = imageGrid + emptyProductTemplate;
        }
      
      });
    }
    else {
      console.log('This mega menu has no images set')
    }
    
    return imageGrid;
  },

  setTemplateVariables: function(template,item){
    let output = template.html;

    if (template.blocks){
      template.blocks.forEach((block)=>{
        output = output.replaceAll(`{${block}}`,item[block]);
      });
    }
    else {
      console.log("Template doesn't exist");
    }
    

    return output;
  },

  buildNavlist: function(item){
    const self = this;
    let output = '';
    let navlistTemplate = Object.assign({},self.templates['navlist']);
    let navItemHeadingTemplate = Object.assign({},self.templates['nav-item-heading']);
    let navItemTemplate = Object.assign({},self.templates['nav-item']);
    
    if (item.navList && item.navList.childLinks.length > 0){
      item.navList.childLinks.forEach((listItem)=>{
        let navItemsOutput = '';
        let navlistOutput = navlistTemplate.html;

        navItemsOutput = navItemsOutput + self.setTemplateVariables(navItemHeadingTemplate,listItem);
        
        listItem.childLinks.forEach((linkItem,index)=>{
          navItemsOutput = navItemsOutput + self.setTemplateVariables(navItemTemplate,linkItem);
        });

        navlistOutput = navlistOutput.replace('{items}',navItemsOutput);
        output = output + navlistOutput;
      });
    }
    

    return output;
  },

  buildNestedNavlist: function(item){
    const self = this;
    let output = '';
    let navlistTemplate = Object.assign({},self.templates['nested-navlist']);
    let navItemTemplate = Object.assign({},self.templates['nav-item']);
    let navChildTemplate = Object.assign({},self.templates['nested-nav-item']);
    
    let navlistOutput = navlistTemplate.html;
    let columnOne = '';
    if (item.navList && item.navList.childLinks.length > 0){
      item.navList.childLinks.forEach((listItem)=>{

        columnOne = columnOne + self.setTemplateVariables(navChildTemplate,listItem);
        let columnTwo = ''

        listItem.childLinks.forEach((linkItem)=>{
          let columnThree = ''

          columnTwo = columnTwo + self.setTemplateVariables(navChildTemplate,linkItem);

          linkItem.childLinks.forEach((childItem)=>{
            columnThree = columnThree + self.setTemplateVariables(navItemTemplate,childItem);
          });
          
          columnTwo = columnTwo.replace('{items}',columnThree);
        });

        
        columnOne = columnOne.replace('{items}',columnTwo);

      });

      navlistOutput = navlistOutput.replace('{items}',columnOne);
      output = output + navlistOutput;
    }
    output = output.replaceAll(`{handle}`,item.handle);
    return output;
  },
  
};


class MegaMenu extends HTMLElement {
  constructor() {
    super();
    this.menus = [];

    this.selectors = {
      menuItems: '.mega-menu-btn, .mega-menu-link',
      menuDropdowns: '.mega-menu-dropdown',
      menuToggles: '[aria-expanded]'
    };

    Shopify.loadElements(this,this.selectors,this);
    this.menuDropdowns = Array.from(this.menuDropdowns);
    
    this.bindElements();
    this.buildMenus();
    this.bindEvents();
  }

  bindEvents(){
    const self = this;

    document.addEventListener('update:mega-menu',(evt)=>{
      let handle = evt.detail.handle;
      let menu = self.menus.find((menu)=> menu.handle == handle);
      if(menu){
        self.updateMenu(menu);
      }
      else {
        console.log('Unable to match menu handle, please check all menuItem selectors are set')
      }
      
    })

    this.addEventListener('keydown', (event)=>{this.triggerKeydownHandler(event)});
  }

  triggerKeydownHandler(event){
    self = this;
    if (event.keyCode === 13) {
      if (event.target.hasAttribute('aria-expanded')){
        self.closeOtherMenus(event.target);
        event.target.setAttribute('aria-expanded',!(event.target.getAttribute('aria-expanded') == 'true'));
      }
    }
    if(event.key == 'Escape') {
      self.closeOtherMenus();
      event.target.closest('.mega-menu-item').nextElementSibling.focus();
    }
  }

  closeOtherMenus(current){
    for (var i = this.menuToggles.length - 1; i >= 0; i--) {
      let toggle = this.menuToggles[i];
      if (current && current == toggle){

      }
      else {
        toggle.setAttribute('aria-expanded',false);
      }
      
    }
  }

  bindElements(){
    const self = this;

    this.menuItems.forEach((item)=>{
      let key = item.dataset.menu;
      let title = item.dataset.item;
      let dropdown = this.menuDropdowns.find((dropdown)=> {
        return dropdown.dataset.menu === key;
      });
      this.menus.push( {
        handle: title,
        button: this.menuItems,
        dropdown: dropdown
      });
    });

    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll('[data-tabbed="true"]').forEach(tabGroup => tabGroup.addEventListener('keyup', this.horizontalTabOnKeyup.bind(this)));
    this.querySelectorAll('[aria-orientation="vertical"]').forEach(verticalTabGroup => verticalTabGroup.addEventListener('keyup', this.verticalTabOnKeyup.bind(this)));
    
  }

  buildMenus(handle){
    const self = this;

    self.menus.forEach((menu)=>{
      self.updateMenu(menu);
    });
    
  }

  verticalTabOnKeyup(event){
    if (event.key == 'ArrowUp'){
      let previousButton = event.target.closest('li').previousElementSibling;
      previousButton.querySelector('summary').focus();
    }
    else if (event.key == 'ArrowDown'){
      let nextButton = event.target.closest('li').nextElementSibling;
      nextButton.querySelector('summary').focus();
    }
  }

  horizontalTabOnKeyup(event){
    if (event.key == 'ArrowLeft'){
      let previousButton = event.target.closest('li').previousElementSibling;
      previousButton.querySelector('summary').focus();
    }
    else if (event.key == 'ArrowRight'){
      let nextButton = event.target.closest('li').nextElementSibling;
      nextButton.querySelector('summary').focus();
    }
  }

  initDetails(menu){
    let summaries = menu.dropdown.querySelectorAll('summary');

    // this.addEventListener('keyup', this.onKeyUp.bind(this));

    summaries.forEach((summary) => {

      summary.addEventListener('mouseenter', (event) => {
        this.onSummaryClick(event);
      });

      if (summary.closest('[mega-menu]')) return;
      summary.parentElement.addEventListener('keyup', onKeyUpEscape);
    });


  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const isOpen = detailsElement.hasAttribute('open');
    const currentId = detailsElement.dataset.toggleId;
  
    if (currentId) {
      if (detailsElement.open){
        event.preventDefault();
        summaryElement.open = true;
      }
      else {
        let parent = summaryElement.closest('ul');
        let siblings = parent.querySelectorAll(`details:not([data-toggle-id="${currentId}"]`);
        siblings.forEach(details => details.open = false);
        summaryElement.open = true;
        detailsElement.open = true;
      }
      
    }  
    else {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));

      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
      });
    }
  }

  updateMenu(menu){
    const self = this;

    let layout = Shopify.MegaMenu.layouts.find((item)=> {
      return item.menu_handle == menu.handle;
    });
    if (layout && layout.template){
      if (menu.dropdown){
        menu.dropdown.innerHTML = layout.template.html;
        this.initDetails(menu)
      }
      else {
        console.log('unable to find menu dropdown + data-menu='+menu.handle);
      }
      
    }
  }

}

new Shopify.LoadMegaMenu();

customElements.define('mega-menu', MegaMenu);


