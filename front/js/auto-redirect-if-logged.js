// If the user has an auth token, redirect to home

if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}
