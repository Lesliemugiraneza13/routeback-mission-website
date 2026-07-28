/**
 * RouteBack, Our Team page: renders team cards and skills dashboard from RB_TEAM.
 */
(function () {
  // Purpose: Returns the active language for localized content on the about page.
  function L() { return rbCurrentLang(); }

  // Purpose: Renders the team member cards using the shared team data.
  function renderTeamGrid() {
    const grid = document.getElementById('team-grid');
    const lang = L();
    grid.innerHTML = RB_TEAM.map((m, i) => `
      <article class="card team-card">
        <div class="team-photo-frame">
          <img src="${m.photo}" alt="Portrait of ${m.name}" loading="lazy">
        </div>
        <div>
          <h3 style="margin-bottom:2px;">${m.name}</h3>
          <p class="card-eyebrow">${lang === 'fr' ? m.role.fr : m.role.en}</p>
          <p>${lang === 'fr' ? m.bio.fr : m.bio.en}</p>
          <h5 style="margin-bottom:var(--space-2);">${lang === 'fr' ? 'Responsabilités' : 'Responsibilities'}</h5>
          <ul style="padding-left:1.1em;">
            ${m.responsibilities.map((r) => `<li>${lang === 'fr' ? r.fr : r.en}</li>`).join('')}
          </ul>
          <div class="notice notice-info" style="margin-top:var(--space-3);">
            <svg class="notice-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 12l2 2 4-4M12 21s7-3.5 7-10V5l-7-3-7 3v6c0 6.5 7 10 7 10z" stroke="currentColor" stroke-width="1.6"/></svg>
            <span><strong>${lang === 'fr' ? 'Contribution principale : ' : 'Main contribution: '}</strong>${lang === 'fr' ? m.contribution.fr : m.contribution.en}</span>
          </div>
        </div>
      </article>
    `).join('');
  }

  // Purpose: Builds the skills dashboard showing each team member's capabilities.
  function renderSkillsDashboard() {
    const el = document.getElementById('skills-dashboard');
    const lang = L();
    el.innerHTML = RB_TEAM.map((m) => `
      <div class="card">
        <h5>${m.name.split(' ')[0]}</h5>
        <div class="stack" style="gap:var(--space-3);margin-top:var(--space-3);">
          ${m.skills.map((s) => `
            <div>
              <div class="flex justify-between" style="font-size:var(--fs-tiny);margin-bottom:4px;">
                <span>${lang === 'fr' ? s.label.fr : s.label.en}</span><span class="text-muted">${s.level}%</span>
              </div>
              <div class="skill-bar"><span style="width:${s.level}%;"></span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Purpose: Renders the team and skills sections together when the page loads.
  function render() {
    renderTeamGrid();
    renderSkillsDashboard();
  }

  document.addEventListener('rb:partialsready', () => {
    if (document.body.dataset.page !== 'about') return;
    render();
  }, { once: true });
  document.addEventListener('rb:langchange', () => {
    if (document.body.dataset.page !== 'about') return;
    render();
  });
})();

