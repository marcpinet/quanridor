# Quanridor

![quanridor](readme-assets/quanridor-title.png)

## 🌐 Hosting

You can access the project by visiting: [http://quanridor.ps8.academy/](http://quanridor.ps8.academy/)

## 📝 Description

Adaptation of a fully fonctionnable Quoridor game with only pure HTML CSS & Javascript (except for the backend, but still _very_ limited).

This version of the game includes a [fog of war](https://en.wikipedia.org/wiki/Fog_of_war) system, which means that you can only see the tiles that are in your line of sight. This adds a whole new layer of strategy to the game, as you can't see the other player's moves until you're close enough to them.

The whole solution will be a fully working version of the game where you can play online against your friends or against an AI with multiple levels of difficulty.

There's also a chat system, emote system, leaderboard, statistics, and much more.

## 📦 Features (W.I.P)

- Minimalistic and clean UI/UX design 🖥️
- Login / Register system with secure backend _except CORS (for now) which accepts every incoming requests since the frontend is not hosted anywhere_ 📝
- Token authentication system (JWT) 🍪
- In-progress game listing 📋
- Play locally with someone else 🎮
- Play against bots with different levels of difficulty 🤖
- Leaving a game? No problem, it's in our database, waiting for you to join back! 📂
- Multiplayer online games with friends or random people 🌐
- Social system (friends, chat, emotes, notifications, etc.) 📱
- Leaderboard with elo 🏆

## ⚙️ Local installation

### Requirements

- Node.js 18+
- Docker

### Setup

1. **Clone** the repository to your local machine.

   ```bash
   git clone https://github.com/PolytechNS/ps8-24-quanridor.git
   ```

2. _(Optional)_ **Install** the dependencies for development puroposes.

   ```bash
   npm install
   ```

3. **Build and run** the backend using Docker.

   ```bash
   docker compose up --build
   ```

4. Run the frontend by opening the [index.html](mobile/www/index.html) file in your browser.

5. **Play**!

> [!NOTE]  
> The only libraries required for the backend to work are `mongodb`, `nodemon`, `socket.io`, `jsonwebtoken` and `bcrypt`.
> There's also `husky` to enforce the use of `prettier` on every commit (and also for DevOps purposes)

## 💡 How to use

Create an account and play!

There is a mock account already created for you to test the game:

- **Username**: `admin`
- **Password**: `admin`

... 👀

### Showcase

Coming soon!

## 🐛 Known issues

- Nothing yet!

## ✍️ Authors

- Marc Pinet - _Initial work_ - [marcpinet](https://github.com/marcpinet)
- Arthur Rodriguez - _Initial work_ - [rodriguezarthur](https://github.com/rodriguezarthur)
- Marcus Aas Jensen - _Initial work_ - [marcusaasjensen](https://github.com/marcusaasjensen)
- Loris Drid - _Initial work_ - [lorisdrid](https://github.com/LorisDrid)
