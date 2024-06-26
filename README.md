# Quanridor

![quanridor](readme-assets/quanridor-title.png)

### Showcase

#### PC version (very fast, not showing every single details...)

https://github.com/marcpinet/quanridor/assets/52708150/8aa827ca-f739-4675-a9a9-6386ea3f930d

#### Mobile version (same, but you can see me playing online)

https://github.com/marcpinet/quanridor/assets/52708150/9ef180f8-7e02-4061-984a-86cdffe0278c

## 🌐 Hosting

You can access the project by visiting: [http://quanridor.ps8.academy/](http://quanridor.ps8.academy/)

_Unless I forgot to pay the bill, in which case you can still run the project locally by following the instructions below_

## 📝 Description

Quoridor game, available for both web and mobile platforms (with bots and online support) using only pure HTML CSS & Javascript. Made as part as a school project

This version of the game includes a [fog of war](https://en.wikipedia.org/wiki/Fog_of_war) system, which means that you can only see the tiles that are in your line of sight. This adds a whole new layer of strategy to the game, as you can't see the other player's moves until you're close enough to them.

The whole solution will be a fully working version of the game where you can play online against your friends or against an AI with multiple levels of difficulty.

There's also a chat system, emote system, leaderboard, statistics, and much more.

## 📦 Features (W.I.P)

- Minimalistic and clean UI/UX design 🖥️
- Login / Register system with secure backend 📝
- Token authentication system (JWT) 🍪
- In-progress game listing 📋
- Play locally with someone else 🎮
- Play against bots with different levels of difficulty 🤖
- Leaving a game? No problem, it's in our database, waiting for you to join back! 📂
- Multiplayer online games with friends or random people 🌐
- Social system (friends, chat, emotes, notifications, etc.) 📱
- Challenge your friends to a duel! 🤺
- Leaderboard with elo 🏆
- Compatibility with mobile devices 📱

## ⚙️ Local installation

### Requirements

- Node.js 18+
- Docker
- Cordova (only if you want to run the mobile version)

### Setup

#### For PC

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
   docker compose up -d
   ```

4. Run the frontend by going to [http://localhost:8000](http://localhost:8000) in your browser.

5. **Play**!

> [!NOTE]  
> The only libraries required for the backend to work are `mongodb`, `nodemon`, `socket.io`, `jsonwebtoken` and `bcrypt`.
> There's also `husky` to enforce the use of `prettier` on every commit (and also for DevOps purposes)

#### For mobile

1. Make sure you have Cordova correctly installed and configured (see [Cordova's documentation](https://cordova.apache.org/docs/en/11.x/guide/platforms/android/)).

2. Run `build-apk.py`

3. **Run** the app on your mobile device.

   ```bash
   cordova run android
   ```

4. **Play**!

## 💡 How to use

Create an account and play!

There is a mock account already created for you to test the game:

- **Username**: `admin`
- **Password**: `admin`

... 👀

## 🐛 Known issues

- Nothing yet!

## ✍️ Authors

- Marc Pinet - _Initial work_ - [marcpinet](https://github.com/marcpinet)
- Arthur Rodriguez - _Initial work_ - [rodriguezarthur](https://github.com/rodriguezarthur)
- Marcus Aas Jensen - _Initial work_ - [marcusaasjensen](https://github.com/marcusaasjensen)
- Loris Drid - _Initial work_ - [lorisdrid](https://github.com/LorisDrid)
