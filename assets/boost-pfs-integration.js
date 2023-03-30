/** Please don't modify or unzip this content. It will be updated regularly **/
    (function() {
      BoostPFS.inject(this);

      //Set global variable
      Globals.hasIntegration = true;
      // 3rd app compile template
      Integration.compileIntegrationTemplate = function (data, itemHtml) {
        var itemReviewHtml = '<div class="grid-view-item__reviews"><div class="yotpo bottomLine" data-appkey="......." data-domain="' + Utils.escape(boostPFSConfig.shop.domain) + '" data-product-id="' + data.id + '" data-product-models="' + data.id + '" data-name="' + data.title + '" data-url="{{itemUrl}}" data-description="{{itemDescription}}" data-bread-crumbs="{{itemTags}}"></div></div>'; itemHtml = itemHtml.replace(/{{itemReviews}}/g, itemReviewHtml); var itemDescription = data.description ? data.description : ''; itemDescription = itemDescription.substr(0, itemDescription.indexOf('##highlights##')); itemHtml = itemHtml.replace(/{{itemDescription}}/g, itemDescription); itemHtml = itemHtml.replace(/{{itemTags}}/g, Utils.escape(data.tags.join(';')));itemHtml = itemHtml.replace(/{{itemUrl}}/g, Utils.buildProductItemUrl(data))
        return itemHtml;
      };

      Integration.call3rdIntegrationFunc = function(data) {
        if (typeof Yotpo !== 'undefined') {  var api = new Yotpo.API(yotpo);  api.refreshWidgets();}
      }

    })();