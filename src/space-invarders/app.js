const grid = document.querySelector('.grid')
const resultsDisplay = document.querySelector('.results')
const GAME_LEVEL = document.querySelector('#gameLevel')

let currentShooterIndex = 202
let width;
let direction = 1
let invadersId
let goingRight = true
let aliensRemoved = []
let results = 0
let squares = [];
let alienInvaders = [];
let gameLevel = 0;

function getGameLevel(){
  return gameLevel;
}

function setGameLevel(level){
  gameLevel = level;
}

function initGame(level){
  GAME_LEVEL.innerHTML="CURRENT LEVEL: "+level;
  gameLevel = level
  currentShooterIndex
  width = 14
  direction = 1
  invadersId
  goingRight = true
  aliensRemoved = []
  results = 0
  for (let i = 0; i < 225; i++) {
    const square = document.createElement('div')
    grid.appendChild(square)
  }
  squares = Array.from(document.querySelectorAll('.grid div'))
  alienInvaders = [
    0,1,2,3,4,5,6,7,8,9,
    14,15,16,17,18,19,20,21,22,23,
    28,29,30,31,32,33,34,35,36,37
  ]
  draw();
  squares[currentShooterIndex] && squares[currentShooterIndex].classList.add('shooter')
  invadersId = setInterval(moveInvaders, 600-gameLevel*50);  
  document.addEventListener("keydown", shoot)   
  document.body.addEventListener("click", shoot)     
}

function draw() {
  for (let i = 0; i < alienInvaders.length; i++) {
    if(!aliensRemoved.includes(i)) {
      if(!!squares[alienInvaders[i]]){
        squares[alienInvaders[i]].classList.add('invader')
      }
    }
  }
}


function remove() {
  for (let i = 0; i < alienInvaders.length; i++) {
    if(!!squares[alienInvaders[i]]){
      squares[alienInvaders[i]].classList.remove('invader')
    }
  }
}


function moveShooter(e) {
  squares[currentShooterIndex].classList.remove('shooter')
  switch(e.key) {
    case 'ArrowLeft':
      if (currentShooterIndex % width !== 0) currentShooterIndex -=1
      break
    case 'ArrowRight' :
      if (currentShooterIndex % width < width -1) currentShooterIndex +=1
      break
  }
  squares[currentShooterIndex].classList.add('shooter')
}


function moveInvaders() {
  const leftEdge = alienInvaders[0] % width === 0
  const rightEdge = alienInvaders[alienInvaders.length - 1] % width === width -1
  remove()

  if (rightEdge && goingRight) {
    for (let i = 0; i < alienInvaders.length; i++) {
      alienInvaders[i] += width +1
      direction = -1
      goingRight = false
    }
  }

  if(leftEdge && !goingRight) {
    for (let i = 0; i < alienInvaders.length; i++) {
      alienInvaders[i] += width -1
      direction = 1
      goingRight = true
    }
  }

  for (let i = 0; i < alienInvaders.length; i++) {
    alienInvaders[i] += direction
  }

  draw();

  if (squares[currentShooterIndex] && squares[currentShooterIndex].classList.contains('invader', 'shooter')) {
    resultsDisplay.innerHTML = 'GAME OVER'
    clearInterval(invadersId)
  }  

  let invadersDiv = squares.filter(s=>s.classList.value=="invader")
  let invadersIndex = invadersDiv.map(inv=>squares.indexOf(inv));
  if(!invadersIndex.length){    
    invadersIndex = [invadersIndex];
  }
  if(invadersIndex.filter(i=>i>195).length>0){
    resultsDisplay.innerHTML = 'GAME OVER';   
    clearInterval(invadersId);      
  } 

  for (let i = 0; i < alienInvaders.length; i++) {
    if(alienInvaders[i] > (squares.length)) {
      console.log("alienInvaders");
      resultsDisplay.innerHTML = 'GAME OVER'
      clearInterval(invadersId)
    }
  }
  if (aliensRemoved.length === alienInvaders.length) {
    resultsDisplay.innerHTML = 'YOU WIN'
    clearInterval(invadersId);
    initGame(++gameLevel);    
  }
}


function shoot(e) {
  let laserId
  let currentLaserIndex = currentShooterIndex <0 ? 202 :currentShooterIndex; 
  function moveLaser() {
    if(currentLaserIndex>=0&&squares[currentLaserIndex]){
      squares[currentLaserIndex].classList.remove('laser');
      currentLaserIndex -= width;

      if(!!squares[currentLaserIndex]){
          squares[currentLaserIndex].classList.add('laser');      
        if (squares[currentLaserIndex].classList.contains('invader')) {
          squares[currentLaserIndex].classList.remove('laser')
          squares[currentLaserIndex].classList.remove('invader')
          squares[currentLaserIndex].classList.add('boom')

          squares[currentLaserIndex].classList.remove('boom')
          clearInterval(laserId)

          const alienRemoved = alienInvaders.indexOf(currentLaserIndex)
          aliensRemoved.push(alienRemoved)
          results++
          resultsDisplay.innerHTML = results          
        }
      }
    }
  }
  
  if(e.key=='ArrowUp' || e.type=='click'){    
    laserId = setInterval(moveLaser, 300);
  }
  
}

export const game = {
    "getGameLevel":getGameLevel,
    "setGameLevel":setGameLevel,
    "initGame":initGame,
    "moveShooter":moveShooter
}