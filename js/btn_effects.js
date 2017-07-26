/**
 * Created by Jsy on 2017/7/25.
 */
/*
$(function(){
  var $btn =   $('.btn');
  var $rainbow_and_border = $('.rain, .border');
  /* Used to provide loping animations in fallback mode
  $btn.bind('mouseenter', function(){
    $btn.addClass('start').addClass('rain border');
  });
  $btn.bind('mouseleave', function(){
    $btn.removeClass('start rain border');
  });

});*/
function DivFlying() {
  //var div = document.getElementsByClassName("divFly");
    var div = document.getElementById("divFly");
    if (!div) {
      return;
    }
    var intX = window.event.clientX - 40;
    var intY = window.event.clientY - 20;
    div.style.left = intX + "px";
    div.style.top = intY + "px";
}
document.onmousemove = DivFlying;