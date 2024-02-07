document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector("form");
    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Stop the form from submitting normally

        // Get the values from the form
        const username = form.querySelector('input[name="username"]').value;
        const password = form.querySelector('input[name="password"]').value;

        // Construct the JSON object to send
        const data = { username, password };

        // Use fetch to send the request
        fetch('http://localhost:4200/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            alert('Login successful!');
            // Go to Home page (home.html)
            window.location.href = 'home.html';

            localStorage.setItem('token', data.token);
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred, please try again.');
        });
    });
});