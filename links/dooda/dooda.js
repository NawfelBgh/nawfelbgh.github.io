/*
Dooda Game
Created by Nawfel Bengherbia
Lisence:GPL
*/
// ---------------FUNCTIONS-----------------//
function start(){ //-------START
createGameZone();createFocusTool();createGame();
window.d=getElement('game').getContext('2d');
x[0]=-50;y[0]=-50;
textColor="red";
dx=0;dy=0;
dTextSize=45;
var animGameLogo=function()
{animText('Dooda',0.65,150);time=setTimeout(animGameLogo,wait);};
time=setTimeout(animGameLogo,wait);////
var drawPressToPlay=function(){textColor="#000";
drawText('Press Enter to start the game',w/2,h*0.70,inittextsize);clearTimeout(time);window.onkeydown=control;}
time=setTimeout(drawPressToPlay,1000);////
}//=============================================================================

function init(){ 
createButton();createScore();
textColor="red";
dTextSize=45;
x[0]=w/2;y[0]=h/2;
x.length=initlength;
for(i=1;i<x.length;i++){x[i]=-100-i;y[i]=-100-i}
foodx=Math.round(w*Math.random());foody=Math.round(h*Math.random());drawfood();
pause=false;
wait=initwait;
textsize=inittextsize;
dx=dmove;dy=0;
time=setTimeout(anim,wait);
}//=============================================================================

function getElement(d){return document.getElementById(d);}
//==============================================================================

//==============================================================================

function createGameZone(){
if(getElement('gamezone')){getElement('gamezone').innerHTML=''};
var gamez=document.createElement('div');
gamez.id="gamezone";
if(getElement('gamezone')){getElement('gamezone').nodeValue=gamez}
else{document.getElementsByTagName('body')[0].appendChild(gamez);};
getElement('gamezone').style.width=w+4+"px";
getElement('gamezone').style.border="solid 2px";
getElement('gamezone').style.padding=10+"px";
getElement('gamezone').style.position="relative";
getElement('gamezone').style.backgroundColor="#fafafa";
}//=============================================================================
function createFocusTool(){
if(getElement('focusTool')){alert('focusTool id found !!');}
var focusTool=document.createElement('input');
focusTool.type='text';
focusTool.id='focusTool';
focusTool.style.display='block';
focusTool.style.position='absolute';
focusTool.style.zIndex='-1';
getElement('gamezone').appendChild(focusTool);
}//=============================================================================


function createGame(){//---------THE CANVAS
if(getElement('game')){alert('game id found !!');}
var game=document.createElement('canvas');
game.id='game';
game.width=w;
game.height=h;
game.style.border="solid 2px";
game.style.backgroundColor="#fff";
getElement('gamezone').appendChild(game);
}//=============================================================================

function createButton(){
if(getElement('restartButton')){getElement('restartButton').parentNode.removeChild(getElement('restartButton'));}
var button=document.createElement('button');
button.id='restartButton';
button.innerHTML="Restart"
getElement('gamezone').appendChild(button);
getElement('restartButton').onclick=function(){clearTimeout(time);init();};
}//=============================================================================

function createScore(){
if(getElement('score')){getElement('score').parentNode.removeChild(getElement('score'));}
var score=document.createElement('span');
score.id="score";
score.style.position="absolute";
score.style.right=10+"px";
score.style.bottom=10+"px";
getElement('gamezone').appendChild(score);
}//==============================================================================

function anim() //-----------ANIMATION
{
if(!lose()){
if(pause==false){move();edge();food();draw();cntrl=true;getElement('focusTool').focus();}}
else{animText('Game Over',0.5,100);};
time=setTimeout(anim,wait);
}//==============================================================================

function draw(){
d.clearRect(0,0,w,h);
d.fillStyle="black";
var maxi=x.length
for(i=0;i<maxi;i++)
{
d.beginPath();
d.arc(x[i],y[i],r,0,2*Math.PI,true);
d.fill();
d.closePath();
}
drawfood();
}//==============================================================================

function move()
{
for(i=x.length-1;i>0;i--)
{
x[i]=x[i-1];
y[i]=y[i-1];
}
x[0]+=dx;
y[0]+=dy;
}//=============================================================================

function edge()
{
if (x[0]>w) {x[0]=0;}
else if (x[0]<0) {x[0]=w;}
else if (y[0]>h) {y[0]=0;}
else if (y[0]<0) {y[0]=h;}
}//=============================================================================

function control(ctrl)
{
if(cntrl){
switch(ctrl.keyCode)
{
case 37:
if(dx!=dmove){dx=-dmove;dy=0;cntrl=false;};
break;
case 38:
if(dy!=dmove){dx=0;dy=-dmove;cntrl=false;};
break;
case 39:
if(dx!=-dmove){dx=dmove;dy=0;cntrl=false;};
break;
case 40:
if(dy!=-dmove){dx=0;dy=dmove;cntrl=false;};
break;
default:

if(ctrl.keyCode==80){if(pause==true){pause=false;}else{pause=true;};}
else if(ctrl.keyCode==32){if(wait==initwait){wait/=2;}else{wait*=2;};}
else if(ctrl.keyCode==13){if(started==false){init();started=true;};};
}
}

}//=================================================================================

function lose()
{
var rv=0;
var maxtab=x.length
for(i=0;i<maxtab;i++)
{
for(j=0;j<maxtab;j++){if(x[i]==x[j]){if(y[i]==y[j]){rv++;};};};
}
if(rv>maxtab){loss=true;}else{loss=false;};
return loss;
}//=================================================================================

function eat()
{
var i=foodsize*2;
if(x[0]<=foodx+i & x[0]>=foodx-i & y[0]<=foody+i & y[0]>=foody-i){grow();return true} else{return false};
}//=================================================================================

function food()
{
if (eat()) {foodx=Math.round(w*Math.random());foody=Math.round(h*Math.random());};
}//=================================================================================

function drawfood()
{
d.beginPath();
d.arc(foodx,foody,foodsize,0,2*Math.PI,true);
d.fillStyle="#000";
d.fill();
d.closePath();
}//=================================================================================

function grow()
{
x.length+=1;
getElement('score').innerHTML=x.length-initlength;
}//=================================================================================

function animText(txt,dTextSizeChange,maxTextSize)
{
draw();
drawText(txt,w/2,h/2,textsize);
if(textsize+dTextSize<maxTextSize){textsize+=dTextSize;dTextSize*=dTextSizeChange;}
else{clearTimeout(time);};
}//=================================================================================

function drawText(text,x,y,textsize)
{
d.fillStyle=textColor;
d.font="bold "+textsize+"px Times New Roman,serif";
d.textAlign="center";
d.textBaseline="middle";
d.fillText(text,x,y);
}//=================================================================================

//--------------VAR-DECLARATION---------------//
var started=false;
var time;//used in setTimeout
var inittextsize=30;
var textsize=inittextsize;
var dTextSize;
var textColor;
var initlength=7;
var wait=100;
var initwait=wait;
var pause=false;
var cntrl=true;
var foodx;var foody;
var d;
var r=10;
var foodsize=r/2;
var dmove=1.5*r;
var h=dmove*30;
var w=dmove*40;
var dx=dmove;
var dy=0;

x=new Array();
y=new Array();
//--------------BEGIN--------------//
start();
//--------------END---------------//
