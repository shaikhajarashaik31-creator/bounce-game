/**
 * Nokia Bounce - Main Application Controller
 * Handles UI interactions, modals, server API requests, and editor integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Game & Level Editor
  const game = new BounceGame('game-canvas');
  const editor = new LevelEditor(game);

  // 2. Fullscreen Mode & Native Fullscreen API
  const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
  const fullscreenLabel = document.getElementById('fullscreen-label');

  function toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  }

  window.toggleFullscreenMode = toggleBrowserFullscreen;

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleBrowserFullscreen);
  }

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      if (fullscreenLabel) fullscreenLabel.textContent = 'Exit (F)';
      document.body.classList.add('mode-arcade');
      document.body.classList.remove('mode-phone');
      if (viewModeLabel) viewModeLabel.textContent = 'Phone View';
      isArcade = true;
    } else {
      if (fullscreenLabel) fullscreenLabel.textContent = 'Fullscreen';
    }
    setTimeout(() => game.updateViewportSize(), 100);
  });

  // 3. View Mode Toggle (Nokia Phone Shell vs Fullscreen Arcade)
  const btnToggleView = document.getElementById('btn-toggle-view');
  const viewModeLabel = document.getElementById('view-mode-label');
  let isArcade = true; // Default is Fullscreen Arcade

  btnToggleView.addEventListener('click', () => {
    isArcade = !isArcade;
    if (isArcade) {
      document.body.classList.remove('mode-phone');
      document.body.classList.add('mode-arcade');
      viewModeLabel.textContent = 'Phone View';
    } else {
      document.body.classList.remove('mode-arcade');
      document.body.classList.add('mode-phone');
      viewModeLabel.textContent = 'Fullscreen View';
    }
    game.updateViewportSize();
  });

  // 3. LCD Scanlines Toggle
  const btnToggleCRT = document.getElementById('btn-toggle-crt');
  const lcdOverlay = document.getElementById('lcd-overlay');
  const crtLabel = document.getElementById('crt-label');
  let crtActive = true;

  btnToggleCRT.addEventListener('click', () => {
    crtActive = !crtActive;
    if (crtActive) {
      lcdOverlay.classList.remove('disabled');
      crtLabel.textContent = 'LCD Filter: ON';
    } else {
      lcdOverlay.classList.add('disabled');
      crtLabel.textContent = 'LCD Filter: OFF';
    }
  });

  // 4. Sound & Music Toggle
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const soundIcon = document.getElementById('sound-icon');

  btnToggleSound.addEventListener('click', () => {
    if (window.soundEngine) {
      const isMuted = window.soundEngine.toggleMute();
      soundIcon.textContent = isMuted ? '🔇' : '🔊';
      btnToggleSound.style.opacity = isMuted ? '0.6' : '1';
    }
  });

  // 5. Music Track Switcher: DHOOM MACHALE vs Classic Bounce
  const btnToggleTrack = document.getElementById('btn-toggle-track');
  const musicTrackLabel = document.getElementById('music-track-label');

  if (btnToggleTrack) {
    btnToggleTrack.addEventListener('click', () => {
      if (window.soundEngine) {
        window.soundEngine.ensureContext();
        const current = window.soundEngine.toggleTrack();
        if (musicTrackLabel) {
          musicTrackLabel.textContent = current === 'dhoom'
            ? 'Song: DHOOM MACHALE 🔥'
            : 'Song: Classic Theme 🎵';
        }
      }
    });
  }

  // 5. Level Selector Dropdown
  const levelSelect = document.getElementById('level-select');
  levelSelect.addEventListener('change', (e) => {
    const idx = parseInt(e.target.value, 10);
    game.loadLevel(idx);
    game.state = 'PLAYING';
    game.hideAllOverlays();
    if (window.soundEngine) window.soundEngine.startBGM();
  });

  // 6. In-Game Overlay Buttons
  document.getElementById('btn-start-game').addEventListener('click', () => {
    game.startNewGame();
  });

  document.getElementById('btn-menu-help').addEventListener('click', () => {
    openModal('help-modal');
  });

  document.getElementById('btn-menu-scores').addEventListener('click', () => {
    openLeaderboard();
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    game.togglePause();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    game.restartCurrentLevel();
  });

  document.getElementById('btn-quit-menu').addEventListener('click', () => {
    game.loadLevel(0);
    game.state = 'MENU';
    game.hideAllOverlays();
    document.getElementById('menu-overlay').classList.remove('hidden');
    if (window.soundEngine) window.soundEngine.stopBGM();
  });

  document.getElementById('btn-next-level').addEventListener('click', () => {
    game.nextLevel();
    levelSelect.value = game.currentLevelIndex;
  });

  document.getElementById('btn-replay-level').addEventListener('click', () => {
    game.restartCurrentLevel();
  });

  document.getElementById('btn-try-again').addEventListener('click', () => {
    game.startNewGame();
  });

  document.getElementById('btn-go-menu').addEventListener('click', () => {
    game.loadLevel(0);
    game.state = 'MENU';
    game.hideAllOverlays();
    document.getElementById('menu-overlay').classList.remove('hidden');
  });

  document.getElementById('btn-vic-again').addEventListener('click', () => {
    game.startNewGame();
  });

  // 7. High Score Submission
  document.getElementById('btn-submit-score').addEventListener('click', async () => {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim() || 'BOUNCER';
    await submitScore(name, game.score, game.currentLevelIndex + 1);
  });

  document.getElementById('btn-vic-submit-score').addEventListener('click', async () => {
    const nameInput = document.getElementById('vic-name-input');
    const name = nameInput.value.trim() || 'CHAMPION';
    await submitScore(name, game.score, 5);
  });

  async function submitScore(name, score, level) {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, level })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Score submitted! You ranked #${data.rank} on the Leaderboard!`);
        openLeaderboard();
      } else {
        alert('Could not submit score: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving score');
    }
  }

  // 8. Modals Management
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  // Close buttons & Backdrop clicks
  ['scores-modal', 'help-modal', 'editor-modal'].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    const closeBtn = modal.querySelector('.btn-close');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(id));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(id);
    });
  });

  document.getElementById('btn-open-scores').addEventListener('click', openLeaderboard);
  document.getElementById('btn-open-help').addEventListener('click', () => openModal('help-modal'));
  document.getElementById('btn-open-editor').addEventListener('click', () => {
    openModal('editor-modal');
    editor.render();
  });

  async function openLeaderboard() {
    openModal('scores-modal');
    const tbody = document.getElementById('scores-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading scores...</td></tr>';

    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.success && data.scores.length > 0) {
        tbody.innerHTML = '';
        data.scores.forEach((s, idx) => {
          const row = document.createElement('tr');
          const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
          row.innerHTML = `
            <td>${medal}#${idx + 1}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td>LVL ${s.level}</td>
            <td>${String(s.score).padStart(6, '0')}</td>
            <td>${s.date || '2004-01-01'}</td>
          `;
          tbody.appendChild(row);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No high scores yet!</td></tr>';
      }
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff8787;">Failed to load leaderboard</td></tr>';
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // 9. Level Editor Toolbar & Actions
  const paletteBtns = document.querySelectorAll('.palette-btn');
  paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paletteBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editor.selectedTool = btn.dataset.tool;
    });
  });

  document.getElementById('btn-editor-test').addEventListener('click', () => {
    editor.testCurrentLevel();
  });

  document.getElementById('btn-editor-export').addEventListener('click', () => {
    const data = editor.exportLevelData();
    const jsonStr = JSON.stringify(data);
    navigator.clipboard.writeText(jsonStr).then(() => {
      alert('Level JSON copied to clipboard! You can paste and share it.');
    }).catch(() => {
      prompt('Copy your level JSON below:', jsonStr);
    });
  });

  document.getElementById('btn-editor-save-server').addEventListener('click', async () => {
    const title = prompt('Enter a name for your custom level:', 'My Bounce Challenge');
    if (!title) return;
    const author = prompt('Enter your creator name:', 'Bouncer');
    const levelData = editor.exportLevelData(title);

    try {
      const res = await fetch('/api/custom-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, levelData })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Level "${title}" saved to server successfully!`);
      } else {
        alert('Failed to save level: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving custom level');
    }
  });

  document.getElementById('btn-editor-clear').addEventListener('click', () => {
    if (confirm('Clear the entire level editor canvas?')) {
      editor.grid.fill(0);
      editor.rings = [];
      editor.pumps = [];
      editor.checkpoints = [];
      editor.extraLives = [];
      editor.initDefaultTemplate();
      editor.render();
    }
  });
});
