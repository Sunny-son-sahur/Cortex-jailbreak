/* Cortex Jailbreaks — one place for the things you might change.

   api: leave empty ('') and the forum and chat work per-browser only: posts save in
        the visitor's own browser. Set it to your Worker's URL (see worker/README.md)
        and they become shared between everyone. GitHub Pages alone cannot store
        posts, so an empty api means local-only, not broken.

   repo/branch: where the pack files live on GitHub. The "Updated" date under each
        model is read from the last commit that touched that file, so it stays right
        by itself. Keep this repo public or the lookup will fail.
*/
window.CORTEX = {
  name: 'Cortex Jailbreaks',
  discord: 'https://discord.gg/CKpvwSRbB',
  repo: 'Sunny-son-sahur/Cortex-jailbreak',
  branch: 'main',
  packsDir: 'packs',
  // Folder inside the repo that Pages serves. The "Updated" dates ask GitHub
  // about files at <repoDir>/packs/... — set this to '' if the site ever moves
  // to the repo root.
  repoDir: 'docs',
  api: 'https://site-b2934d4df68d43e79d57c5ff2c23572e.freebuff.page',
  poll: 6000
};
