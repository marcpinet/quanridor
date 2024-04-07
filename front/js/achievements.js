async function fetchAchievements() {
    const token = localStorage.getItem('token');
  
    if (!token) {
      console.error('No token found');
      return;
    }
  
    try {
      const response = await fetch('http://localhost:4200/api/achievements', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.ok) {
        const achievements = await response.json();
        displayAchievements(achievements);
      } else {
        console.error('Failed to fetch achievements');
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  }
  
  // Function to display the achievements
  function displayAchievements(achievements) {
    const achievementContainers = document.querySelectorAll('.achievement-container');
  
    achievementContainers.forEach((container) => {
      const achievementId = container.querySelector('[id^="achievement"]')?.id;
      const unknownSVG = container.querySelector('#unknown');
  
      if (achievementId) {
        const achievementName = achievementId.replace('achievement', '').toLowerCase().replace(/\s+/g, '-');
  
        if (achievements.includes(achievementName)) {
          container.removeAttribute('id');
          container.style.pointerEvents = 'auto';
          unknownSVG.style.display = 'none';
        } else {
          container.setAttribute('id', 'to-achieve');
          container.style.pointerEvents = 'none';
          unknownSVG.style.display = 'block';
        }
      }
    });
  }
  
  // Call the fetchAchievements function when the page loads
  document.addEventListener('DOMContentLoaded', fetchAchievements);