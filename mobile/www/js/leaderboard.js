let username;

document.addEventListener("DOMContentLoaded", function () {
  const globalLeaderboardElement =
    document.getElementById("global-leaderboard");
  const friendsLeaderboardElement = document.getElementById(
    "friends-leaderboard",
  );

  async function retrieveLeaderboard() {
    try {
      const baseUrl = "https://quanridor.ps8.academy";
      const token = localStorage.getItem("token");
      fetch(`${baseUrl}/api/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        username = data.username;
      });
      const [globalResponse, friendsResponse] = await Promise.all([
        fetch(`${baseUrl}/api/leaderboard`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
        }),
        fetch(`${baseUrl}/api/leaderboard/friends`, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!globalResponse.ok || !friendsResponse.ok) {
        throw new Error("Failed to retrieve leaderboard");
      }

      const globalLeaderboard = await globalResponse.json();
      const friendsLeaderboard = await friendsResponse.json();

      // Clear existing leaderboards
      globalLeaderboardElement.innerHTML = "";
      friendsLeaderboardElement.innerHTML = "";

      // Render global leaderboard
      renderLeaderboard(
        globalLeaderboardElement,
        globalLeaderboard,
        "No users found 💨",
      );

      // Render friends leaderboard
      renderLeaderboard(
        friendsLeaderboardElement,
        friendsLeaderboard,
        "No friends found 💨",
      );
    } catch (error) {
      console.error("Error retrieving leaderboard:", error);
    }
  }

  function renderLeaderboard(leaderboardElement, leaderboard, emptyMessage) {
    if (!leaderboard.length || leaderboard.length === 0) {
      const noUsersElement = document.createElement("div");
      noUsersElement.className = "no-users";
      noUsersElement.textContent = emptyMessage;
      leaderboardElement.appendChild(noUsersElement);
      return;
    }

    leaderboard.forEach((user, index) => {
      const userItemElement = document.createElement("div");
      userItemElement.className = "leaderboard-item";
      
      let colorFill = "#ffffff";
      if (index === 0) {
        userItemElement.classList.add("gold"); // Or pour le rang 1
        colorFill = "#000000";
      } else if (index === 1) {
        userItemElement.classList.add("silver"); // Argent pour le rang 2
        colorFill = "#000000";
      } else if (index === 2) {
        userItemElement.classList.add("bronze"); // Bronze pour le rang 3
        colorFill = "#000000";
      }
    
      const rankElement = document.createElement("span");
      rankElement.className = "rank";
      rankElement.textContent = `${index + 1}. `;
      userItemElement.appendChild(rankElement);
    
      const usernameElement = document.createElement("span");
      usernameElement.className = "username";
      if (user.username == username) {
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("class", "user-icon");
        icon.setAttribute("width", "20px");
        icon.setAttribute("height", "20px");
        icon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Dribbble-Light-Preview" transform="translate(-140.000000, -2159.000000)" fill="${colorFill}">
                <g id="icons" transform="translate(56.000000, 160.000000)">
                  <path d="M100.562548,2016.99998 L87.4381713,2016.99998 C86.7317804,2016.99998 86.2101535,2016.30298 86.4765813,2015.66198 C87.7127655,2012.69798 90.6169306,2010.99998 93.9998492,2010.99998 C97.3837885,2010.99998 100.287954,2012.69798 101.524138,2015.66198 C101.790566,2016.30298 101.268939,2016.99998 100.562548,2016.99998 M89.9166645,2004.99998 C89.9166645,2002.79398 91.7489936,2000.99998 93.9998492,2000.99998 C96.2517256,2000.99998 98.0830339,2002.79398 98.0830339,2004.99998 C98.0830339,2007.20598 96.2517256,2008.99998 93.9998492,2008.99998 C91.7489936,2008.99998 89.9166645,2007.20598 89.9166645,2004.99998 M103.955674,2016.63598 C103.213556,2013.27698 100.892265,2010.79798 97.837022,2009.67298 C99.4560048,2008.39598 100.400241,2006.33098 100.053171,2004.06998 C99.6509769,2001.44698 97.4235996,1999.34798 94.7348224,1999.04198 C91.0232075,1998.61898 87.8750721,2001.44898 87.8750721,2004.99998 C87.8750721,2006.88998 88.7692896,2008.57398 90.1636971,2009.67298 C87.1074334,2010.79798 84.7871636,2013.27698 84.044024,2016.63598 C83.7745338,2017.85698 84.7789973,2018.99998 86.0539717,2018.99998 L101.945727,2018.99998 C103.221722,2018.99998 104.226185,2017.85698 103.955674,2016.63598" id="profile_round-[#1342]"></path>
                </g>
              </g>
            </g>
          </svg>
        `;
  
        const iconWrapper = document.createElement("span");
        iconWrapper.className = "icon-wrapper";
        iconWrapper.appendChild(icon);
        iconWrapper.style.padding = "5px";
        
        usernameElement.style.display = "flex";
        usernameElement.style.alignItems = "center";
        usernameElement.style.justifyContent = "center";
        usernameElement.appendChild(iconWrapper);
        usernameElement.innerHTML += ` <b>>${user.username}<</b>`;
      } else {
        usernameElement.textContent = user.username;
      }
      userItemElement.appendChild(usernameElement);
    
      const eloElement = document.createElement("span");
      eloElement.className = "elo";
      eloElement.textContent = ` : ${user.elo}`;
      userItemElement.appendChild(eloElement);
    
      leaderboardElement.appendChild(userItemElement);
    });
    const leaderboardItems = document.querySelectorAll('.leaderboard-item');
    leaderboardItems.forEach(item => {
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'center';
    });
  }

  retrieveLeaderboard();
});
