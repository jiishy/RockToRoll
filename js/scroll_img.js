/**
 * Created by Jsy on 2017/7/24.
 */

$(function(){
  /*未元素的首尾添加补白*/
  var $panels = $('#slider .scrollContainer > li');
  var $parent=$panels.parent();
  var $length=$panels.length;
  var $first=$panels.eq(0).clone().addClass("panel cloned").attr("id",'panel_'+($length+1));
  var $last=$panels.eq($length-1).clone().addClass("cloned").attr("id",'panel_0');
  $parent.append($first);
  $parent.prepend($last);
  var totalPanels	= $(".scrollContainer").get(0).children.length;
  var regWidth = $(".panel").css("width");
  var regImgWidth = $(".panel img").css("width");
  var movingDistance = 195;
  var curWidth	= 230;
  var curHeight =312;
  var curImgWidth =230;
  var curImgHeight =288;
  var othersW  =170;
  var othersH  =235;
  var othersImgW  =170;
  var othersImgH  =213;
  var $panels = $('#slider .scrollContainer > li');
  var $container = $('#slider .scrollContainer');
  $panels.css({'float' : 'left','position' : 'relative'});
  $("#slider").data("currentlyMoving", false);
  //$container.css('width', 1815);
  //(($panels[0].offsetWidth+25) * $panels.length) + 60 ).css('left','0')
  var scroll = $('#slider .scroll').css('overflow', 'hidden');
  function returnToNormal(element) {
    $(element).animate({ width: othersW,height: othersH}).find("img").animate({width:othersImgW,height:othersImgH});
  };
  function growBigger(element) {
    $(element).addClass("current").animate({ width: curWidth,height:curHeight}).siblings().removeClass("current")
      .end().find("img").animate({width:curImgWidth,height:curImgHeight})
  }
  //direction true = right, false = left
  function change(direction) {
    //if not at the first or last panel
    if((direction && !(curPanel < totalPanels-2)) || (!direction && (curPanel <= 1))) {
      return false;
    }
    //if not currently moving
    if (($("#slider").data("currentlyMoving") == false)) {
      $("#slider").data("currentlyMoving", true);
      var next         = direction ? curPanel + 1 : curPanel - 1;
      var leftValue    = $(".scrollContainer").css("left");
      var movement	 = direction ? parseFloat(leftValue, 10) - movingDistance : parseFloat(leftValue, 10) + movingDistance;
      $(".scrollContainer").stop().animate({"left": movement}, function() {
        $("#slider").data("currentlyMoving", false);
      });
      returnToNormal("#panel_"+curPanel);
      growBigger("#panel_"+next);
      curPanel = next;
      //remove all previous bound functions
      $("#panel_"+(curPanel+1)).unbind();
      //go forward
      $("#panel_"+(curPanel+1)).click(function(){ change(true); });
      //remove all previous bound functions
      $("#panel_"+(curPanel-1)).unbind();
      //go back
      $("#panel_"+(curPanel-1)).click(function(){ change(false); });
      //remove all previous bound functions
      $("#panel_"+curPanel).unbind();
    }
  }
  // Set up "Current" panel and next and prev 设置当前元素和上下
  growBigger("#panel_1");
  var curPanel = 1;
  $("#panel_"+(curPanel+1)).click(function(){ change(true);return false;});
  $("#panel_"+(curPanel-1)).click(function(){ change(false);return false;});
  //when the prev/next arrows are clicked
  $("#slider .next").click(function(){ console.log(curPanel);change(true);});
  $("#slider .prev").click(function(){ change(false);});
  $(window).keydown(function(event){//键盘方向键控制
    switch (event.keyCode) {
      case 13: //enter
        $(".next").click();
        break;
      case 37: //prev arrow
        $(".prev").click();
        break;
      case 39: //next arrow
        $(".next").click();
        break;
    }
  });
});
