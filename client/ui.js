function create_clicked() {
   let btn = document.getElementById("create-new-btn");
   console.log(btn.style.background);
   img = btn.firstElementChild
   img.src = ( img.src.includes("_w") ) ? "./img/create.svg" : "./img/create_w.svg";
}