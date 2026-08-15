let col_url = "https://coolors.co/22162b-451f55-724e91-e54f6d-f8c630";
let COLORS = [];

function setup() {
  createCanvas(windowWidth, 800);
  COLORS = extractColor(col_url);
  colorTiles();
}

function extractColor(url) {
  let lastslash = url.lastIndexOf("/"); //따옴표 속의 슬래쉬가 이 문장의 몇번째에서 나오는지
  let sliced = url.slice(lastslash + 1); // 특정 문자의 순번 앞을 잘라버리는
  let cols = sliced.split("-"); // - 기호를 기준(seperator)으로 자르고 그 값을 array로 리턴해줌.
  let newcols = []; //newcols라는 배열 생성
  for (let i = 0; i < cols.length; i++) {
    newcols.push("#" + cols[i]);
  }
  return newcols;
}

function colorTiles() {
  for (let x = 0; x < width; x += 200) {
    for (let y = 0; y < height; y += 200) {
      let randomIndex = floor(random(COLORS.length));
      let randomcolor = color(COLORS[randomIndex]);
      noStroke();
      fill(randomcolor);
      rect(x, y, 200);
      fill(complimentaryColor(randomcolor));
      ellipse(x + 100, y + 100, 200);
    }
  }
}

// 클릭할 때마다 색이 바뀌도록. 위의 사각+원 생성을 통째로 복사해서 마우스프레스드에 삽입
// 그리고 컬러타일을 그리는 구간을 함수로 만들어서 setup에서 실행.
// colorTiles 함수는 마우스클릭 할 때마다 실행하도록 아래 함수에 삽입.
function mousePressed() {
  colorTiles();
}

function draw() {}

//보색 complementray color를 추출하는 함수
function complimentaryColor(col) {
  let newRed = 255 - red(col);
  let newGreen = 255 - green(col);
  let newBlue = 255 - blue(col);
  return color(newRed, newGreen, newBlue);
}

//더블클릭하면 전체 화면으로 전환
window.addEventListener("dblclick", () => {
  const fullscreenElement =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (!fullscreenElement) {
    if (canvas.requestFullscreen) {
      canvas.requestFullscreen();
    } else if (canvas.webkitRequestFullscreen) {
      canvas.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
});
