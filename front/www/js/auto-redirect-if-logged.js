// If the user has an auth token, redirect to home

if (localStorage.getItem("token")) {
  window.location.href = "home.html";
}

let successCallback = function(status) {
  console.log("Notification permission granted");
}
let errorCallback = function(status) {
  console.log("Notification permission denied");
}

document.addEventListener('deviceready', () => {
  var permissions = cordova.plugins.permissions;
  if(permissions.checkPermission(permissions.POST_NOTIFICATIONS, successCallback, errorCallback)) {
    console.log("PERMISSIONS GRANTED!");
  }
  else {
    console.warn("PERMISSIONS NOT GRANTED!");
    permissions.requestPermission(permissions.POST_NOTIFICATIONS, successCallback, errorCallback);
  }
}, false);