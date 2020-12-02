$(function(){
    // toggle method to open and close the hamburger menu
    $('.hamburger div').on('click', function() {
        $('.list').slideToggle(500);
    });

});

// Get the update form
var form = document.getElementById("updateFrom");

// Get the button that opens the update form
var btn = document.getElementById("showUpdateForm");


// When the user clicks the button, open the form Update 
btn.onclick = function() {
  form.style.display = "block";
}

// When the user clicks anywhere outside of the delete and update form, close it
window.onclick = function(event) {
  if (event.target == form || event.target == formDel) {
    form.style.display = "none";
    formDel.style.display = "none";
  }
}

// Get the delete form
var formDel = document.getElementById("popupMessage");

// Get the button that opens the delete form
var btnDel = document.getElementById("btnDel");


// When the user clicks the button, open the form Delete 
btnDel.onclick = function() {
  formDel.style.display = "block";
}

// When the user clicks the button, close the form Delete
btnNo.onclick = function() {
    formDel.style.display = "none";
  }