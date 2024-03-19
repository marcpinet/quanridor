document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Stop the form from submitting normally

    // Get the values from the form
    const username = form.querySelector('input[name="username"]').value;
    const password = form.querySelector('input[name="password"]').value;
    const baseUrl = window.location.origin;

    // Construct the JSON object to send
    const data = { username, password };

    // Use fetch to send the request
    fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Login failed with status " + response.status); // Throws an error if response is not ok
        }
        return response.json();
      })
      .then((data) => {
        console.log("Success:", data);
        if (data.token) {
          alert("Login successful!");
          localStorage.setItem("token", data.token); // Save token
          window.location.href = "home.html"; // Redirect
        } else {
          alert("Login failed, please check your credentials.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Login failed, please check your credentials."); // Affiche une alerte d'échec de connexion
      });
  });
});
