# 🔴 Nokia Bounce - Classic Retro 2D Platformer

An authentic remake of the legendary **Nokia Bounce** red ball platformer game built using **HTML5 Canvas**, **CSS3**, **Vanilla JavaScript**, and **Node.js / Express**.

---

## 🚀 How to Run the Game

1. Open your terminal in the project directory (`bounce game/`).
2. Start the Node.js server:
   ```bash
   npm start
   # or
   node server.js
   ```
3. Open your favorite web browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🎮 Game Controls

| Action | Keyboard | Nokia Virtual Keypad | On-Screen Touch / Arcade |
| :--- | :--- | :--- | :--- |
| **Roll Left** | `←` Left Arrow / `A` | **Key 4** (`◀ ghi`) | `◀` Touch Button |
| **Roll Right** | `→` Right Arrow / `D` | **Key 6** (`mno ▶`) | `▶` Touch Button |
| **Jump / Bounce** | `↑` Up Arrow / `W` / `Space` | **Key 2** / **Key 5** | `▲ JUMP` Button |
| **Down / Dive / Crouch** | `↓` Down Arrow / `S` | **Key 8** (`tuv ▼`) | `▼ DIVE` Button |
| **Toggle Fullscreen** | `F` Key | - | `⛶ Fullscreen` Button |
| **Pause / Resume** | `P` / `Escape` | **Left Soft Key** (`MENU`) | - |
| **Restart Level** | `R` | **Right Soft Key** (`BACK`) | - |

> 💡 **Up Arrow & Down Arrow Details:**
> - **`↑` Up Arrow / Jump:** Responsive jump with jump buffering and coyote-time grace window. In water, it swims upward.
> - **`↓` Down Arrow / Dive:** In air, performs a fast downward ground pound / dive stomp to quickly land and crush cracked blocks; in water, dives deep to reach sunken rings; on ground, crouches to charge an extra-high bounce!

---

## 🌟 Key Features & Mechanics

1. **Authentic Nokia Handheld & Arcade Views**:
   - **Nokia Phone View**: Realistic dark polycarbonate phone casing with glass bezel, speaker grill, tactile D-Pad, and glowing 12-key numeric keypad.
   - **Arcade View**: Toggle with 1 click in the top header for a wide, high-resolution arcade screen.
   - **CRT / LCD Subpixel Filter**: Toggle the retro LCD scanline matrix on or off.

2. **Accurate Ball Physics & Squash & Stretch**:
   - Organic rubber deformation upon high impacts and spring launches.
   - 3D rolling seam and directional highlight matching rotation velocity.

3. **Size Morphing Pumps**:
   - **🟡 Yellow Pump (`▲`)**: Transforms ball into **Big Inflated Ball** — floats on water, breaks cracked stone blocks, and bounces extra high!
   - **🔵 Blue Pump (`▼`)**: Shrinks ball into **Tiny Ball** — squeezes through 1-tile maintenance ducts and avoids tight hazards.
   - **🟢 Green Pump (`●`)**: Resets ball back to **Standard Size**.

4. **Water Physics & Buoyancy**:
   - Big ball has strong positive buoyancy, floating to the surface with water ripples.
   - Small and normal balls sink and can swim upward with the jump key.

5. **5 Classic Progressive Levels**:
   - **Level 1 (Emerald Meadow)**: Introduction to rolling, jumping, and golden rings.
   - **Level 2 (Spike Canyon)**: Floor & ceiling spikes, spring pads, and chasms.
   - **Level 3 (Sunken Aqueduct)**: Water basins, float mechanics, and narrow tunnels.
   - **Level 4 (Machinery Bastion)**: Cracked walls requiring Big Ball smash, moving spikes.
   - **Level 5 (The Ultimate Gauntlet)**: The master challenge combining all mechanics!

6. **Web Audio Synthesizer & Soundtrack**:
   - Zero external audio files required! 100% self-contained Web Audio synthesis.
   - **🔥 DHOOM MACHALE (Default Song):** The iconic blockbuster high-energy Bollywood dance anthem with driving synth bass, punchy drums (kick, snare, hi-hats), and the famous chorus hook — just like the legendary Nokia composer ringtones!
   - **🎵 Classic Nokia Bounce Theme:** Switch between *Dhoom Machale* and the original retro chiptune melody anytime using the header music button.
   - Procedural sound effects: rubber bounce, spring boing, ring ding chime, water splashes, balloon pop bursts, and victory fanfares.

7. **Built-in Level Editor**:
   - Draw your own levels with the visual tile palette.
   - 1-click **"Test Level Now"** to play immediately inside the engine.
   - Save custom levels to the Node.js backend (`/api/custom-levels`) or copy shareable JSON codes.

8. **High Scores Leaderboard**:
   - REST API integration (`GET /api/scores`, `POST /api/scores`) persisting records to `data/scores.json`.

---

## 🤫 Secret Nokia Cheat Code

Just like on the classic Nokia phones, typing or dialing **`787898`** on your keyboard or the on-screen keypad triggers:
> **★ CHEAT ACTIVATED: 787898 ★**  
> **SUPER BALL**: Invincibility to spikes, infinite air jump/flight, and maximum speed!
> *(Dial `787898` again to deactivate)*
