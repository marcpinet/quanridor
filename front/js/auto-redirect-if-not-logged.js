// If the user tries to access a page while not logged in

if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}
